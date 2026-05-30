import React, { useState } from "react";
import { X, Calendar, Clock, MapPin, CheckCircle2, Send, ExternalLink, Sparkles } from "lucide-react";
import { RecordingSession, Reservation } from "../types";

interface ReservationModalProps {
  session: RecordingSession;
  onClose: () => void;
  onConfirmReservation: (reservation: Reservation) => void;
}

export default function ReservationModal({
  session,
  onClose,
  onConfirmReservation,
}: ReservationModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    instagram: string;
    topic: string;
    consent: boolean;
    guests: Array<{ name: string; email: string }>;
  }>({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    topic: "",
    consent: false,
    guests: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Reservation | null>(null);

  // Google Calendar states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [customClientId, setCustomClientId] = useState("");
  const [showClientIdInput, setShowClientIdInput] = useState(false);

  const handleAddGuest = () => {
    if (formData.guests.length >= 3) return;
    setFormData({
      ...formData,
      guests: [...formData.guests, { name: "", email: "" }],
    });
  };

  const handleUpdateGuest = (index: number, key: "name" | "email", value: string) => {
    const updated = [...formData.guests];
    updated[index] = { ...updated[index], [key]: value };
    setFormData({
      ...formData,
      guests: updated,
    });
  };

  const handleRemoveGuest = (index: number) => {
    const updated = formData.guests.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      guests: updated,
    });
  };

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    setSyncSuccess(null);
    setSyncError(null);

    const clientIdToUse = customClientId.trim() || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    if (!clientIdToUse) {
      setSyncError("É necessário o Google Client ID. Por favor, insira um Client ID nas configurações de teste abaixo para prosseguir.");
      setShowClientIdInput(true);
      setIsSyncing(false);
      return;
    }

    try {
      const { authenticateGoogleCalendar, createGoogleCalendarEvent, formatToISO } = await import("../googleCalendarHelper");
      
      const token = await authenticateGoogleCalendar(clientIdToUse);
      
      const startIso = formatToISO(session.day, session.month, session.year, session.timeStart);
      const endIso = formatToISO(session.day, session.month, session.year, session.timeEnd);
      
      const attendees = [
        { email: formData.email, displayName: formData.name }
      ];
      
      formData.guests.forEach(g => {
        if (g.email.trim() && g.name.trim()) {
          attendees.push({ email: g.email.trim(), displayName: g.name.trim() });
        }
      });
      
      const guestInfoText = formData.guests.length > 0 
        ? formData.guests.map((g, i) => `   Convidado ${i + 1}: ${g.name} (${g.email})`).join("\n")
        : "   Nenhum convidado adicional adicionado.";

      const description = `☕️ Gravação do Podcast Café com Internet com Eunice Vargas\n\n` +
        `📍 Local da Gravação: ${session.location}\n` +
        `🏠 Endereço detalhado: ${session.address}\n` +
        `⏰ Horário agendado: ${session.timeStart} – ${session.timeEnd}\n\n` +
        `👤 Participante principal:\n` +
        `   Nome: ${formData.name}\n` +
        `   E-mail: ${formData.email}\n` +
        `   Telefone: ${formData.phone}\n` +
        `   Instagram: ${formData.instagram ? `@${formData.instagram.replace("@", "")}` : "Não informado"}\n\n` +
        `💡 Ideia de Pauta / Temas sugeridos:\n` +
        `   "${formData.topic}"\n\n` +
        `👥 Convidados Adicionais para Compartilhar (Até 3):\n${guestInfoText}\n\n` +
        `Este convite foi gerado automaticamente pelo site do Café com Internet. Certifique-se de comparecer com antecedência!`;

      const eventPayload = {
        summary: `Gravação Café com Internet: ${formData.name}`,
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
      setSyncSuccess(true);
    } catch (err: any) {
      console.error(err);
      setSyncError(err?.message || "Ocorreu um erro ao sincronizar com o Google Agenda.");
    } finally {
      setIsSyncing(false);
    }
  };

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.name.trim()) tempErrors.name = "Nome completo é obrigatório.";
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      tempErrors.email = "E-mail é obrigatório.";
    } else if (!emailPattern.test(formData.email)) {
      tempErrors.email = "Insira um endereço de e-mail válido.";
    }

    if (!formData.phone.trim()) {
      tempErrors.phone = "Celular/WhatsApp é obrigatório.";
    } else if (formData.phone.replace(/\D/g, "").length < 10) {
      tempErrors.phone = "Insira um número de telefone válido com DDD.";
    }

    if (!formData.topic.trim()) {
      tempErrors.topic = "Descreva brevemente sua contribuição ou tema de interesse.";
    }

    if (!formData.consent) {
      tempErrors.consent = "Você deve autorizar o contato para confirmação da gravação.";
    }

    // Validate guests if added
    formData.guests.forEach((guest, index) => {
      if (!guest.name.trim()) {
        tempErrors[`guest_${index}_name`] = "Nome do convidado é obrigatório.";
      }
      if (!guest.email.trim()) {
        tempErrors[`guest_${index}_email`] = "E-mail do convidado é obrigatório.";
      } else if (!emailPattern.test(guest.email)) {
        tempErrors[`guest_${index}_email`] = "Insira um e-mail válido para o convidado.";
      }
    });

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const ticket: Reservation = {
      id: "res-" + Math.random().toString(36).substr(2, 9),
      sessionId: session.id,
      sessionTitle: session.title,
      sessionDate: `${session.day} de ${session.month} de ${session.year}`,
      sessionTime: `${session.timeStart} – ${session.timeEnd}`,
      address: session.address,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      topic: formData.topic,
      instagram: formData.instagram ? `@${formData.instagram.replace("@", "")}` : "",
      timestamp: new Date().toISOString(),
      guests: formData.guests.filter(g => g.name.trim() !== ""),
    };

    setCreatedTicket(ticket);
    onConfirmReservation(ticket);
    setIsSuccess(true);
  };

  const getWhatsAppLink = () => {
    if (!createdTicket) return "";
    const baseText = `Olá Eunice! Acabei de me inscrever para participar do podcast Café com Internet na gravação do dia ${session.day} de ${session.month} no ${session.title} (${session.timeStart} - ${session.timeEnd}). Meu nome é ${createdTicket.name} e meu tema sugerido é: "${createdTicket.topic}". Fico no aguardo da sua confirmação! 🎧☕️`;
    return `https://api.whatsapp.com/send/?phone=5511994637159&text=${encodeURIComponent(baseText)}`;
  };

  return (
    <div id="reservation-modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div id="reservation-modal-content" className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden my-8 ambient-card transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top brand accent banner */}
        <div className="h-2 bg-gradient-to-r from-primary to-primary-container" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-secondary hover:bg-secondary/5 hover:text-primary transition-colors z-10"
        >
          <X className="w-5.5 h-5.5" />
        </button>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a13b53] bg-surface-tint/40 px-3 py-1 rounded-full">
                Pedido de Reserva
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-on-surface">
                Gravar com Eunice Vargas
              </h3>
              <p className="text-sm text-on-surface-variant">
                Preencha seus dados para solicitar o agendamento de sua participação gratuita no estúdio do SampaCast.
              </p>
            </div>

            {/* Selected Session BoardCard */}
            <div className="bg-[#F8F8F8] border border-outline-variant/30 p-4 rounded-xl space-y-3">
              <div className="text-xs font-semibold text-secondary flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Detalhes da Gravação Selecionada
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-on-surface">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{session.day} de {session.month} de {session.year}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{session.timeStart} – {session.timeEnd}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface sm:col-span-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="truncate">{session.location}</span>
                </div>
              </div>
              <p className="text-[11px] text-ink-subtle italic">
                Endereço: {session.address}
              </p>
            </div>

            {/* Inputs Grid */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Nome Completo <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Eunice Vargas"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-background-alt border ${
                    errors.name ? "border-red-500 bg-red-50/10" : "border-outline-variant/50 focus:border-primary"
                  } rounded-lg text-sm text-on-surface outline-none focus:bg-white transition-all`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    E-mail de Contato <span className="text-primary">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="eunice@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-background-alt border ${
                      errors.email ? "border-red-500 bg-red-50/10" : "border-outline-variant/50 focus:border-primary"
                    } rounded-lg text-sm text-on-surface outline-none focus:bg-white transition-all`}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    WhatsApp con DDD <span className="text-primary">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: (11) 99463-7159"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-background-alt border ${
                      errors.phone ? "border-red-500 bg-red-50/10" : "border-outline-variant/50 focus:border-primary"
                    } rounded-lg text-sm text-on-surface outline-none focus:bg-white transition-all`}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Usuário do Instagram <span className="text-secondary-container-variant opacity-80">(Opcional)</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-outline-variant/50 bg-neutral-100 text-sm text-secondary">
                    @
                  </span>
                  <input
                    type="text"
                    placeholder="eunice_vargas_podcast"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="flex-1 min-w-0 w-full px-4 py-2.5 bg-background-alt border border-outline-variant/50 rounded-r-lg text-sm text-on-surface outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  O que deseja abordar / Enviar proposta de tema <span className="text-primary">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Quais insights ou histórias você gostaria de compartilhar?"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-background-alt border ${
                    errors.topic ? "border-red-500 bg-red-50/10" : "border-outline-variant/50 focus:border-primary"
                  } rounded-lg text-sm text-on-surface outline-none focus:bg-white resize-none transition-all`}
                />
                {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic}</p>}
              </div>

              {/* Dynamic Guest Section (Up to 3) */}
              <div className="border-t border-outline-variant/30 pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface">
                    Acompanhantes / Convidados adicionais (Até 3)
                  </label>
                  {formData.guests.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddGuest}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      + Adicionar Convidado
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Insira o nome e e-mail dos seus convidados. Eles serão incluídos e convidados no link de compartilhamento da agenda do Google.
                </p>

                {formData.guests.map((guest, index) => (
                  <div key={index} className="bg-neutral-50 px-3 py-4 rounded-xl border border-outline-variant/30 relative space-y-3 animate-in slide-in-from-top-2 duration-150">
                    <button
                      type="button"
                      onClick={() => handleRemoveGuest(index)}
                      className="absolute top-2 right-2 text-xs text-red-500 hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                    <div className="text-[11px] font-bold text-secondary uppercase">
                      Convidado {index + 1}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Nome completo do convidado"
                          value={guest.name}
                          onChange={(e) => handleUpdateGuest(index, "name", e.target.value)}
                          className={`w-full px-3 py-2 bg-white border ${
                            errors[`guest_${index}_name`] ? "border-red-500 bg-red-50/10" : "border-outline-variant/50"
                          } rounded text-xs text-on-surface outline-none`}
                        />
                        {errors[`guest_${index}_name`] && (
                          <p className="text-[10px] text-red-500 mt-1">{errors[`guest_${index}_name`]}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="email"
                          placeholder="E-mail do convidado"
                          value={guest.email}
                          onChange={(e) => handleUpdateGuest(index, "email", e.target.value)}
                          className={`w-full px-3 py-2 bg-white border ${
                            errors[`guest_${index}_email`] ? "border-red-500 bg-red-50/10" : "border-outline-variant/50"
                          } rounded text-xs text-on-surface outline-none`}
                        />
                        {errors[`guest_${index}_email`] && (
                          <p className="text-[10px] text-red-500 mt-1">{errors[`guest_${index}_email`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="consent-check"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-1 h-4.5 w-4.5 rounded border-outline-variant/50 text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <label htmlFor="consent-check" className="text-xs text-on-surface-variant leading-relaxed select-none cursor-pointer">
                  Autorizo o envio de e-mails para coordenação do episódio e concordo em comparecer presencialmente na data e hora agendadas. <span className="text-primary">*</span>
                </label>
              </div>
              {errors.consent && <p className="text-xs text-red-500">{errors.consent}</p>}
            </div>

            {/* Confirm Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-primary-container text-white py-3.5 px-6 rounded-xl font-label-md text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95 transform hover:-translate-y-0.5 transition-all shadow-lg shadow-primary-container/20 cursor-pointer"
              >
                Solicitar Vaga de Gravação
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Real Success Receipt Ticket State */
          <div className="p-6 md:p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-on-surface">Sua Gravação Está Pré-Reservada!</h3>
              <p className="text-sm text-on-surface-variant px-2">
                Parabéns, {createdTicket?.name}! Sua solicitação de gravação na <strong>{session.location}</strong> foi registrada no sistema local.
              </p>
            </div>

            {/* Receipt Ticket Box */}
            <div className="bg-gradient-to-br from-surface-tint/15 to-white border border-primary/20 p-5 rounded-2xl text-left shadow-lg relative overflow-hidden space-y-3.5">
              <div className="absolute top-0 right-0 p-1.5 bg-primary/15 text-primary text-[9px] font-bold rounded-bl-xl tracking-wider uppercase select-none">
                Ticket Confirmado
              </div>
              <div className="text-2xs font-mono text-ink-subtle select-all">
                ID: {createdTicket?.id} · {new Date(createdTicket?.timestamp || "").toLocaleDateString()}
              </div>

              <div className="space-y-1.5 border-t border-primary/10 pt-2.5">
                <p className="text-xs text-secondary">
                  <strong>Local:</strong> {session.location}
                </p>
                <p className="text-xs text-secondary">
                  <strong>Data:</strong> {createdTicket?.sessionDate}
                </p>
                <p className="text-xs text-secondary">
                  <strong>Horário:</strong> {createdTicket?.sessionTime}
                </p>
                <p className="text-xs text-secondary">
                  <strong>Tema:</strong> "{createdTicket?.topic}"
                </p>
                {createdTicket?.instagram && (
                  <p className="text-xs text-secondary">
                    <strong>Instagram:</strong> {createdTicket?.instagram}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-primary italic font-medium">
                Endereço de Gravação: {session.address}
              </p>
            </div>

            {/* Google Calendar Sync UI BoardCard */}
            <div className="bg-[#f0fdf4] border border-emerald-200/60 p-5 rounded-2xl text-left space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Calendar className="w-5 h-5 text-emerald-600 animate-pulse" />
                <span>Salvar no seu Google Agenda com Convidados</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Clique no botão abaixo para autorizar com segurança a sua conta Google e salvar esta data diretamente na sua agenda. Seus acompanhantes cadastrados receberão automaticamente os convites oficiais por e-mail!
              </p>

              {syncSuccess ? (
                <div className="bg-emerald-100 text-emerald-800 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sincronizado com Sucesso! Convites de compartilhamento enviados.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleSync}
                    disabled={isSyncing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/15"
                  >
                    {isSyncing ? "Sincronizando..." : "Sincronizar no Google Agenda & Compartilhar"}
                  </button>

                  {syncError && (
                    <p className="text-[11px] text-red-600 font-medium leading-relaxed bg-red-50 p-2.5 rounded-lg border border-red-200/50 animate-in fade-in duration-200">
                      ⚠️ {syncError}
                    </p>
                  )}

                  {/* Show testing Client ID box if not configured */}
                  {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || showClientIdInput) && (
                    <div className="bg-white border border-emerald-100 p-3 rounded-lg space-y-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setShowClientIdInput(!showClientIdInput)}
                        className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer block"
                      >
                        {showClientIdInput ? "✕ Ocultar configurações de Client ID" : "⚙️ Inserir Google Client ID de teste"}
                      </button>

                      {showClientIdInput && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="block text-[10px] font-bold text-on-surface">
                            Google Client ID de teste:
                          </label>
                          <input
                            type="text"
                            placeholder="Insira seu_client_id.apps.googleusercontent.com"
                            value={customClientId}
                            onChange={(e) => setCustomClientId(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-outline-variant rounded text-[11px] text-on-surface outline-none"
                          />
                          <p className="text-[9px] text-ink-subtle leading-normal">
                            Para testar localmente, forneça o ID de cliente Web gerado no Google Cloud Console com o escopo de Calendar Events. No ambiente de produção, esta chave deve ser definida via segredos nas variáveis de ambiente.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs space-y-2 text-left leading-relaxed">
              <span className="font-bold flex items-center gap-1">🎤 O Que Fazer Agora?</span>
              <p>
                Para confirmar mais rapidamente sua pauta diretamente com a apresentadora, clique no botão de WhatsApp abaixo para enviar os detalhes da sua inscrição diretamente à produção:
              </p>
            </div>

            {/* Redirect / Contact Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-[#25D366] text-white hover:bg-[#20ba59] py-3 px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all rounded-sm hover:-translate-y-0.5 cursor-pointer"
              >
                Confirmar via WhatsApp
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={onClose}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-on-surface-variant py-3 px-5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Voltar ao Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
