import React, { useState } from "react";
import { X, CheckCircle2, Calendar, Clock, User, Phone, Sparkles } from "lucide-react";
import { WaitingListEntry } from "../types";
import { db } from "../supabaseClient";

interface WaitingListModalProps {
  onClose: () => void;
  onSuccess: (entry: WaitingListEntry) => void;
}

export default function WaitingListModal({ onClose, onSuccess }: WaitingListModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedHours, setSelectedHours] = useState<string[]>([]);
  const [customHourText, setCustomHourText] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const weekdays = [
    { id: "seg", label: "Segunda-feira" },
    { id: "ter", label: "Terça-feira" },
    { id: "qua", label: "Quarta-feira" },
    { id: "qui", label: "Quinta-feira" },
    { id: "sex", label: "Sexta-feira" },
  ];

  const timeSlots = [
    { id: "h1", label: "9:00 – 11:00" },
    { id: "h2", label: "11:00 – 13:00" },
    { id: "h3", label: "13:00 – 15:00" },
    { id: "h4", label: "15:00 – 17:00" },
  ];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const toggleHour = (hour: string) => {
    if (selectedHours.includes(hour)) {
      setSelectedHours(selectedHours.filter((h) => h !== hour));
    } else {
      setSelectedHours([...selectedHours, hour]);
    }
  };

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.name.trim()) tempErrors.name = "Nome é obrigatório.";
    if (!formData.contact.trim()) tempErrors.contact = "Contato é obrigatório.";
    if (selectedDays.length === 0) {
      tempErrors.days = "Selecione pelo menos um dia da semana de sua preferência.";
    }
    if (selectedHours.length === 0 && !customHourText.trim()) {
      tempErrors.hours = "Selecione ou insira um horário de preferência entre as 9:00 e 17:00.";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const weekdayPreferences = selectedDays.join(", ");
      
      const hourParts = [...selectedHours];
      if (customHourText.trim()) {
        hourParts.push(customHourText.trim());
      }
      const bestHours = hourParts.join(", ");

      const result = await db.waitingList.create({
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        weekdayPreferences,
        bestHours,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(result);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error("Erro ao registrar na lista de espera:", err);
      setErrors({ submit: "Erro ao registrar. Por favor, tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-md">
      <div className="relative bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-neutral-100 flex flex-col md:max-h-[90vh]">
        
        {/* Header decoration banner */}
        <div className="bg-gradient-to-r from-primary to-[#a13b53] text-white p-6 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 p-2 rounded-xl hover:scale-105 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span className="text-[10px] font-black tracking-widest uppercase text-amber-200">OPÇÃO FLEXÍVEL</span>
          </div>
          <h3 className="text-xl font-black font-sans leading-tight">Lista de Espera</h3>
          <p className="text-xs text-white/80 mt-1">
            Inscreva-se se as datas atuais não funcionam ou estão esgotadas. Notificaremos você assim que abrirmos novos slots!
          </p>
        </div>

        {/* Modal body Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {isSuccess ? (
            <div className="py-12 text-center space-y-4 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 scale-110 animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-extrabold text-neutral-800">Inscrição Confirmada!</h4>
              <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
                Você acaba de entrar oficialmente na nossa lista de espera. A host <strong>Eunice Vargas</strong> entrará em contato para agendar o seu episódio piloto.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Name field */}
              <div className="space-y-1">
                <label className="text-2xs font-extrabold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome ou nome do convidado"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary/50 focus:bg-white rounded-2xl px-4 py-3 text-xs text-neutral-800 outline-none transition-colors placeholder:text-neutral-400"
                />
                {errors.name && <p className="text-[11px] text-red-500 font-bold">{errors.name}</p>}
              </div>

              {/* Contact field */}
              <div className="space-y-1">
                <label className="text-2xs font-extrabold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  Contato (Telefone, WhatsApp ou E-mail)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: (11) 99999-9999 ou seu@email.com"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary/50 focus:bg-white rounded-2xl px-4 py-3 text-xs text-neutral-800 outline-none transition-colors placeholder:text-neutral-400"
                />
                {errors.contact && <p className="text-[11px] text-red-500 font-bold">{errors.contact}</p>}
              </div>

              {/* Weekdays Preferences Checklist (No Sat/Sun) */}
              <div className="space-y-2">
                <label className="text-2xs font-extrabold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Preferência de Dias da Semana (Segunda a Sexta)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {weekdays.map((day) => {
                    const isSelected = selectedDays.includes(day.label);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.label)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-primary text-white border-transparent shadow-xs"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                {errors.days && <p className="text-[11px] text-red-500 font-bold">{errors.days}</p>}
              </div>

              {/* Day slot hours range (9:00 - 17:00) */}
              <div className="space-y-2">
                <label className="text-2xs font-extrabold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Melhores Horários (Entre as 9:00 e 17:00)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedHours.includes(slot.label);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => toggleHour(slot.label)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border ${
                          isSelected
                            ? "bg-[#fff7ed] text-amber-900 border-amber-300"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5">
                  <input
                    type="text"
                    placeholder="Outro horário específico? Escreva aqui (ex: 10:15 às 11:30)"
                    value={customHourText}
                    onChange={(e) => setCustomHourText(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary/50 focus:bg-white rounded-2xl px-4 py-2.5 text-xs text-neutral-800 outline-none transition-colors placeholder:text-neutral-400"
                  />
                  <p className="text-[10px] text-neutral-400 font-medium mt-1 leading-relaxed">
                    *Por regra, as salas operam apenas nos horários de funcionamento (09h00 às 17h00).
                  </p>
                </div>
                {errors.hours && <p className="text-[11px] text-red-500 font-bold">{errors.hours}</p>}
              </div>

              {/* Submit / Action buttons */}
              <div className="pt-3 border-t border-neutral-100 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs px-4 py-3.5 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-primary to-[#a13b53] hover:from-[#a13b53] hover:to-primary text-white text-xs px-4 py-3.5 rounded-xl font-bold transition-all shadow-md hover:scale-[1.01] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Registrando..." : "Confirmar Inscrição"}
                </button>
              </div>

              {errors.submit && <p className="text-[11px] text-red-500 font-bold text-center mt-2">{errors.submit}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
