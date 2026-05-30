import React, { useState } from "react";
import { Coffee, Menu, X, Sparkles, CalendarCheck2, HeartHandshake, Lock, UserCheck } from "lucide-react";
import { db } from "../supabaseClient";

interface HeaderProps {
  onScrollToSection: (sectionId: string) => void;
  reservationCount: number;
  onOpenMyReservations: () => void;
  onOpenAdmin: () => void;
  onOpenCheckIn: () => void;
}

export default function Header({
  onScrollToSection,
  reservationCount,
  onOpenMyReservations,
  onOpenAdmin,
  onOpenCheckIn,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Início", id: "inicio" },
    { label: "Sobre", id: "sobre" },
    { label: "Episódios", id: "episodios" },
    { label: "Próximas Gravações", id: "gravacoes" },
    { label: "Estúdios", id: "estudios" },
  ];

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    onScrollToSection(id);
  };

  return (
    <nav className="fixed top-0 w-full z-40 glass-nav h-20 shadow-sm transition-all duration-300">
      <div className="flex justify-between items-center px-6 md:px-10 h-full max-w-7xl mx-auto">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => handleNavClick("inicio")}
          className="flex items-center cursor-pointer group py-1 animate-in fade-in duration-200"
        >
          <div className="h-16 w-16 md:h-24 md:w-24 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-[#000]/5 group-hover:scale-105 group-hover:rotate-1 md:translate-y-2.5 transition-all duration-300 bg-white p-1 border border-neutral-100/40">
            <img
              src="https://agencia.curtatche.com.br/icone_xicara_sf.png"
              alt="Café com Internet Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Desktop Navigation links */}
        <div className="hidden md:flex items-center gap-6 md:gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="font-sans text-sm font-semibold text-[#5f5e5e] hover:text-[#a13b53] transition-colors relative py-1.5 cursor-pointer"
            >
              {item.label}
            </button>
          ))}

          {/* Admin panel button */}
          <button
            onClick={onOpenAdmin}
            className="font-sans text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 border border-neutral-300/35 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            title="Acessar o Painel de Controle"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Painel Admin</span>
          </button>

          {/* Local Reservation list viewer button */}
          <button
            onClick={onOpenMyReservations}
            className="relative font-sans text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-4 py-2 border border-primary/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Minhas Reservas</span>
            {reservationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary-container text-white text-[9px] font-extrabold h-4.5 w-4.5 rounded-full flex items-center justify-center animate-pulse border border-white">
                {reservationCount}
              </span>
            )}
          </button>

          {/* Guest Digital Check-In / Image release button */}
          <button
            onClick={onOpenCheckIn}
            className="font-sans text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 border border-emerald-200 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            title="Saber mais sobre Check-In, direitos de imagem e termo"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Check-In Convidado</span>
          </button>

          {/* Quick confirmation CTA */}
          <a
            href="https://api.whatsapp.com/send/?phone=5511994637159"
            target="_blank"
            rel="noreferrer"
            className="bg-primary-container text-white px-5 py-2.5 rounded-full font-sans text-xs font-bold hover:scale-105 transition-all shadow-md shadow-primary-container/10 inline-flex items-center gap-1 cursor-pointer"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Confirmar Presença
          </a>
        </div>

        {/* Mobile Menu Icon */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={onOpenMyReservations}
            className="relative p-2 text-primary hover:bg-primary/5 rounded-full"
            aria-label="Minhas Reservas"
          >
            <CalendarCheck2 className="w-5 h-5" />
            {reservationCount > 0 && (
              <span className="absolute top-0 right-0 bg-primary-container text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                {reservationCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-primary cursor-pointer hover:bg-neutral-100 rounded-full"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white/95 backdrop-blur-md shadow-xl border-t border-neutral-100 flex flex-col p-6 gap-4 animate-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="text-left font-sans text-sm font-semibold text-[#1a1c1c] hover:text-[#a13b53] border-b border-neutral-50 pb-2 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3.5 pt-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="w-full text-center bg-neutral-100 text-neutral-700 text-xs font-bold py-3 px-4 border border-neutral-200 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-neutral-500" />
              <span>Painel Administrador</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCheckIn();
              }}
              className="w-full text-center bg-emerald-50 text-emerald-700 text-xs font-bold py-3 px-4 border border-emerald-200 rounded-full flex items-center justify-center gap-1.5 cursor-pointer font-sans"
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Check-In Convidado (Termo de Imagem)</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMyReservations();
              }}
              className="w-full text-center bg-primary/5 text-primary text-xs font-bold py-3 px-4 border border-outline-variant/30 rounded-full flex items-center justify-center gap-1.5"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>Minhas Reservas ({reservationCount})</span>
            </button>

            <a
              href="https://api.whatsapp.com/send/?phone=5511994637159"
              target="_blank"
              rel="noreferrer"
              className="w-full text-center bg-primary-container text-white text-xs font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 shadow-lg hover:opacity-90"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Confirmar Presença no WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
