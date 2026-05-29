import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  Award,
  Video,
  Clapperboard,
  Coffee,
  Check,
  Send,
  CalendarDays,
  Headphones,
  Undo2,
  Mail,
  User,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  Music,
  Lock,
  Compass,
  ArrowRight
} from "lucide-react";

import { INITIAL_SESSIONS, STUDIO_LOCATIONS, PODCAST_EPISODES } from "./data";
import { RecordingSession, Reservation, FeedbackMessage, PodcastEpisode } from "./types";
import { db } from "./supabaseClient";
import Header from "./components/Header";
import PodcastPlayer from "./components/PodcastPlayer";
import ReservationModal from "./components/ReservationModal";
import MyReservations from "./components/MyReservations";
import AdminPortal from "./components/AdminPortal";

export default function App() {
  // Application Interactive States
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSession, setSelectedSession] = useState<RecordingSession | null>(null);
  const [showMyReservationsWindow, setShowMyReservationsWindow] = useState(false);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  
  // Filtering & Contact States
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");

  // Load and sync dynamic data from database
  const loadDynamicData = async () => {
    try {
      // Fetch dynamic episodes
      const fetchedEpisodes = await db.episodes.list();
      setEpisodes(fetchedEpisodes);
      if (fetchedEpisodes.length > 0) {
        setCurrentEpisode((prev) => {
          if (prev) {
            const stillExists = fetchedEpisodes.find(ep => ep.id === prev.id);
            return stillExists || fetchedEpisodes[0];
          }
          return fetchedEpisodes[0];
        });
      } else {
        setEpisodes(PODCAST_EPISODES);
        setCurrentEpisode((prev) => prev || PODCAST_EPISODES[0]);
      }

      // Fetch dynamic sessions
      const fetchedSessions = await db.sessions.list();

      // Get saved reservations to calculate spot limits
      const storedReservations = localStorage.getItem("cafe_internet_reservations");
      const loadedReservas: Reservation[] = storedReservations ? JSON.parse(storedReservations) : [];

      const updatedSessions = fetchedSessions.map((sess) => {
        const bookingsForSession = loadedReservas.filter((res) => res.sessionId === sess.id);
        const spotsLeft = Math.max(0, sess.totalSpots - bookingsForSession.length);
        return { ...sess, spotsLeft };
      });
      setSessions(updatedSessions);
    } catch (error) {
      console.error("Failed to load and sync Supabase data:", error);
    }
  };

  // Load state on mount
  useEffect(() => {
    // Get saved reservations
    const storedReservations = localStorage.getItem("cafe_internet_reservations");
    const loadedReservas: Reservation[] = storedReservations ? JSON.parse(storedReservations) : [];
    setReservations(loadedReservas);

    loadDynamicData();
  }, []);

  // Update session slots reactively when a reservation is confirmed
  const handleConfirmReservation = async (newReservation: Reservation) => {
    try {
      const updatedReservations = [...reservations, newReservation];
      setReservations(updatedReservations);
      localStorage.setItem("cafe_internet_reservations", JSON.stringify(updatedReservations));

      // Push reservation to Supabase client
      await db.reservations.create(newReservation);

      // Decrement spots reactively in DB
      const targetSession = sessions.find(s => s.id === newReservation.sessionId);
      if (targetSession) {
        const nextSpots = Math.max(0, targetSession.spotsLeft - 1);
        await db.sessions.update(newReservation.sessionId, { spotsLeft: nextSpots });
      }

      await loadDynamicData();
    } catch (err) {
      console.error(err);
    }
  };

  // Revert spots when a booking is deleted
  const handleCancelReservation = async (reservationId: string) => {
    const targetReservation = reservations.find((res) => res.id === reservationId);
    if (!targetReservation) return;

    try {
      const filtered = reservations.filter((res) => res.id !== reservationId);
      setReservations(filtered);
      localStorage.setItem("cafe_internet_reservations", JSON.stringify(filtered));

      // Delete from DB if found
      await db.reservations.delete(reservationId);

      // Restore slot in database
      const targetSession = sessions.find(s => s.id === targetReservation.sessionId);
      if (targetSession) {
        const nextSpots = Math.min(targetSession.totalSpots, targetSession.spotsLeft + 1);
        await db.sessions.update(targetReservation.sessionId, { spotsLeft: nextSpots });
      }

      await loadDynamicData();
    } catch (err) {
      console.error(err);
    }
  };

  // Safe window scrolling
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Simple query/proposal contact form submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(contactEmail)) {
      setContactError("Insira um endereço de e-mail válido.");
      return;
    }

    try {
      setContactError("");
      
      const ptDate = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      const ptTime = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });

      await db.feedback.create({
        name: contactName,
        email: contactEmail,
        message: contactMessage,
        timestamp: `${ptDate} às ${ptTime}`
      });

      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");

      // Automatically fade out success state after 5 seconds
      setTimeout(() => {
        setContactSuccess(false);
      }, 5000);
    } catch (err) {
      setContactError("Erro ao enviar mensagem. Tente novamente ou use os contatos diretos.");
    }
  };

  // Direct fast-play from hero or episode layout
  const handlePlayEpisode = (episode: PodcastEpisode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  // Get filtered sessions
  const filteredSessions = locationFilter === "Todos" 
    ? sessions 
    : sessions.filter((s) => s.location === locationFilter);

  // Available unique locations for filter bar
  const locationOptions = ["Todos", "Teia Centro Histórico", "Teia Vergueiro", "Teia Pinheiros"];

  return (
    <div className="min-h-screen bg-[#f9f9f9] pb-32 pt-20 flex flex-col font-sans selection:bg-[#FADADD] selection:text-[#620726]">
      
      {/* Header navigation bar */}
      <Header
        onScrollToSection={scrollToSection}
        reservationCount={reservations.length}
        onOpenMyReservations={() => setShowMyReservationsWindow(true)}
        onOpenAdmin={() => setShowAdminPortal(true)}
      />

      {/* Hero Section */}
      <header id="inicio" className="relative pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden bg-gradient-to-b from-[#FADADD]/15 via-transparent to-transparent">
        
        {/* Background visual graphics */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-10 left-10 w-60 h-60 bg-primary-container/5 rounded-full blur-2xl -z-10" />

        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Left Content Column */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-tint text-primary font-sans text-xs font-bold leading-none"
              >
                <Mic className="w-4 h-4 text-primary animate-pulse" />
                <span>PODCAST GRAVADO NO ESTÚDIO</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-on-surface tracking-tight leading-tight font-sans"
              >
                As melhores conversas sobre o <span className="text-primary-container">universo digital</span>.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans"
              >
                Acreditamos que as melhores conversas acontecem quando há escuta genuína, curiosidade de verdade e um bom café quente na mesa. Conectamos tecnologia, cultura e criatividade.
              </motion.p>

              {/* Action Buttons Row */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2"
              >
                <button
                  onClick={() => scrollToSection("gravacoes")}
                  className="w-full sm:w-auto bg-primary-container text-white px-8 py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transform hover:-translate-y-0.5 transition-all shadow-lg shadow-primary-container/20 cursor-pointer"
                >
                  Solicitar Gravação Gratuita
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => scrollToSection("episodios")}
                  className="w-full sm:w-auto bg-white border border-outline-variant/30 text-on-surface hover:text-[#a13b53] hover:border-primary/20 px-8 py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Ouvir Episódios Salvos
                </button>
              </motion.div>
            </div>

            {/* Hero Right Media Graphic Column */}
            <div className="lg:col-span-5 relative w-full max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative aspect-square rounded-[36px] overflow-hidden shadow-2xl bg-[#eeeeee] group"
              >
                <img
                  src="https://agencia.curtatche.com.br/podcast_episodio2.jpeg"
                  alt="Conversas sobre o universo digital"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Ambient vignette gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-90" />

                {/* Watermark style */}
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 text-white text-xs font-bold">
                  <Coffee className="w-4.5 h-4.5" />
                  <span>Espaço SampaCast</span>
                </div>
              </motion.div>

              {/* Float live widget */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -bottom-6 -left-4 md:-left-8 bg-white p-5 rounded-2xl shadow-xl z-20 flex items-center gap-4 border border-outline-variant/10 max-w-[280px]"
              >
                <button
                  onClick={() => handlePlayEpisode(episodes[0] || PODCAST_EPISODES[0])}
                  className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-md shadow-primary-container/20 flex-shrink-0"
                  title="Ouvir episódio mais recente"
                >
                  <Headphones className="w-5.5 h-5.5 text-white" />
                </button>
                <div>
                  <p className="font-semibold text-xs text-on-surface truncate pr-2">Estúdio SampaCast</p>
                  <p className="text-[10px] text-primary italic font-medium mt-0.5">Clique para ouvir amostra</p>
                  
                  {/* Dynamic sound wave */}
                  <div className="flex items-end gap-[1.5px] h-3.5 mt-1.5">
                    <span className={`w-0.5 bg-primary rounded-full h-1 ${isPlaying ? "wave-bar" : ""}`} style={{ animationDuration: "0.8s" }} />
                    <span className={`w-0.5 bg-primary rounded-full h-3 ${isPlaying ? "wave-bar" : ""}`} style={{ animationDuration: "1.1s", animationDelay: "0.15s" }} />
                    <span className={`w-0.5 bg-primary rounded-full h-1.5 ${isPlaying ? "wave-bar" : ""}`} style={{ animationDuration: "0.7s", animationDelay: "0.3s" }} />
                    <span className={`w-0.5 bg-primary rounded-full h-2.5 ${isPlaying ? "wave-bar" : ""}`} style={{ animationDuration: "1.0s", animationDelay: "0.1s" }} />
                    <span className={`w-0.5 bg-primary rounded-full h-1 ${isPlaying ? "wave-bar" : ""}`} style={{ animationDuration: "0.9s", animationDelay: "0.4s" }} />
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </header>

      {/* About Section */}
      <section id="sobre" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Host Avatar Illustration */}
            <div className="md:col-span-5 lg:col-span-4 flex justify-center">
              <div className="relative w-72 h-72 md:w-80 md:h-80">
                <div className="w-full h-full rounded-full overflow-hidden border-[6px] border-surface-tint shadow-xl bg-neutral-200">
                  <img
                    src="https://agencia.curtatche.com.br/eunice.jpg"
                    alt="Eunice Vargas Podcaster"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                </div>
                <div className="absolute bottom-4 right-4 bg-primary text-white px-4.5 py-1.5 rounded-xl font-semibold text-xs shadow-md border border-white/20">
                  Eunice Vargas
                </div>
              </div>
            </div>

            {/* About Text Content */}
            <div className="md:col-span-7 lg:col-span-8 space-y-6">
              <span className="text-2xs font-bold uppercase tracking-widest text-[#a13b53] bg-[#FADADD]/60 px-3.5 py-1 rounded-full">
                Host & Criadora de Conteúdo
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight font-sans">
                Bem-vindo ao Café com Internet
              </h2>
              <p className="text-base text-on-surface-variant leading-relaxed">
                Olá! É com enorme entusiasmo que convido você a participar da gravação do nosso podcast focado em <strong>tecnologia, transformação digital e as histórias reais</strong> que dão rosto e voz ao universo online.
              </p>
              <p className="text-sm text-ink-subtle leading-relaxed">
                Nosso estúdio possui infraestrutura profissional completa operada em parceria técnica com o SampaCast. Preparamos uma jornada sem burocracias para que você possa focar no que realmente importa: compartilhar insights, experiências e sua visão de mercado.
              </p>

              {/* Specific features cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                <div className="flex items-start gap-3.5 p-4 rounded-xl hover:bg-[#F8F8F8] transition-colors border border-transparent hover:border-neutral-100">
                  <div className="p-2.5 rounded-lg bg-primary/5 text-primary">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Participação Gratuita</h4>
                    <p className="text-xs text-ink-subtle mt-0.5">Sua pauta e presença gravadas sem custos operacionais.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-xl hover:bg-[#F8F8F8] transition-colors border border-transparent hover:border-neutral-100">
                  <div className="p-2.5 rounded-lg bg-primary/5 text-primary">
                    <Clapperboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Cortes Inteligentes</h4>
                    <p className="text-xs text-ink-subtle mt-0.5">Estética e edição de pequenos trechos para suas redes.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Booking Calendar Timeline Board Section */}
      <section id="gravacoes" className="py-20 md:py-24 bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-2xs font-extrabold uppercase tracking-widest text-[#a13b53] bg-[#FADADD]/40 px-3.5 py-1 rounded-full">
                Calendário Editorial
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-on-surface font-sans">
                Próximas Gravações
              </h2>
              <p className="text-sm text-on-surface-variant max-w-xl">
                Selecione um horário disponível para reservar sua slot de gravação com a equipe no mês de Junho 2026.
              </p>
            </div>

            {/* Filter buttons controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 bg-white/70 backdrop-blur p-1.5 rounded-xl border border-outline-variant/20 self-center md:self-end">
              {locationOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setLocationFilter(option)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    locationFilter === option
                      ? "bg-primary-container text-white shadow-xs"
                      : "text-secondary hover:text-primary hover:bg-neutral-50"
                  }`}
                >
                  {option.replace("Teia ", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Session Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredSessions.map((session, index) => {
                const isFull = session.spotsLeft === 0;
                
                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className={`ambient-card bg-white p-6 rounded-[24px] border ${
                      isFull ? "border-dashed border-neutral-300 opacity-75" : "border-outline-variant/10"
                    } flex flex-col justify-between group relative`}
                  >
                    <div>
                      {/* Day / Month Row */}
                      <div className="flex justify-between items-start mb-5">
                        <span className={`text-4xl font-black ${isFull ? "text-neutral-400" : "text-primary"}`}>
                          {session.day}
                        </span>
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          isFull 
                            ? "bg-neutral-100 text-neutral-500" 
                            : "bg-surface-tint/60 text-tertiary"
                        }`}>
                          {session.month}
                        </span>
                      </div>

                      {/* Studio Name Title */}
                      <h3 className="text-xl font-bold text-on-surface mb-2 font-sans">
                        {session.title}
                      </h3>

                      {/* Meta information tags */}
                      <div className="space-y-2 mt-3 mb-6 text-xs text-on-surface-variant font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>{session.timeStart} – {session.timeEnd}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span className="truncate" title={session.address}>
                            {session.address}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Booking indicators & CTA Row */}
                    <div className="border-t border-neutral-100 pt-4 mt-auto flex items-center justify-between gap-3">
                      <div>
                        {isFull ? (
                          <span className="text-xs text-red-500 font-bold">Vagas Esgotadas</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-extrabold block">
                            Apenas {session.spotsLeft} de {session.totalSpots} {session.spotsLeft === 1 ? "vaga" : "vagas"}!
                          </span>
                        )}
                        <span className="text-[10px] text-ink-subtle block">Auditório SampaCast</span>
                      </div>

                      <button
                        onClick={() => setSelectedSession(session)}
                        disabled={isFull}
                        className={`px-4.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                          isFull
                            ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                            : "bg-[#f9f9f9] text-primary border border-primary/20 hover:bg-primary-container hover:text-white hover:border-transparent group-hover:translate-x-1"
                        }`}
                      >
                        {isFull ? "Sem vagas" : "Reservar"}
                        {!isFull && <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredSessions.length === 0 && (
              <div className="col-span-full bg-white p-12 text-center rounded-3xl border border-dashed border-outline-variant/60">
                <p className="text-sm font-semibold text-on-surface">Nenhuma gravação no local selecionado.</p>
                <button
                  onClick={() => setLocationFilter("Todos")}
                  className="mt-3 text-xs font-bold text-primary underline"
                >
                  Ver todas as gravações disponíveis
                </button>
              </div>
            )}
          </div>

          {/* Quick Informational board summarizing alternative options */}
          <div className="bg-surface-tint/15 border border-primary/10 p-6 md:p-8 rounded-[28px] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-xs flex-shrink-0">
                <CalendarDays className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h4 className="text-md font-extrabold text-on-surface">Gostaria de datas alternativas?</h4>
                <p className="text-xs text-on-surface-variant max-w-lg mt-0.5 leading-relaxed">
                  Podemos flexibilizar horários personalizados em dias alternados sob demanda de grupos e patrocinadores. Fale diretamente com a Eunice!
                </p>
              </div>
            </div>

            <a
              href="https://api.whatsapp.com/send/?phone=5511994637159&text=Ol%C3%A1%20Eunice%2C%20gostaria%20de%20consultar%20outras%20datas%20de%20grava%C3%A7%C3%A3o%20para%20o%20Caf%C3%A9%20com%20Internet!"
              target="_blank"
              rel="noreferrer"
              className="w-full md:w-auto bg-primary text-white text-center px-8 py-3.5 rounded-xl font-bold text-xs shadow-xs hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Consultar Agenda Completa
            </a>
          </div>

        </div>
      </section>

      {/* Podcast Audio Stream Playback Section */}
      <section id="episodios" className="py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-12">
          
          <div className="text-center md:text-left space-y-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-[#a13b53] bg-[#FADADD]/60 px-3.5 py-1 rounded-full">
              Episódios Gravados
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-on-surface font-sans">
              Ouvir Amostras Públicas
            </h2>
            <p className="text-sm text-ink-subtle max-w-xl">
              Clique nos cards de episódios gravados abaixo para as escutar de forma 100% interativa com o reprodutor estéreo de voz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {episodes.map((episode) => {
              const isCurrent = currentEpisode ? episode.id === currentEpisode.id : false;
              
              return (
                <div
                  key={episode.id}
                  className={`ambient-card flex flex-col justify-between border rounded-[24px] overflow-hidden bg-white p-5 space-y-4 transition-all duration-300 ${
                    isCurrent ? "border-primary/30 bg-primary/[0.01]" : "border-outline-variant/10"
                  }`}
                >
                  <div className="space-y-3.5">
                    
                    {/* Cover graphic */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-[#eeeeee]">
                      <img
                        src={episode.coverImage}
                        alt={episode.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePlayEpisode(episode)}
                          className="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center transform scale-90 hover:scale-100 transition-all cursor-pointer"
                        >
                          <Headphones className="w-5.5 h-5.5 text-white" />
                        </button>
                      </div>
                      <span className="absolute bottom-2.5 right-2.5 bg-black/60 px-2.5 py-0.5 rounded-md text-white text-[10px] font-mono">
                        {episode.duration}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-ink-subtle font-semibold">
                      <span>{episode.publishDate}</span>
                      <span className="text-primary italic">Café com Internet</span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-bold text-sm text-on-surface font-sans line-clamp-1">
                        {episode.title}
                      </h3>
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {episode.description}
                      </p>
                    </div>

                  </div>

                  {/* Play & Info footer bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                    <div className="text-left">
                      <span className="block text-[10px] text-ink-subtle uppercase tracking-wider font-bold">Convidado</span>
                      <span className="block text-xs font-bold text-primary truncate max-w-[150px]">
                        {episode.guestName || "Eunice Vargas"}
                      </span>
                    </div>

                    <button
                      onClick={() => handlePlayEpisode(episode)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCurrent && isPlaying
                          ? "bg-primary-container text-white"
                          : "bg-surface-tint/20 text-primary hover:bg-[#a13b53] hover:text-white"
                      }`}
                    >
                      {isCurrent && isPlaying ? "Reproduzindo" : "Ouvir trecho"}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Locations Section */}
      <section id="estudios" className="py-20 md:py-24 bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-[#a13b53] bg-[#FADADD]/60 px-3.5 py-1 rounded-full">
              Infraestrutura SampaCast
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-on-surface font-sans">
              Nossos Estúdios
            </h2>
            <p className="text-sm text-ink-subtle max-w-xl mx-auto">
              Conheça a rede de ambientes de coworking integrados com equipamentos profissionais e confortáveis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {STUDIO_LOCATIONS.map((studio, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl overflow-hidden shadow-xs border border-outline-variant/10 flex flex-col group justify-between"
              >
                <div>
                  <div className="h-52 overflow-hidden bg-neutral-200 relative">
                    <img
                      src={studio.image}
                      alt={studio.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-[#a13b53] text-white text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-md">
                      São Paulo · SP
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <h3 className="text-lg font-bold text-on-surface font-sans">{studio.name}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {studio.description}
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100 flex items-center gap-1.5 text-xs text-ink-subtle">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="truncate">{studio.address}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Local Bookings Overview Panel sheet overlay */}
      <AnimatePresence>
        {showMyReservationsWindow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-end p-0"
            onClick={() => setShowMyReservationsWindow(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white h-full w-full max-w-xl shadow-2xl p-6 md:p-8 overflow-y-auto space-y-6 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-extrabold text-on-surface font-sans">
                      Seus Agendamentos
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowMyReservationsWindow(false)}
                    className="p-1 rounded-full text-secondary hover:bg-neutral-100 hover:text-primary transition-all cursor-pointer"
                  >
                    <Undo2 className="w-5.5 h-5.5" />
                  </button>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Abaixo estão exibidas as vagas de gravação que foram registradas neste navegador. Sinta-se à vontade para gerenciar ou solicitar nova pauta com Eunice no WhatsApp.
                </p>

                {/* List bookings or empty widget */}
                <MyReservations
                  reservations={reservations}
                  onCancelReservation={handleCancelReservation}
                />
              </div>

              <div className="pt-6 border-t border-neutral-100 space-y-4">
                <div className="flex items-center gap-2 text-[10px] text-ink-subtle bg-neutral-50 p-2.5 rounded-lg border">
                  <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>Seus dados continuam privados e salvos somente na máquina deste navegador web.</span>
                </div>
                
                <button
                  onClick={() => setShowMyReservationsWindow(false)}
                  className="w-full bg-on-surface text-white hover:bg-black py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Continuar Navegando
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call To Action Form Section */}
      <section className="py-20 bg-on-surface relative overflow-hidden">
        
        {/* Vector visuals */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 rounded-l-full blur-3xl -z-1" />

        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10 text-center space-y-10">
          
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white font-sans max-w-xl mx-auto">
              Pronto para tomar um café com Eunice Vargas?
            </h2>
            <p className="text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
              Não perca a chance de disseminar sua voz, projeto ou história no digital em um ambiente acolhedor e com suporte multimídia de corte e publicação.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left max-w-4xl mx-auto">
            
            {/* Quick Contacts cards column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/40 block">Dúvidas ou Pautas</span>
                <span className="text-sm font-bold text-white block">eunice@curtatche.com.br</span>
                <span className="text-[10.5px] text-white/60 block mt-1">Tempo médio de resposta: 2h</span>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl space-y-3 text-white">
                <span className="text-xs font-bold block text-primary-container flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[#e8728a]" /> Estúdio Central
                </span>
                <p className="text-xs text-white/80 leading-relaxed">
                  Dispomos de equipamentos profissionais de captação Shure, mesa de áudio digital integrável e monitoramento em tempo real.
                </p>
              </div>
            </div>

            {/* Quick Contact Form Proposal column */}
            <form onSubmit={handleContactSubmit} className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl space-y-4 border border-outline-variant/15 flex flex-col justify-between">
              <h3 className="font-bold text-sm text-on-surface border-b pb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Enviar Mensagem para a Produção
              </h3>

              {contactError && (
                <div className="bg-red-50 text-red-600 px-3.5 py-2 rounded-xl text-xs font-medium">
                  {contactError}
                </div>
              )}

              {contactSuccess && (
                <div className="bg-emerald-50 text-emerald-700 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5">
                  <Check className="w-4.5 h-4.5 text-emerald-500" />
                  <span>Sua mensagem foi enviada para Eunice! Entraremos em contato em breve.</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">Nome</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-neutral-400">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Seu Nome completo"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background-alt border border-outline-variant/50 focus:border-primary focus:bg-white outline-none rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1">E-mail</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-neutral-400">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="email"
                        placeholder="contato@exemplo.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background-alt border border-outline-variant/50 focus:border-primary focus:bg-white outline-none rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface mb-1">Mensagem ou Ideia de Pauta</label>
                  <textarea
                    rows={3}
                    placeholder="Conte-nos o que você gostaria de propor ou perguntar à Eunice"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full p-3 bg-background-alt border border-outline-variant/50 focus:border-primary focus:bg-white outline-none rounded-lg text-xs resize-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar Solicitação
                </button>
              </div>
            </form>

          </div>

          <div className="pt-6">
            <button
              onClick={() => scrollToSection("gravacoes")}
              className="text-white hover:text-[#e8728a] font-sans font-extrabold text-sm border-b border-transparent hover:border-primary-container pb-0.5 transition-all inline-flex items-center gap-1"
            >
              Visualizar Datas Agora
              <ArrowRight className="w-4 h-4 text-primary-container" />
            </button>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 py-10 px-6 md:px-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-outline-variant/20 gap-6 text-center md:text-left select-none">
        
        <div className="space-y-1">
          <span className="font-sans text-md font-bold text-on-surface">Café com Internet</span>
          <p className="text-xs text-ink-subtle">
            © 2026 Café com Internet. Digital insights & coffee vibes. Direitos reservados.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs text-secondary font-semibold">
          <a href="https://www.instagram.com/nicevargas.mkt/" target="_blank" rel="noreferrer" className="hover:text-[#a13b53] transition-colors flex items-center gap-1">
            <Instagram className="w-4 h-4 text-primary" />
            Instagram
          </a>
          <a href="https://www.youtube.com/@cafecominternet-podcast" target="_blank" rel="noreferrer" className="hover:text-[#a13b53] transition-colors flex items-center gap-1">
            <Youtube className="w-4 h-4 text-primary" />
            YouTube
          </a>
          <a href="https://www.tiktok.com/@cafecomintenert" target="_blank" rel="noreferrer" className="hover:text-[#a13b53] transition-colors flex items-center gap-1">
            <Music className="w-4 h-4 text-primary" />
            TikTok
          </a>
          <a href="https://www.facebook.com/Curtatche" target="_blank" rel="noreferrer" className="hover:text-[#a13b53] transition-colors flex items-center gap-1">
            <Facebook className="w-4 h-4 text-primary" />
            Facebook
          </a>
          <a href="https://www.linkedin.com/in/eunicevargasmkt/" target="_blank" rel="noreferrer" className="hover:text-[#a13b53] transition-colors flex items-center gap-1">
            <Linkedin className="w-4 h-4 text-primary" />
            LinkedIn
          </a>
          <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection("sobre"); }} className="hover:text-[#a13b53] transition-colors">
            Sobre o SampaCast
          </a>
        </div>
      </footer>

      {/* Floating active sound playback player */}
      <PodcastPlayer
        currentEpisode={currentEpisode || episodes[0] || null}
        isPlaying={isPlaying}
        onPlayPauseToggle={setIsPlaying}
        playlist={episodes.length > 0 ? episodes : PODCAST_EPISODES}
        onSelectEpisode={setCurrentEpisode}
      />

      {/* Seating booking dialog modal component */}
      {selectedSession && (
        <ReservationModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onConfirmReservation={handleConfirmReservation}
        />
      )}

      {/* Admin Control Portal Modal Component */}
      {showAdminPortal && (
        <AdminPortal
          onClose={() => setShowAdminPortal(false)}
          onDataChanged={loadDynamicData}
        />
      )}

    </div>
  );
}
