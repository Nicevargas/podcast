import React from "react";
import { Calendar, Clock, MapPin, Trash2, Smile, AlertCircle } from "lucide-react";
import { Reservation } from "../types";

interface MyReservationsProps {
  reservations: Reservation[];
  onCancelReservation: (reservationId: string) => void;
}

export default function MyReservations({
  reservations,
  onCancelReservation,
}: MyReservationsProps) {
  if (reservations.length === 0) {
    return (
      <div className="bg-[#F8F8F8] border border-dashed border-outline-variant/60 rounded-2xl p-8 text-center space-y-3.5 max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mx-auto text-on-secondary-container">
          <Smile className="w-5.5 h-5.5 text-secondary" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-on-surface">Nenhuma Gravação Agendada</h4>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
            Você ainda não agendou pautas para Junho 2026. Escolha uma data de gravação de sua preferência acima!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-[#a13b53] justify-center md:justify-start">
        <AlertCircle className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Você possui {reservations.length} {reservations.length === 1 ? "vaga reservada" : "vagas reservadas"} localmente neste navegador
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reservations.map((res) => (
          <div
            key={res.id}
            className="bg-white border border-primary/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start gap-2">
                <span className="bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full select-none">
                  Inscrito
                </span>
                <span className="text-[10px] font-mono text-ink-subtle">
                  Ref: {res.id.toUpperCase()}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-on-surface mb-1">
                  {res.sessionTitle}
                </h4>
                <p className="text-xs font-medium text-secondary truncate">
                  Participante: {res.name}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-on-surface-variant pt-2 border-t border-secondary/5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>{res.sessionDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{res.sessionTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary animate-bounce" />
                  <span className="truncate">{res.address}</span>
                </div>
              </div>

              {res.topic && (
                <div className="bg-neutral-50 px-3 py-2 rounded-lg text-xs leading-relaxed text-secondary border border-neutral-100">
                  <span className="font-bold text-primary">Tema proposto:</span> "{res.topic}"
                </div>
              )}
            </div>

            {/* Cancel Trigger */}
            <div className="pt-4 mt-2 flex justify-between items-center border-t border-neutral-100">
              <a
                href={`https://api.whatsapp.com/send/?phone=5511994637159&text=${encodeURIComponent(`Olá Eunice! Gostaria de falar sobre a minha pauta agendada no dia ${res.sessionDate}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Chamar Produção
              </a>
              <button
                onClick={() => onCancelReservation(res.id)}
                className="text-xs text-red-500 hover:text-red-700 font-semibold inline-flex items-center gap-1 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors cursor-pointer"
                title="Desistir da reserva"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Desistir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
