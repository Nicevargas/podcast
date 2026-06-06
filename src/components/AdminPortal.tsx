import React, { useState, useEffect } from "react";
import {
  Lock,
  User,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Video,
  Users,
  MessageSquare,
  LogOut,
  Database,
  Check,
  AlertCircle,
  X,
  PlusCircle,
  Clock,
  Link,
  MapPin,
  Search
} from "lucide-react";
import { db } from "../supabaseClient";
import { RecordingSession, PodcastEpisode, Reservation, FeedbackMessage, WaitingListEntry } from "../types";

interface AdminPortalProps {
  onClose: () => void;
  onDataChanged: () => void; // call this to refresh the main site stats/lists when edits occur
}

export default function AdminPortal({ onClose, onDataChanged }: AdminPortalProps) {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"agenda" | "videos" | "reservas" | "mensagens" | "espera">("agenda");
  const [reservasSubTab, setReservasSubTab] = useState<"pending" | "confirmed">("pending");
  const [searchGuest, setSearchGuest] = useState("");

  // DB Data States
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [feedback, setFeedback] = useState<FeedbackMessage[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [sessionForm, setSessionForm] = useState<Partial<RecordingSession>>({
    day: "",
    month: "Junho",
    year: "2026",
    title: "",
    timeStart: "",
    timeEnd: "",
    location: "",
    address: "",
    totalSpots: 3,
    spotsLeft: 3
  });
  const [episodeForm, setEpisodeForm] = useState<Partial<PodcastEpisode>>({
    title: "",
    description: "",
    duration: "30:00",
    audioUrl: "",
    publishDate: "",
    coverImage: "",
    guestName: "",
    guestRole: "",
    guestName2: "",
    guestRole2: "",
    guestName3: "",
    guestRole3: ""
  });

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Google Calendar states for administrator sync
  const [adminSyncingId, setAdminSyncingId] = useState<string | null>(null);
  const [adminSyncResult, setAdminSyncResult] = useState<Record<string, { success: boolean; msg: string }>>({});
  const [adminCustomClientId, setAdminCustomClientId] = useState("");
  const [showAdminClientId, setShowAdminClientId] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAdminGoogleSync = async (res: Reservation) => {
    setAdminSyncingId(res.id);
    setAdminSyncResult(prev => ({ ...prev, [res.id]: { success: false, msg: "" } }));

    const clientIdToUse = adminCustomClientId.trim() || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    if (!clientIdToUse) {
      setAdminSyncResult(prev => ({
        ...prev,
        [res.id]: {
          success: false,
          msg: "Google Client ID ausente. Por favor, preencha o Client ID de testes nas configurações de administrador abaixo."
        }
      }));
      setShowAdminClientId(true);
      setAdminSyncingId(null);
      return;
    }

    try {
      const { authenticateGoogleCalendar, createGoogleCalendarEvent, formatToISO } = await import("../googleCalendarHelper");
      
      const token = await authenticateGoogleCalendar(clientIdToUse, "curtatche@gmail.com");
      
      // Look up corresponding session from the loaded list to parse date correctly
      const session = sessions.find(s => s.id === res.sessionId);
      if (!session) {
        throw new Error("Sessão da agenda correspondente não encontrada para obter horários!");
      }

      const startIso = formatToISO(session.day, session.month, session.year, session.timeStart);
      const endIso = formatToISO(session.day, session.month, session.year, session.timeEnd);
      
      const attendeesMap = new Map<string, string>();
      
      // 1. Participant email
      if (res.email && res.email.trim()) {
        attendeesMap.set(res.email.trim().toLowerCase(), res.name || "Participante");
      }
      
      // 2. Curtatche (host) email
      attendeesMap.set("curtatche@gmail.com", "Café com Internet (Curtatche)");
      
      // 3. Guests
      if (res.guests && res.guests.length > 0) {
        res.guests.forEach(g => {
          if (g.email && g.email.trim() && g.name && g.name.trim()) {
            attendeesMap.set(g.email.trim().toLowerCase(), g.name.trim());
          }
        });
      }
      
      const attendees = Array.from(attendeesMap.entries()).map(([email, name]) => ({
        email,
        displayName: name
      }));
      
      const guestInfoText = res.guests && res.guests.length > 0 
        ? res.guests.map((g, i) => `   Convidado ${i + 1}: ${g.name} (${g.email})`).join("\n")
        : "   Nenhum convidado adicional adicionado.";

      const description = `☕️ Gravação do Podcast Café com Internet com Eunice Vargas\n\n` +
        `📍 Local da Gravação: ${session.location}\n` +
        `🏠 Endereço detalhado: ${session.address}\n` +
        `⏰ Horário agendado: ${session.timeStart} – ${session.timeEnd}\n\n` +
        `👤 Participante principal:\n` +
        `   Nome: ${res.name}\n` +
        `   E-mail: ${res.email}\n` +
        `   Telefone: ${res.phone}\n` +
        `   Instagram: ${res.instagram ? res.instagram : "Não informado"}\n\n` +
        `💡 Ideia de Pauta / Temas sugeridos:\n` +
        `   "${res.topic}"\n\n` +
        `👥 Convidados Adicionais para Compartilhar (Até 3):\n${guestInfoText}\n\n` +
        `Este convite foi gerado automaticamente pelo site do Café com Internet via portal administrativo.`;

      const eventPayload = {
        summary: `Gravação Café com Internet: ${res.name}`,
        location: `${session.location} - ${session.address}`,
        description: description,
        status: "confirmed" as const,
        start: {
          dateTime: startIso,
          timeZone: "America/Sao_Paulo"
        },
        end: {
          dateTime: endIso,
          timeZone: "America/Sao_Paulo"
        },
        attendees: attendees
      };

      await createGoogleCalendarEvent(token, eventPayload);
      
      // Update the reservation status inside database
      await db.reservations.update(res.id, { status: "confirmed" });

      // Automatically trigger confirmation email
      try {
        await fetch("/api/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId: res.id, reservation: { ...res, status: "confirmed" } })
        });
      } catch (mailErr) {
        console.error("Falha ao disparar envio do email de confirmacao:", mailErr);
      }

      setAdminSyncResult(prev => ({
        ...prev,
        [res.id]: { success: true, msg: "Confirmado, integrado com Google Agenda e e-mail de confirmação enviado!" }
      }));
      
      // Reload up-to-date lists
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      setAdminSyncResult(prev => ({
        ...prev,
        [res.id]: { success: false, msg: err?.message || "Erro desconhecido ao sincronizar com Google Agenda." }
      }));
    } finally {
      setAdminSyncingId(null);
    }
  };

  const handleConfirmOnly = async (res: Reservation) => {
    try {
      await db.reservations.update(res.id, { status: "confirmed" });

      // Automatically trigger confirmation email
      try {
        await fetch("/api/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId: res.id, reservation: { ...res, status: "confirmed" } })
        });
      } catch (mailErr) {
        console.error("Falha ao disparar envio do email de confirmacao:", mailErr);
      }

      setAdminSyncResult(prev => ({
        ...prev,
        [res.id]: { success: true, msg: "Agendamento confirmado e e-mail de confirmação enviado!" }
      }));
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      setAdminSyncResult(prev => ({
        ...prev,
        [res.id]: { success: false, msg: err?.message || "Erro ao confirmar agendamento." }
      }));
    }
  };

  // Check auth user state on mount
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const u = await db.auth.getUser();
      setUser(u);
      if (u) {
        loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const sList = await db.sessions.list();
      const eList = await db.episodes.list();
      const rList = await db.reservations.list();
      const fList = await db.feedback.list();
      const wList = await db.waitingList.list();
      
      setSessions(sList);
      setEpisodes(eList);
      setReservations(rList);
      setFeedback(fList);
      setWaitingList(wList);
    } catch (err: any) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auth actions
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    try {
      if (authMode === "login") {
        const u = await db.auth.signIn(email, password);
        setUser(u);
        setAuthSuccess("Acesso autorizado!");
        loadAllData();
      } else {
        const u = await db.auth.signUp(email, password);
        setUser(u);
        setAuthSuccess("Conta criada com sucesso e conectada!");
        loadAllData();
      }
    } catch (err: any) {
      setAuthError(err.message || "Erro ao processar autenticação");
    }
  };

  const handleLogout = async () => {
    await db.auth.signOut();
    setUser(null);
    onDataChanged();
  };

  // --- CRUD ACTIONS ---

  // Session Actions (Agenda)
  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    try {
      if (editingSessionId) {
        await db.sessions.update(editingSessionId, {
          ...sessionForm,
          spotsLeft: Number(sessionForm.spotsLeft ?? 3),
          totalSpots: Number(sessionForm.totalSpots ?? 3)
        });
        setActionSuccess("Sessão da agenda atualizada com sucesso!");
      } else {
        await db.sessions.create({
          day: sessionForm.day || "01",
          month: sessionForm.month || "Junho",
          year: sessionForm.year || "2026",
          title: sessionForm.title || "Teia Centro Histórico",
          timeStart: sessionForm.timeStart || "14:00",
          timeEnd: sessionForm.timeEnd || "15:00",
          location: sessionForm.location || sessionForm.title || "Teia Centro Histórico",
          address: sessionForm.address || "Rua Líbero Badaró, 425 · São Paulo, SP",
          spotsLeft: Number(sessionForm.totalSpots || 3),
          totalSpots: Number(sessionForm.totalSpots || 3)
        });
        setActionSuccess("Nova gravação adicionada à agenda externa!");
      }
      
      // Reset form
      setSessionForm({
        day: "",
        month: "Junho",
        year: "2026",
        title: "",
        timeStart: "",
        timeEnd: "",
        location: "",
        address: "",
        totalSpots: 3,
        spotsLeft: 3
      });
      setEditingSessionId(null);
      await loadAllData();
      onDataChanged();
    } catch (err: any) {
      setActionError(err.message || "Erro ao gravar sessão");
    }
  };

  const startEditSession = (session: RecordingSession) => {
    setEditingSessionId(session.id);
    setSessionForm(session);
    // Scroll form to view
    document.getElementById("session-form-heading")?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Você tem certeza de que deseja deletar este agendamento disponível? Isso removerá a data para novos convidados.")) {
      return;
    }
    try {
      await db.sessions.delete(id);
      setActionSuccess("Sessão removida!");
      await loadAllData();
      onDataChanged();
    } catch (err: any) {
      setActionError(err.message || "Erro ao deletar sessão");
    }
  };

  // Episode Actions (Vídeos e Áudios)
  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    try {
      if (editingEpisodeId) {
        await db.episodes.update(editingEpisodeId, episodeForm);
        setActionSuccess("Vídeo/Episódio modificado com sucesso!");
      } else {
        await db.episodes.create({
          title: episodeForm.title || "Sem título",
          description: episodeForm.description || "",
          duration: episodeForm.duration || "25:00",
          audioUrl: episodeForm.audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          publishDate: episodeForm.publishDate || "Hoje",
          coverImage: episodeForm.coverImage || "https://agencia.curtatche.com.br/podcast_episodio2.jpeg",
          guestName: episodeForm.guestName || undefined,
          guestRole: episodeForm.guestRole || undefined,
          guestName2: episodeForm.guestName2 || undefined,
          guestRole2: episodeForm.guestRole2 || undefined,
          guestName3: episodeForm.guestName3 || undefined,
          guestRole3: episodeForm.guestRole3 || undefined
        });
        setActionSuccess("Novo episódio/vídeo cadastrado com link externo!");
      }

      setEpisodeForm({
        title: "",
        description: "",
        duration: "30:00",
        audioUrl: "",
        publishDate: "",
        coverImage: "",
        guestName: "",
        guestRole: "",
        guestName2: "",
        guestRole2: "",
        guestName3: "",
        guestRole3: ""
      });
      setEditingEpisodeId(null);
      await loadAllData();
      onDataChanged();
    } catch (err: any) {
      setActionError(err.message || "Erro ao salvar episódio");
    }
  };

  const startEditEpisode = (ep: PodcastEpisode) => {
    setEditingEpisodeId(ep.id);
    setEpisodeForm(ep);
    document.getElementById("episode-form-heading")?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!window.confirm("Confirmar exclusão deste episódio/vídeo do feed?")) return;
    try {
      await db.episodes.delete(id);
      setActionSuccess("Episódio removido!");
      await loadAllData();
      onDataChanged();
    } catch (err: any) {
      setActionError(err.message || "Erro ao deletar episódio");
    }
  };

  // Reservation Actions
  const handleDeleteReservation = async (id: string) => {
    if (!window.confirm("Deseja CANCELAR este agendamento feito por um usuário?")) return;
    try {
      await db.reservations.delete(id);
      setActionSuccess("Agendamento excluído da lista!");
      await loadAllData();
      onDataChanged();
    } catch (err: any) {
      setActionError(err.message || "Erro ao cancelar reserva");
    }
  };

  // Feedback Actions
  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Deletar esta mensagem?")) return;
    try {
      await db.feedback.delete(id);
      setActionSuccess("Mensagem deletada!");
      await loadAllData();
    } catch (err: any) {
      setActionError(err.message || "Erro ao excluir mensagem");
    }
  };

  // Waiting List Actions
  const handleDeleteWaitingList = async (id: string) => {
    if (!window.confirm("Remover este convidado da lista de espera?")) return;
    try {
      await db.waitingList.delete(id);
      setActionSuccess("Convidado removido da lista de espera!");
      await loadAllData();
    } catch (err: any) {
      setActionError(err.message || "Erro ao excluir convidado da lista de espera");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0e0d]/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="relative w-full max-w-5xl h-full max-h-[92vh] md:max-h-[88vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-neutral-100" id="admin-panel-container">
        {/* Header decoration bar */}
        <div className="h-2 bg-gradient-to-r from-primary via-surface-tint to-primary-container" />

        {/* Header title */}
        <div className="flex items-center justify-between p-6 md:px-8 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-sans font-extrabold text-lg text-on-surface tracking-tight">
                Painel do Administrador
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Close admin portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- NOT LOGGED IN VIEW --- */}
        {!user ? (
          <div className="p-8 md:p-12 flex flex-col items-center justify-center max-w-md mx-auto text-center flex-1 overflow-y-auto">
            <span className="text-4xl">☕️</span>
            <h3 className="font-sans font-black text-2xl text-on-surface mt-4 tracking-tight">
              Acesso Restrito
            </h3>
            <p className="text-secondary text-xs mt-2 md:px-8">
              Autentique-se para gerenciar datas da agenda, cadastrar novos episódios em vídeo e feedbacks de ouvintes.
            </p>

            <form onSubmit={handleAuth} className="w-full mt-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5">
                  E-mail institucional
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cafe.com"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 pl-11 pr-4 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all text-neutral-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-widest mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 pl-11 pr-4 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all text-neutral-800"
                  />
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-start gap-2 border border-red-100 font-semibold leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2 border border-emerald-100 font-semibold">
                  <Check className="w-4 h-4" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-container text-white py-3.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Lock className="w-4 h-4" />
                {authMode === "login" ? "Entrar como Administrador" : "Cadastrar novo Administrador"}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setAuthError("");
                  }}
                  className="text-primary hover:underline text-[11px] font-bold cursor-pointer"
                >
                  {authMode === "login"
                    ? "Novo aqui? Criar conta de administrador"
                    : "Já possui cadastro? Entrar no sistema"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* --- LOGGED IN ADMIN PORTAL --- */
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
            {/* Sidebar navigation */}
            <div className="bg-neutral-50 p-6 lg:w-64 border-r border-neutral-100 flex flex-col justify-between shrink-0 lg:overflow-y-auto">
              <div className="space-y-1.5">
                <div className="px-3 pb-4 mb-4 border-b border-neutral-200">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                    Sessão Ativa
                  </p>
                  <p className="text-xs font-black text-on-surface truncate mt-1">
                    {user.email}
                  </p>
                </div>

                <button
                  onClick={() => { setActiveTab("agenda"); setActionSuccess(""); setActionError(""); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab === "agenda"
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-neutral-600 hover:bg-neutral-200/50"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Gerenciar Agenda
                </button>

                <button
                  onClick={() => { setActiveTab("videos"); setActionSuccess(""); setActionError(""); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeTab === "videos"
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-neutral-600 hover:bg-neutral-200/50"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Vídeos Editados (Feed)
                </button>

                <button
                  onClick={() => { setActiveTab("reservas"); setActionSuccess(""); setActionError(""); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer relative ${
                    activeTab === "reservas"
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-neutral-600 hover:bg-neutral-200/50"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Agendamentos Feitos
                  {reservations.length > 0 && (
                    <span className="absolute right-3.5 top-3 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-rose-500 text-white rounded-full">
                      {reservations.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab("mensagens"); setActionSuccess(""); setActionError(""); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer relative ${
                    activeTab === "mensagens"
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-neutral-600 hover:bg-neutral-200/50"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Dúvidas & Feedback
                  {feedback.length > 0 && (
                    <span className="absolute right-3.5 top-3 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-[#cd6a5a] text-white rounded-full">
                      {feedback.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab("espera"); setActionSuccess(""); setActionError(""); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer relative ${
                    activeTab === "espera"
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-neutral-600 hover:bg-neutral-200/50"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Lista de Espera
                  {waitingList.length > 0 && (
                    <span className="absolute right-3.5 top-3 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full">
                      {waitingList.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Painel
                </button>
              </div>
            </div>

            {/* Admin Workspace */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto min-h-0">
              
              {/* Alert Feedback Messages */}
              {actionSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <Check className="w-5 h-5 text-emerald-500" />
                    <span>{actionSuccess}</span>
                  </div>
                  <button onClick={() => setActionSuccess("")} className="text-emerald-400 hover:text-emerald-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {actionError && (
                <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span>{actionError}</span>
                  </div>
                  <button onClick={() => setActionError("")} className="text-red-400 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-secondary mt-3">Carregando dados da nuvem...</p>
                </div>
              ) : (
                <>
                  {/* --- TAB 1: AGENDA --- */}
                  {activeTab === "agenda" && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="font-sans font-black text-xl text-on-surface tracking-tight" id="session-form-heading">
                          {editingSessionId ? "✏️ Editar Sessão de Gravação" : "📅 Criar Horário de Gravação"}
                        </h3>
                        <p className="text-neutral-500 text-xs mt-1">
                          Adicione ou edite datas e horários nos coworking parceiros para os ouvintes se inscreverem.
                        </p>
                      </div>

                      <form onSubmit={handleSessionSubmit} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Dia</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: 15"
                              value={sessionForm.day}
                              onChange={(e) => setSessionForm({...sessionForm, day: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Mês</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Junho"
                              value={sessionForm.month}
                              onChange={(e) => setSessionForm({...sessionForm, month: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Ano</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: 2026"
                              value={sessionForm.year}
                              onChange={(e) => setSessionForm({...sessionForm, year: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Capacidade (Sagas)</label>
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="3"
                              value={sessionForm.totalSpots}
                              onChange={(e) => setSessionForm({...sessionForm, totalSpots: Number(e.target.value), spotsLeft: Number(e.target.value)})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Nome do Local</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Teia Centro Histórico"
                              value={sessionForm.title}
                              onChange={(e) => setSessionForm({...sessionForm, title: e.target.value, location: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Hora Início</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: 09:00"
                              value={sessionForm.timeStart}
                              onChange={(e) => setSessionForm({...sessionForm, timeStart: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Hora Fim</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: 11:30"
                              value={sessionForm.timeEnd}
                              onChange={(e) => setSessionForm({...sessionForm, timeEnd: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Endereço Completo</label>
                          <input
                            type="text"
                            required
                            placeholder="ex: Rua Líbero Badaró, 425 · São Paulo, SP"
                            value={sessionForm.address}
                            onChange={(e) => setSessionForm({...sessionForm, address: e.target.value})}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          {editingSessionId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSessionId(null);
                                setSessionForm({
                                  day: "",
                                  month: "Junho",
                                  year: "2026",
                                  title: "",
                                  timeStart: "",
                                  timeEnd: "",
                                  location: "",
                                  address: "",
                                  totalSpots: 3,
                                  spotsLeft: 3
                                });
                              }}
                              className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            className="bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            {editingSessionId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {editingSessionId ? "Salvar Alterações" : "Adicionar na Agenda"}
                          </button>
                        </div>
                      </form>

                      {/* Sessions List */}
                      <div>
                        <h4 className="font-sans font-extrabold text-sm text-neutral-700 mb-3">Gravações Existentes ({sessions.length})</h4>
                        <div className="border border-neutral-100 rounded-2xl overflow-hidden divide-y divide-neutral-100">
                          {sessions.length === 0 ? (
                            <div className="p-8 text-center text-neutral-400 text-xs">Nenhum horário disponível criado. Cadastre acima!</div>
                          ) : (
                            sessions.map((sess) => (
                              <div key={sess.id} className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-primary-container text-white font-mono text-xs font-bold px-2 py-0.5 rounded-md">
                                      {sess.day} de {sess.month} ({sess.year})
                                    </span>
                                    <span className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                      {sess.timeStart} - {sess.timeEnd}
                                    </span>
                                  </div>
                                  <h5 className="font-sans font-bold text-sm text-on-surface">{sess.title}</h5>
                                  <p className="text-secondary text-xs flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                                    {sess.address}
                                  </p>
                                  <p className="text-[10px] font-bold text-emerald-600">
                                    Vagas disponíveis: {sess.spotsLeft} de {sess.totalSpots}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 self-end md:self-center">
                                  <button
                                    onClick={() => startEditSession(sess)}
                                    className="p-2 text-neutral-500 hover:text-primary hover:bg-neutral-50 rounded-lg cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(sess.id)}
                                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Remover"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 2: VIDEOS / EPISODES --- */}
                  {activeTab === "videos" && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="font-sans font-black text-xl text-on-surface tracking-tight" id="episode-form-heading">
                          {editingEpisodeId ? "✏️ Editar Vídeo/Episódio do Feed" : "🎙️ Cadastrar Vídeo / Episódio"}
                        </h3>
                        <p className="text-neutral-500 text-xs mt-1">
                          Publique novos episódios integrando os links de áudio ou vídeo. Eles atualizarão os players no site instantaneamente.
                        </p>
                      </div>

                      <form onSubmit={handleEpisodeSubmit} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Título do Episódio</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: Como crescer seu negócio online"
                              value={episodeForm.title}
                              onChange={(e) => setEpisodeForm({...episodeForm, title: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Data de Publicação</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: 29 de Maio, 2026"
                              value={episodeForm.publishDate}
                              onChange={(e) => setEpisodeForm({...episodeForm, publishDate: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Descrição Curta / Tópicos</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Descreva sobre o que foi gravado neste podcast..."
                            value={episodeForm.description}
                            onChange={(e) => setEpisodeForm({...episodeForm, description: e.target.value})}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="w-full md:w-1/3">
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Duração (MM:SS)</label>
                            <input
                              type="text"
                              required
                              placeholder="ex: 45:12"
                              value={episodeForm.duration}
                              onChange={(e) => setEpisodeForm({...episodeForm, duration: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>

                          <div className="border border-neutral-200 p-4 rounded-2xl bg-white space-y-4">
                            <p className="font-semibold text-xs text-neutral-700">👥 Convidados Participantes (Até 3)</p>
                            
                            {/* Convidado 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-neutral-100">
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Convidado 1: Nome Completo</label>
                                <input
                                  type="text"
                                  placeholder="ex: Marcos Silva"
                                  value={episodeForm.guestName || ""}
                                  onChange={(e) => setEpisodeForm({...episodeForm, guestName: e.target.value})}
                                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Convidado 1: Cargo/Profissão</label>
                                <input
                                  type="text"
                                  placeholder="ex: Designer de Produto"
                                  value={episodeForm.guestRole || ""}
                                  onChange={(e) => setEpisodeForm({...episodeForm, guestRole: e.target.value})}
                                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                                />
                              </div>
                            </div>

                            {/* Convidado 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-neutral-100">
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Convidado 2: Nome Completo</label>
                                <input
                                  type="text"
                                  placeholder="ex: Carol Azevedo"
                                  value={episodeForm.guestName2 || ""}
                                  onChange={(e) => setEpisodeForm({...episodeForm, guestName2: e.target.value})}
                                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Convidado 2: Cargo/Profissão</label>
                                <input
                                  type="text"
                                  placeholder="ex: Diretora de Operações"
                                  value={episodeForm.guestRole2 || ""}
                                  onChange={(e) => setEpisodeForm({...episodeForm, guestRole2: e.target.value})}
                                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                                />
                              </div>
                            </div>

                            {/* Convidado 3 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Convidado 3: Nome Completo</label>
                                <input
                                  type="text"
                                  placeholder="ex: Dr. Fábio Reis"
                                  value={episodeForm.guestName3 || ""}
                                  onChange={(e) => setEpisodeForm({...episodeForm, guestName3: e.target.value})}
                                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Convidado 3: Cargo/Profissão</label>
                                <input
                                  type="text"
                                  placeholder="ex: Psicólogo & Empreendedor"
                                  value={episodeForm.guestRole3 || ""}
                                  onChange={(e) => setEpisodeForm({...episodeForm, guestRole3: e.target.value})}
                                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                                />
                              </div>
                            </div>

                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Link className="w-3 h-3 text-neutral-400" /> Link do Áudio / Mp3 (Streaming/Helix)
                            </label>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={episodeForm.audioUrl}
                              onChange={(e) => setEpisodeForm({...episodeForm, audioUrl: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Link className="w-3 h-3 text-neutral-400" /> Link da Capa do Vídeo / Imagem
                            </label>
                            <input
                              type="url"
                              placeholder="https://agencia.curtatche.com.br/..."
                              value={episodeForm.coverImage}
                              onChange={(e) => setEpisodeForm({...episodeForm, coverImage: e.target.value})}
                              className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 text-neutral-800 outline-hidden"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          {editingEpisodeId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEpisodeId(null);
                                setEpisodeForm({
                                  title: "",
                                  description: "",
                                  duration: "30:00",
                                  audioUrl: "",
                                  publishDate: "",
                                  coverImage: "",
                                  guestName: "",
                                  guestRole: "",
                                  guestName2: "",
                                  guestRole2: "",
                                  guestName3: "",
                                  guestRole3: ""
                                });
                              }}
                              className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            className="bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            {editingEpisodeId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {editingEpisodeId ? "Salvar Alterações" : "Cadastrar Episódio"}
                          </button>
                        </div>
                      </form>

                      {/* Episodes List */}
                      <div>
                        <h4 className="font-sans font-extrabold text-sm text-neutral-700 mb-3">Episódios & Vídeos Cadastrados ({episodes.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {episodes.length === 0 ? (
                            <div className="col-span-2 p-8 text-center text-neutral-400 text-xs bg-white border border-neutral-100 rounded-2xl">Nenhum episódio cadastrado.</div>
                          ) : (
                            episodes.map((ep) => (
                              <div key={ep.id} className="p-4 bg-white border border-neutral-100 rounded-2xl flex gap-3 h-full justify-between flex-col">
                                <div className="flex gap-3">
                                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-950 flex items-center justify-center relative">
                                    <img src={ep.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-xs opacity-30 select-none pointer-events-none" />
                                    <img src={ep.coverImage} alt={ep.title} className="relative z-1 max-w-full max-h-full object-contain" />
                                  </div>
                                  <div className="space-y-0.5 select-none min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-neutral-400">{ep.publishDate} · {ep.duration}</p>
                                    <h5 className="font-sans font-bold text-xs text-on-surface truncate" title={ep.title}>{ep.title}</h5>
                                    {ep.guestName && (
                                      <div className="text-[10px] text-primary space-y-0.5 mt-1">
                                        <p className="uppercase text-[8px] font-black tracking-wider text-neutral-400 mb-0.5">Convidados:</p>
                                        {[
                                          { name: ep.guestName, role: ep.guestRole },
                                          { name: ep.guestName2, role: ep.guestRole2 },
                                          { name: ep.guestName3, role: ep.guestRole3 }
                                        ]
                                          .filter(g => g.name && g.name.trim() !== "")
                                          .map((g, idx) => (
                                            <p key={idx} className="truncate leading-tight">
                                              • <strong>{g.name}</strong> {g.role ? `(${g.role})` : ""}
                                            </p>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 mt-2">
                                  <span className="font-mono text-[9px] text-neutral-400 select-all truncate max-w-[120px]" title={ep.audioUrl}>
                                    {ep.audioUrl}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => startEditEpisode(ep)}
                                      className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-50 rounded-lg cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEpisode(ep.id)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 3: RESERVAS --- */}
                  {activeTab === "reservas" && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="font-sans font-black text-xl text-on-surface tracking-tight">
                            👥 Listagem de Agendamentos Feitos
                          </h3>
                          <p className="text-neutral-500 text-xs mt-1">
                            Veja abaixo os ouvintes que se agendaram para gravar um episódio do programa com você.
                          </p>
                        </div>
                        
                        {/* Sub-tab selection & Search input */}
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between w-full">
                          <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-neutral-200/50">
                            <button
                              type="button"
                              onClick={() => setReservasSubTab("pending")}
                              className={`px-3 py-1.5 rounded-lg text-2xs font-extrabold transition-all cursor-pointer ${
                                reservasSubTab === "pending"
                                  ? "bg-white text-primary shadow-xs"
                                  : "text-neutral-500 hover:text-neutral-800"
                              }`}
                            >
                              Pendentes ({reservations.filter(r => r.status !== "confirmed").length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setReservasSubTab("confirmed")}
                              className={`px-3 py-1.5 rounded-lg text-2xs font-extrabold transition-all cursor-pointer ${
                                reservasSubTab === "confirmed"
                                  ? "bg-white text-primary shadow-xs"
                                  : "text-neutral-500 hover:text-neutral-800"
                              }`}
                            >
                              Confirmados ({reservations.filter(r => r.status === "confirmed" || r.status === "checked_in").length})
                            </button>
                          </div>

                          <div className="relative flex-1 max-w-sm">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                              <Search className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              placeholder="Buscar por convidado ou e-mail..."
                              value={searchGuest}
                              onChange={(e) => setSearchGuest(e.target.value)}
                              className="w-full pl-8.5 pr-8 py-1.5 bg-neutral-50 text-xs border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-white placeholder-neutral-400 font-sans"
                            />
                            {searchGuest && (
                              <button
                                type="button"
                                onClick={() => setSearchGuest("")}
                                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(() => {
                          const normalizedSearch = searchGuest.toLowerCase().trim();
                          const filteredRes = reservations
                            .filter(r => 
                              reservasSubTab === "confirmed" 
                                ? (r.status === "confirmed" || r.status === "checked_in")
                                : (r.status !== "confirmed" && r.status !== "checked_in")
                            )
                            .filter(r => {
                              if (!normalizedSearch) return true;
                              const mainNameMatch = (r.name || "").toLowerCase().includes(normalizedSearch);
                              const emailMatch = (r.email || "").toLowerCase().includes(normalizedSearch);
                              const topicMatch = (r.topic || "").toLowerCase().includes(normalizedSearch);
                              const guestMatch = r.guests?.some(g => 
                                (g.name || "").toLowerCase().includes(normalizedSearch) ||
                                (g.email || "").toLowerCase().includes(normalizedSearch)
                              );
                              return mainNameMatch || emailMatch || topicMatch || guestMatch;
                            })
                            .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt", { sensitivity: "base" }));

                          if (filteredRes.length === 0) {
                            return (
                              <div className="p-12 text-center text-neutral-400 text-xs bg-neutral-50 border border-neutral-100 rounded-3xl font-sans">
                                {searchGuest ? (
                                  <span>Nenhum participante encontrado para "<strong>{searchGuest}</strong>".</span>
                                ) : reservasSubTab === "confirmed" ? (
                                  "Nenhum agendamento foi confirmado ou sincronizado com o Google Agenda ainda."
                                ) : (
                                  "Nenhum participante com agendamento pendente de aprovação!"
                                )}
                              </div>
                            );
                          }

                          return filteredRes.map((res) => (
                            <div key={res.id} className="p-5 bg-white border border-neutral-100 rounded-2xl relative shadow-xs">
                              <button
                                onClick={() => handleDeleteReservation(res.id)}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancelar Agendamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <div className="flex flex-col gap-1.5 items-start mb-2">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gravação Escolhida</span>
                                    {res.status === "checked_in" ? (
                                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[8px] font-black rounded uppercase leading-none border border-sky-200">✔️ PRESENTE / CHECK-IN</span>
                                    ) : res.status === "confirmed" ? (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded uppercase leading-none border border-emerald-200">CONFIRMADA</span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black rounded uppercase leading-none border border-amber-200">AGUARDANDO APROVAÇÃO</span>
                                    )}
                                  </div>
                                  <p className="text-xs font-black text-primary">{res.sessionDate}</p>
                                  <p className="text-xs font-semibold text-neutral-600">{res.sessionTime}</p>
                                  <p className="text-secondary text-[10px]">{res.sessionTitle}</p>
                                </div>

                                <div className="space-y-1 pb-1">
                                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Dados do Convidado</p>
                                  <p className="text-xs font-black text-on-surface">{res.name}</p>
                                  <p className="text-xs font-semibold text-neutral-600 truncate">{res.email}</p>
                                  <p className="text-xs text-neutral-600 font-mono">{res.phone}</p>
                                  {res.instagram && (
                                    <p className="text-[10px] text-surface-tint font-bold">@{res.instagram}</p>
                                  )}

                                  {/* List companion guests */}
                                  {res.guests && res.guests.length > 0 ? (
                                    <div className="mt-2 pt-2 border-t border-neutral-100 space-y-1">
                                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Acompanhantes ({res.guests.length}):</p>
                                      {res.guests.map((g, gi) => (
                                        <div key={gi} className="text-2xs bg-neutral-50 p-1.5 rounded border border-neutral-100 flex flex-col">
                                          <span className="font-bold text-neutral-700">{g.name}</span>
                                          <span className="text-neutral-500 font-mono text-[9px] mt-0.5">{g.email}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[9px] text-neutral-400 italic mt-2">Sem acompanhantes cadastrados</p>
                                  )}
                                </div>

                                <div className="space-y-1.5 md:col-span-1 flex flex-col justify-between">
                                  <div>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pauta Proposta</p>
                                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-700 italic leading-relaxed">
                                      "{res.topic}"
                                    </div>
                                  </div>

                                  {/* Admin Google sync widget */}
                                  <div className="pt-3 border-t border-neutral-100/50 mt-3 space-y-2">
                                    {res.status === "checked_in" ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="p-2.5 bg-sky-50 border border-sky-100 text-sky-800 text-[10px] font-bold rounded-xl flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5 text-sky-700">
                                            <Check className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                            <span>CHECK-IN DIGITAL REALIZADO</span>
                                          </div>
                                          <p className="font-normal font-sans text-[9px] text-[#55697a] leading-relaxed">
                                            O convidado deu o aceite no termo de direito de imagem.
                                          </p>
                                          {res.checkInTimestamp && (
                                            <div className="text-[8px] mt-1 bg-sky-500/10 px-1.5 py-0.5 rounded text-sky-700 font-mono w-max">
                                              {new Date(res.checkInTimestamp).toLocaleString()}
                                            </div>
                                          )}
                                        </div>
                                        {/* Re-sync option */}
                                        <button
                                          type="button"
                                          onClick={() => handleAdminGoogleSync(res)}
                                          className="text-right text-[9px] text-primary hover:underline cursor-pointer font-bold select-none block"
                                        >
                                          🔄 Reenviar convite ao Google Agenda
                                        </button>
                                      </div>
                                    ) : res.status === "confirmed" ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold rounded-xl flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5 text-emerald-700">
                                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>Agendamento Confirmado</span>
                                          </div>
                                          <p className="font-normal font-sans text-[9px] text-neutral-500 leading-relaxed">
                                            Aguardando o aceite correspondente do Termo de Imagem.
                                          </p>
                                        </div>

                                        {/* Copiar WhatsApp Check-In */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const txt = `Olá! Aguardamos você para nossa gravação no Café com Internet! ☕️ Por favor, assine a autorização de uso de imagem e realize seu Check-In digital antes da gravação através do link de convidado, utilizando o código exclusivo: "${res.id}". Nos vemos lá!`;
                                            navigator.clipboard.writeText(txt);
                                            setCopiedId(res.id);
                                            setTimeout(() => setCopiedId(null), 3000);
                                          }}
                                          className="text-left text-2xs text-[#a13b53] hover:underline cursor-pointer font-bold select-none py-1 flex items-center gap-1"
                                        >
                                          {copiedId === res.id ? (
                                            <span className="text-emerald-600">✓ Instruções copiadas!</span>
                                          ) : (
                                            <span>📲 Copiar instruções de Check-In p/ WhatsApp</span>
                                          )}
                                        </button>

                                        {/* Re-sync option */}
                                        <button
                                          type="button"
                                          onClick={() => handleAdminGoogleSync(res)}
                                          className="text-right text-[9px] text-primary hover:underline cursor-pointer font-bold select-none block"
                                        >
                                          🔄 Reenviar convite ao Google Agenda
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                          <button
                                            type="button"
                                            disabled={adminSyncingId === res.id}
                                            onClick={() => handleAdminGoogleSync(res)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 hover:border-emerald-850 rounded-xl py-2 px-3 text-3xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10"
                                          >
                                            {adminSyncingId === res.id ? "Sincronizando..." : "Aprovar & Enviar Google Agenda"}
                                          </button>
                                          
                                          <button
                                            type="button"
                                            disabled={adminSyncingId === res.id}
                                            onClick={() => handleConfirmOnly(res)}
                                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-xl py-2 px-3 text-3xs font-bold transition-all text-center cursor-pointer select-none"
                                            title="Confirmar apenas localmente, sem enviar para Google Agenda"
                                          >
                                            Aprovar Apenas Local
                                          </button>
                                        </div>

                                        {adminSyncResult[res.id]?.msg && (
                                          <div className="space-y-2 mt-2">
                                            <p className="text-[9px] text-red-500 bg-red-50 p-1.5 rounded border border-red-100 font-medium">
                                              ⚠️ {adminSyncResult[res.id].msg}
                                            </p>
                                            {(adminSyncResult[res.id].msg.toLowerCase().includes("origin") || adminSyncResult[res.id].msg.toLowerCase().includes("autoriz") || adminSyncResult[res.id].msg.toLowerCase().includes("id") || showAdminClientId) && (
                                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[10px] text-amber-800 space-y-1 mt-2 text-left leading-normal font-sans">
                                                <span className="font-bold block text-amber-900 text-[10px]">💡 Erro de Origem OAuth Google:</span>
                                                <p className="text-[10px] text-amber-800 font-normal">
                                                  Como o app roda em ambiente sandbox dinâmico de desenvolvimento, adicione esta URL de origem específica no seu ID de Cliente OAuth no Google Cloud:
                                                </p>
                                                <ol className="list-decimal pl-3.5 space-y-1 font-semibold text-[10px]">
                                                  <li>Abra o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline font-bold hover:text-amber-950 font-sans">GCP Credentials</a>.</li>
                                                  <li>Em <strong>Origens JavaScript autorizadas</strong>, adicione:
                                                    <div className="mt-0.5 bg-white border border-amber-300 rounded px-1.5 py-0.5 font-mono text-[9px] text-neutral-700 select-all font-normal">
                                                      {window.location.origin}
                                                    </div>
                                                  </li>
                                                  <li>Em <strong>URIs de redirecionamento autorizados</strong> (com barra/):
                                                    <div className="mt-0.5 bg-white border border-amber-300 rounded px-1.5 py-0.5 font-mono text-[9px] text-neutral-700 select-all font-normal">
                                                      {window.location.origin}/
                                                    </div>
                                                  </li>
                                                  <li>Salve no GCP e tente novamente após cerca de 1 minuto.</li>
                                                </ol>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {false && adminSyncResult[res.id]?.msg && <div />}

                                        {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || showAdminClientId) && (
                                          <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1">
                                            <button
                                              type="button"
                                              onClick={() => setShowAdminClientId(!showAdminClientId)}
                                              className="text-[9px] text-neutral-500 hover:underline cursor-pointer font-bold block"
                                            >
                                              {showAdminClientId ? "✕ Ocultar Client ID" : "⚙️ Informar Client ID de testes"}
                                            </button>

                                            {showAdminClientId && (
                                              <input
                                                type="text"
                                                placeholder="Seu Google Client ID"
                                                value={adminCustomClientId}
                                                onChange={(e) => setAdminCustomClientId(e.target.value)}
                                                className="w-full text-2xs px-1.5 py-1 bg-white border border-neutral-200 rounded outline-none"
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* --- TAB 4: MENSAGENS / FEEDBACK --- */}
                  {activeTab === "mensagens" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-sans font-black text-xl text-on-surface tracking-tight">
                          💬 Dúvidas, Parcerias e Sugestões
                        </h3>
                        <p className="text-neutral-500 text-xs mt-1">
                          Mensagens enviadas através do formulário de contato ou fale conosco na página.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {feedback.length === 0 ? (
                          <div className="p-12 text-center text-neutral-400 text-xs bg-neutral-50 border border-neutral-100 rounded-3xl">
                            Nenhuma mensagem foi enviada ainda.
                          </div>
                        ) : (
                          feedback.map((msg) => (
                            <div key={msg.id} className="p-5 bg-white border border-neutral-100 rounded-2xl relative shadow-xs">
                              <button
                                onClick={() => handleDeleteFeedback(msg.id)}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Deletar Mensagem"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <div className="flex justify-between items-start">
                                <div className="space-y-1 select-none">
                                  <h4 className="font-sans font-black text-sm text-neutral-800">{msg.name}</h4>
                                  <p className="text-xs font-mono text-neutral-500">{msg.email}</p>
                                  <p className="text-[9px] font-bold text-neutral-400 uppercase">{msg.timestamp}</p>
                                </div>
                              </div>

                              <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
                                {msg.message}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- TAB 5: LISTA DE ESPERA --- */}
                  {activeTab === "espera" && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-sans font-black text-xl text-on-surface tracking-tight">
                            👥 Lista de Espera de Convidados
                          </h3>
                          <p className="text-neutral-500 text-xs mt-1">
                            Aqui estão os convidados inscritos que aguardam datas flexíveis ou novos slots de gravação.
                          </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-1.5 rounded-xl font-bold select-none flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Total: {waitingList.length} pessoas</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {waitingList.length === 0 ? (
                          <div className="p-12 text-center text-neutral-400 text-xs bg-neutral-50 border border-neutral-100 rounded-3xl">
                            Nenhum convidado inscrito na lista de espera até o momento.
                          </div>
                        ) : (
                          waitingList.map((entry) => (
                            <div key={entry.id} className="p-5 bg-white border border-neutral-100 rounded-2xl relative shadow-xs hover:border-neutral-200 transition-colors">
                              <button
                                onClick={() => handleDeleteWaitingList(entry.id)}
                                className="absolute top-4 right-4 text-neutral-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remover da Lista"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pr-8">
                                <div className="md:col-span-4 space-y-1">
                                  <h4 className="font-sans font-black text-base text-neutral-800">{entry.name}</h4>
                                  <p className="text-xs font-mono text-[#a13b53] font-bold break-all bg-neutral-50 px-2.5 py-1 rounded-lg inline-block select-all">{entry.contact}</p>
                                  {entry.createdAt && (
                                    <p className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Inscrito em: {new Date(entry.createdAt).toLocaleDateString()}</p>
                                  )}
                                </div>

                                <div className="md:col-span-4 space-y-2">
                                  <div>
                                    <span className="text-[10px] font-black tracking-wider uppercase text-neutral-400 block">Dias de Preferência</span>
                                    <span className="text-xs font-semibold text-neutral-700">{entry.weekdayPreferences || "Qualquer dia útil"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black tracking-wider uppercase text-neutral-400 block">Melhores Horários (9:00 às 17:00)</span>
                                    <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-0.5">{entry.bestHours || "Livre comercial"}</span>
                                  </div>
                                </div>

                                <div className="md:col-span-4 flex justify-end pt-3 md:pt-1">
                                  <a
                                    href={`https://api.whatsapp.com/send?phone=${entry.contact.replace(/\D/g, "")}&text=Olá%20${encodeURIComponent(entry.name)}!%20Aqui%20é%20Eunice%20Vargas,%20do%20Café%20com%20Internet.%20Vi%20que%20se%20inscreveu%20em%20nossa%20lista%20de%20espera!%20Vamos%20agendar%20sua%20gravação?`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer font-sans"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Agendar via WhatsApp</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
