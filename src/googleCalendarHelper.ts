/**
 * Google Calendar Helper for Client-Side Integration in React/Vite SPA.
 * Handles OAuth, ISO formatting, and REST API calls.
 */

const monthMap: Record<string, string> = {
  "janeiro": "01", "fevereiro": "02", "março": "03", "abril": "04",
  "maio": "05", "junho": "06", "julho": "07", "agosto": "08",
  "setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12",
  "jan": "01", "fev": "02", "mar": "03", "abr": "04", "mai": "05", "jun": "06",
  "jul": "07", "ago": "08", "set": "09", "out": "10", "nov": "11", "dez": "12"
};

/**
 * Format string day, month (name), year and time (HH:MM or HHhMM) into ISO string datetime.
 */
export function formatToISO(day: string, month: string, year: string, time: string): string {
  const cleanMonthName = month.trim().toLowerCase();
  const monthNum = monthMap[cleanMonthName] || "06"; // Default June
  const cleanDay = day.trim().padStart(2, '0');
  const cleanTime = time.trim().replace("h", ":");
  const formattedTime = cleanTime.length === 5 ? cleanTime : (cleanTime.length === 4 ? `0${cleanTime}` : cleanTime);
  return `${year}-${monthNum}-${cleanDay}T${formattedTime}:00`;
}

/**
 * Injects Google Identity Services client script dynamically if it doesn't exist yet.
 */
export function initGoogleGSI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }

    const id = "gsi-client-script";
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * Triggers Google identity service token client to get an access token.
 */
export function authenticateGoogleCalendar(clientId: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await initGoogleGSI();
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error("O script da API do Google não pôde ser ativado. Tente novamente em instantes."));
      return;
    }

    // Default Client ID fallback or placeholder check
    const cleanClientId = clientId?.trim() || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
    if (!cleanClientId) {
      reject(new Error("Google Client ID não configurado. Por favor, especifique o Google Client ID nas configurações de Secrets da plataforma ou na caixa de testes."));
      return;
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: cleanClientId,
        scope: "https://www.googleapis.com/auth/calendar.events",
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || "Autenticação falhou."));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error("Nenhum token de acesso foi retornado pelo Google."));
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}

export interface CalendarEventPayload {
  summary: string;
  location: string;
  description: string;
  status: "confirmed";
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees: Array<{ email: string; displayName: string }>;
}

/**
 * Creates an event in Google Calendar using the REST API and sends update notifications to all guests.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEventPayload
): Promise<any> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message || `Erro do Google Calendar API: ${response.statusText}`
    );
  }

  return response.json();
}
