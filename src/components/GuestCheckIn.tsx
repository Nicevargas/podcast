import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UserCheck, 
  Search, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Camera, 
  Undo2,
  Lock
} from "lucide-react";
import { Reservation } from "../types";
import { db } from "../supabaseClient";

interface GuestCheckInProps {
  onClose: () => void;
  onCheckInCompleted: () => void;
}

export default function GuestCheckIn({ onClose, onCheckInCompleted }: GuestCheckInProps) {
  // States
  const [emailQuery, setEmailQuery] = useState("");
  const [ticketQuery, setTicketQuery] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState(false);
  
  const [imageConsent, setImageConsent] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [completedCheckInData, setCompletedCheckInData] = useState<Reservation | null>(null);

  // Search for the reservation by email or ticket ID
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setSearchSuccess(false);
    setReservations([]);
    setSelectedRes(null);

    const query = emailQuery.trim().toLowerCase() || ticketQuery.trim().toLowerCase();
    if (!query) {
      setSearchError("Por favor, informe seu e-mail ou código do agendamento.");
      return;
    }

    setIsSearching(true);
    try {
      const allReservations = await db.reservations.list();
      
      // Filter list based on email match OR ID match
      const matched = allReservations.filter((res) => {
        const matchesEmail = res.email.toLowerCase().trim() === emailQuery.trim().toLowerCase();
        const matchesTicket = res.id.toLowerCase().trim() === ticketQuery.trim().toLowerCase();
        return matchesEmail || matchesTicket;
      });

      if (matched.length === 0) {
        setSearchError("Nenhum agendamento ativo ou confirmado encontrado para os dados informados. Verifique com a produção se sua vaga já está aprovada.");
      } else {
        setReservations(matched);
        setSearchSuccess(true);
        if (matched.length === 1) {
          setSelectedRes(matched[0]);
          setImageConsent(matched[0].imageConsent || false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setSearchError("Houve uma falha ao consultar os agendamentos. Tente novamente em instantes.");
    } finally {
      setIsSearching(false);
    }
  };

  // Select a reservation from the list (if multiple found under same email)
  const handleSelectReservation = (res: Reservation) => {
    setSelectedRes(res);
    setImageConsent(res.imageConsent || false);
    setSearchError("");
  };

  // Submit check-in and accept image rights terms
  const handleSubmitCheckIn = async () => {
    if (!selectedRes) return;
    if (!imageConsent) {
      setSearchError("Você precisa marcar a caixa de consentimento de uso de imagem e voz para concluir o check-in.");
      return;
    }

    setIsSubmittingCheckIn(true);
    setSearchError("");

    try {
      const nowIso = new Date().toISOString();
      const updates = {
        status: "checked_in" as const,
        imageConsent: true,
        checkInTimestamp: nowIso
      };

      await db.reservations.update(selectedRes.id, updates);
      
      // If we are simulating localstorage, update the local instance
      const localReservations = localStorage.getItem("cafe_internet_reservations");
      if (localReservations) {
        const parsed = JSON.parse(localReservations) as Reservation[];
        const updated = parsed.map((r) => 
          r.id === selectedRes.id 
            ? { ...r, ...updates } 
            : r
        );
        localStorage.setItem("cafe_internet_reservations", JSON.stringify(updated));
      }

      setCompletedCheckInData({
        ...selectedRes,
        ...updates
      });
      setCheckInDone(true);
      onCheckInCompleted();
    } catch (err: any) {
      console.error(err);
      setSearchError("Falha ao salvar seu check-in no banco de dados. Contate a produção do Café com Internet.");
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        id="checkin-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden my-8 border border-neutral-100 flex flex-col"
      >
        {/* Accent strip */}
        <div className="h-2.5 bg-gradient-to-r from-primary via-[#a13b53] to-secondary-container" />
        
        {/* Back navigation button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors z-10"
          title="Fechar"
        >
          <Undo2 className="w-5.5 h-5.5" />
        </button>

        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
          
          <AnimatePresence mode="wait">
            {!checkInDone ? (
              <motion.div
                key="lookup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Header info */}
                <div className="space-y-2 text-center max-w-md mx-auto">
                  <div className="w-12 h-12 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h2 className="font-sans font-black text-2xl text-on-surface tracking-tight">
                    Check-In de Convidado
                  </h2>
                  <p className="text-neutral-500 text-xs">
                    Se você já tem uma gravação agendada e confirmada, insira seus dados para confirmar presença e assinar o consentimento de uso de imagem.
                  </p>
                </div>

                {!selectedRes ? (
                  /* Form to search reservation */
                  <form onSubmit={handleSearch} className="bg-neutral-50 border border-neutral-200/40 p-5 rounded-2xl md:p-6 space-y-4">
                    <h3 className="font-sans font-bold text-sm text-neutral-800">
                      🔍 Localizar meu agendamento
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-2xs font-extrabold uppercase text-neutral-500 tracking-wider">
                          E-mail do Participante
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            placeholder="Ex: joao@dominio.com"
                            value={emailQuery}
                            onChange={(e) => {
                              setEmailQuery(e.target.value);
                              setTicketQuery("");
                            }}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-200 focus:border-primary rounded-lg text-xs outline-none transition-all"
                          />
                          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3.5" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-2xs font-extrabold uppercase text-neutral-500 tracking-wider">
                          Ou Cód. Agendamento (Ref)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Ex: res-3g82hs"
                            value={ticketQuery}
                            onChange={(e) => {
                              setTicketQuery(e.target.value);
                              setEmailQuery("");
                            }}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-200 focus:border-primary rounded-lg text-xs outline-none transition-all"
                          />
                          <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3.5" />
                        </div>
                      </div>
                    </div>

                    {searchError && (
                      <p className="text-3xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 leading-normal">
                        ⚠️ {searchError}
                      </p>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="w-full bg-primary-container text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-sm hover:opacity-95 text-center flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSearching ? "Buscando..." : "Buscar Agendamento"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[10px] text-center text-ink-subtle italic">
                      💡 Seus dados já estão salvos no nosso banco. Você só precisará dar o aceite digital.
                    </p>
                  </form>
                ) : (
                  /* Option Selection or Just the single matched reservation */
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#a13b53] font-bold">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Agendamento Localizado!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRes(null);
                          setReservations([]);
                          setSearchSuccess(false);
                          setSearchError("");
                        }}
                        className="text-3xs font-extrabold text-[#a13b53] hover:underline uppercase tracking-wide cursor-pointer"
                      >
                        Buscar outro
                      </button>
                    </div>

                    {/* Booking metadata ticket */}
                    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/50 border border-neutral-200 p-5 rounded-2xl relative overflow-hidden space-y-3.5">
                      <span className="absolute top-0 right-0 bg-primary/10 text-primary text-[8px] font-extrabold px-2.5 py-1 rounded-bl-xl uppercase tracking-wider">
                        Cód: {selectedRes.id.toUpperCase()}
                      </span>

                      <div className="space-y-1">
                        <p className="text-[9px] uppercase font-mono text-neutral-400 font-extrabold tracking-wider">Participante Convidado</p>
                        <h4 className="font-sans font-black text-base text-primary leading-tight">{selectedRes.name}</h4>
                        <p className="text-2xs text-[#5f5e5e] font-semibold">{selectedRes.email} · {selectedRes.phone}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-neutral-200/60 text-xs">
                        <div className="flex items-center gap-2 text-[#5f5e5e]">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span>Data: <strong>{selectedRes.sessionDate}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-[#5f5e5e]">
                          <Clock className="w-4 h-4 text-primary shrink-0" />
                          <span>Horário: <strong>{selectedRes.sessionTime}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-[#5f5e5e] col-span-1 sm:col-span-2">
                          <MapPin className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                          <span className="truncate">Estúdio: <strong>{selectedRes.sessionTitle}</strong></span>
                        </div>
                      </div>

                      {selectedRes.topic && (
                        <div className="bg-white border border-neutral-200/50 p-2.5 rounded-lg text-2xs leading-relaxed text-neutral-700">
                          <span className="font-bold text-primary">Tema da Pauta:</span> "{selectedRes.topic}"
                        </div>
                      )}
                    </div>

                    {/* Check In Status Warning */}
                    {selectedRes.status === "checked_in" && (
                      <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-start gap-2.5 text-emerald-800 text-2xs select-none">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold">Check-In e Consentimento já realizados!</p>
                          <p className="text-neutral-500 text-[10px] y-1">Você já assinou este termo em {new Date(selectedRes.checkInTimestamp || "").toLocaleString()}. Não é necessário assinar novamente.</p>
                        </div>
                      </div>
                    )}

                    {/* IMAGE CONSENT TERMS AND WAIVER */}
                    <div className="space-y-3.5 pt-2">
                      <div className="flex items-center gap-2.5 text-xs text-neutral-800 font-bold uppercase tracking-wider border-b border-neutral-100 pb-1.5">
                        <FileText className="w-4 h-4 text-primary" />
                        <span>Termo de Direito de Uso de Imagem e Voz</span>
                      </div>

                      <div className="bg-neutral-50 text-[11px] leading-relaxed text-[#5f5e5e] max-h-48 overflow-y-auto p-4 border border-neutral-200 rounded-xl space-y-2.5 text-justify select-none font-sans scroll-smooth">
                        <p className="font-bold text-neutral-800 text-center uppercase tracking-wider text-2xs">Carta de Consentimento e Cessão de Direitos Autorais</p>
                        <p>
                          Pelo presente termo de autorização, na qualidade de participante, convidado ou entrevistado do programa de podcast denominado <strong>CAFÉ COM INTERNET</strong>, de autoria e apresentação da jornalista <strong>Eunice Vargas</strong>, manifesto minha expressa concordância nas seguintes disposições:
                        </p>
                        <p>
                          <strong>1. OBJETO DA CESSÃO:</strong> Autorizo de livre e espontânea vontade, a título gratuito e sem qualquer ônus financeiro atual ou futuro, a captação, fixação e utilização do meu nome, imagem, voz, depoimentos, fotos e respostas fornecidas durante as dinâmicas de entrevista das gravações do episódio.
                        </p>
                        <p>
                          <strong>2. FINALIDADE E MEIOS DE VEÍCULAÇÃO:</strong> A presente cessão confere ao programa toda a autorização para veicular as mídias captadas em formato de áudio (plataformas de streaming de áudio como Spotify, Deezer, Apple Podcasts), vídeo (YouTube, Vimeo), trechos de corte (Instagram, TikTok, LinkedIn, YouTube Shorts), materiais promocionais gráficos, fotos de ambiente de bastidores das gravações e qualquer modalidade de mídia digital.
                        </p>
                        <p>
                          <strong>3. DIREITO DE EDIÇÃO:</strong> Fica garantido à produção do podcast o direito de realizar edições, cortes, sincronização e tratamentos de áudio/vídeo julgados pertinentes para a qualidade do material final, resguardando sempre o respeito e a integridade à dignidade moral do CONVIDADO.
                        </p>
                        <p>
                          <strong>4. VALIDADE E TERRITÓRIO:</strong> Esta outorga de direitos é concedida em formato irrevogável, irretratável, por prazo indeterminado e válido em âmbito nacional e internacional (internet aberta global).
                        </p>
                        <p className="font-bold text-neutral-700 italic border-t border-neutral-200/50 pt-2 text-[10px]">
                          Estando ciente das disposições legais relativas à proteção de dados e direitos autorais, dou o meu consentimento para o devido tratamento de dados.
                        </p>
                      </div>

                      {/* Explicit interactive consent checkbox */}
                      {selectedRes.status !== "checked_in" ? (
                        <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl space-y-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="consent-check"
                              checked={imageConsent}
                              onChange={(e) => setImageConsent(e.target.checked)}
                              className="mt-1 h-5 w-5 rounded border-outline-variant/60 text-primary focus:ring-primary accent-[#a13b53] cursor-pointer"
                            />
                            <label htmlFor="consent-check" className="text-xs text-neutral-800 leading-relaxed font-semibold cursor-pointer select-none">
                              Declaro que li, compreendi e concordo voluntariamente com todos os termos descritos acima, autorizando a veiculação de minha imagem e voz. <span className="text-primary">*</span>
                            </label>
                          </div>
                          
                          {searchError && (
                            <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded">
                              ⚠️ {searchError}
                            </p>
                          )}

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleSubmitCheckIn}
                              disabled={isSubmittingCheckIn || !imageConsent}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white font-label-md text-xs font-black py-3.5 px-6 rounded-xl transition-all shadow-md shadow-emerald-700/10 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                            >
                              {isSubmittingCheckIn ? "Gravando Check-In..." : "Assinar Termo & Fazer Check-In"}
                              <ShieldCheck className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-neutral-100 hover:bg-neutral-200 text-[#5f5e5e] py-3 rounded-xl text-center text-xs font-bold transition-all cursor-pointer"
                          >
                            Voltar ao Menu
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* List all matches if multiple found */}
                {reservations.length > 1 && !selectedRes && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                      Múltiplas reservas encontradas sob o e-mail "{emailQuery}":
                    </p>
                    <div className="space-y-2">
                      {reservations.map((res) => (
                        <div
                          key={res.id}
                          onClick={() => handleSelectReservation(res)}
                          className="bg-white hover:bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl cursor-pointer flex justify-between items-center transition-all hover:border-primary/40 group"
                        >
                          <div>
                            <p className="text-2xs font-extrabold text-primary">{res.sessionDate}</p>
                            <p className="text-xs font-bold text-neutral-800">{res.sessionTitle} às {res.sessionTime}</p>
                            <p className="text-[10px] text-neutral-400 italic">Pauta: "{res.topic}"</p>
                          </div>
                          <span className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold group-hover:bg-primary group-hover:text-white transition-all">
                            Selecionar
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Check-in result ticket animation / receipt */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-6"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-sans font-black text-2xl text-on-surface tracking-tight">Check-In Realizado!</h3>
                  <p className="text-secondary text-xs max-w-sm mx-auto font-medium leading-relaxed">
                    Olá {completedCheckInData?.name}, seu consentimento de uso de imagem está oficialmente homologado!
                  </p>
                </div>

                {/* Simulated digital signed card */}
                <div className="bg-gradient-to-br from-emerald-500/10 via-white to-white border border-emerald-500/20 p-6 rounded-2xl text-left shadow-lg relative overflow-hidden max-w-md mx-auto space-y-4">
                  <div className="absolute top-0 right-0 p-2 bg-emerald-600 text-white text-[8px] font-black rounded-bl-xl tracking-widest uppercase select-none">
                    ✔️ ASSINADO DIGITALMENTE
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Convidado Oficial</span>
                    <h4 className="text-sm font-black text-primary leading-tight">{completedCheckInData?.name}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono select-all">REF: {completedCheckInData?.id.toUpperCase()}</p>
                  </div>

                  <div className="border-t border-dashed border-neutral-200 pt-3 space-y-2 text-xs">
                    <div className="flex gap-2 text-neutral-700">
                      <Camera className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-neutral-800">Direito de Imagem & Voz</p>
                        <p className="text-[10px] text-neutral-500 font-semibold">Uso autorizado em feeds, streaming de áudio e cortes oficiais do podcast.</p>
                      </div>
                    </div>

                    <div className="flex gap-2 text-neutral-700 pt-1.5 border-t border-neutral-100/50">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-neutral-500 leading-normal">
                          Dia da Gravação: <strong>{completedCheckInData?.sessionDate}</strong> às <strong>{completedCheckInData?.sessionTime}</strong> no estúdio <strong>{completedCheckInData?.sessionTitle}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-100/40 p-3 rounded-lg border border-slate-200/50 text-[10px] font-mono leading-relaxed text-ink-subtle">
                    🕒 <strong>Log de Registro:</strong> {new Date(completedCheckInData?.checkInTimestamp || "").toLocaleString()}<br />
                    🔑 <strong>Hash de Validação:</strong> {Math.random().toString(16).substr(2, 12).toUpperCase()}
                  </div>
                </div>

                <div className="bg-[#fcf8ec] text-[#8a6d3b] p-4 rounded-xl text-2xs space-y-2 text-left leading-relaxed max-w-md mx-auto border border-[#faebcc]">
                  <span className="font-bold flex items-center gap-1">☕️ Boas-vindas ao Convidado:</span>
                  <p>
                    Seu termo assinado e check-in garantem a organização e a segurança legal da gravação com Eunice Vargas. Tome um café quente e prepare-se para um ótimo momento de networking digital!
                  </p>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={onClose}
                    className="bg-primary-container text-white py-3 px-8 rounded-full text-xs font-bold transition-all shadow-md hover:scale-105 cursor-pointer"
                  >
                    Pronto! Voltar ao Menu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}
