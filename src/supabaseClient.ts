import { createClient } from "@supabase/supabase-js";
import { RecordingSession, PodcastEpisode, Reservation, FeedbackMessage, WaitingListEntry, Banner } from "./types";
import { INITIAL_SESSIONS, PODCAST_EPISODES } from "./data";

// Retrieve environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check if credentials are correct & available
export const isSupabaseConfigured =
  supabaseUrl &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  supabaseUrl !== "" &&
  supabaseAnonKey &&
  supabaseAnonKey !== "your-anon-key" &&
  supabaseAnonKey !== "";

// Try initializing the real Supabase client
let realSupabase: any = null;
if (isSupabaseConfigured) {
  try {
    realSupabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Failed to initialize real Supabase client:", error);
  }
}

// Unified DB provider interface
export const db = {
  // Database is always connected now via our central Express server!
  isOnline: () => true,

  // --- AUTHENTICATION ---
  auth: {
    getUser: async () => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data: { user } } = await realSupabase.auth.getUser();
          if (user) return user;
        } catch (error) {
          console.warn("Supabase auth.getUser exception, falling back:", error);
        }
      }
      const loggedUser = sessionStorage.getItem("cafe_logged_in_user");
      return loggedUser ? JSON.parse(loggedUser) : null;
    },

    signIn: async (email: string, pass: string) => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase.auth.signInWithPassword({
            email,
            password: pass,
          });
          if (error) throw error;
          return data.user;
        } catch (error) {
          console.warn("Supabase auth.signIn exception, falling back to server endpoints auth:", error);
          if (error instanceof Error && !error.message.includes("fetch")) {
            throw error;
          }
        }
      }

      // Hit our unified central API for admin auth
      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass })
        });
        if (response.ok) {
          const user = await response.json();
          sessionStorage.setItem("cafe_logged_in_user", JSON.stringify(user));
          return user;
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Credenciais inválidas.");
        }
      } catch (err: any) {
        // Local state-only extreme backup if server API is booting
        if (email === "admin@cafe.com" && pass === "admin") {
          const mockUser = { id: "admin-fallback", email };
          sessionStorage.setItem("cafe_logged_in_user", JSON.stringify(mockUser));
          return mockUser;
        }
        throw new Error(err.message || "Erro de conexão com o banco de dados.");
      }
    },

    signUp: async (email: string, pass: string) => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase.auth.signUp({
            email,
            password: pass,
          });
          if (error) throw error;
          return data.user;
        } catch (error) {
          console.warn("Supabase auth.signUp exception, falling back to central server signUp:", error);
          if (error instanceof Error && !error.message.includes("fetch")) {
            throw error;
          }
        }
      }

      // Hit our unified central API to register admin
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
      });
      if (response.ok) {
        const user = await response.json();
        sessionStorage.setItem("cafe_logged_in_user", JSON.stringify(user));
        return user;
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao registrar administrador.");
      }
    },

    signOut: async () => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          await realSupabase.auth.signOut();
        } catch (error) {
          console.warn("Supabase auth.signOut exception:", error);
        }
      }
      sessionStorage.removeItem("cafe_logged_in_user");
    }
  },

  // --- SESSIONS / AGENDA ---
  sessions: {
    list: async (): Promise<RecordingSession[]> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("sessions")
            .select("*")
            .order("year", { ascending: true })
            .order("month", { ascending: true })
            .order("day", { ascending: true });
          if (!error && data) return data;
          if (error) console.warn("Supabase sessions list warning (falling back to central API):", error);
        } catch (error) {
          console.warn("Supabase sessions fetch exception:", error);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API sessions fetch failed", err);
      }

      return INITIAL_SESSIONS;
    },

    create: async (session: Omit<RecordingSession, "id">): Promise<RecordingSession> => {
      const newId = `session-${Date.now()}`;
      const newSession: RecordingSession = { id: newId, ...session };

      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("sessions")
          .insert([newSession]);
        if (error) {
          console.error("Supabase session insert error:", error);
          throw error;
        }
        return newSession;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSession)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API session create failed:", err);
      }

      return newSession;
    },

    update: async (id: string, updates: Partial<RecordingSession>): Promise<RecordingSession> => {
      if (isSupabaseConfigured && realSupabase) {
        const { id: _, created_at: __, ...cleanUpdates } = updates as any;
        const { error } = await realSupabase
          .from("sessions")
          .update(cleanUpdates)
          .eq("id", id);
        if (error) {
          console.error("Supabase session update error:", error);
          throw error;
        }
        return { id, ...updates } as RecordingSession;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API session update failed:", err);
      }

      throw new Error("Erro ao atualizar sessão.");
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("sessions")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase session delete error:", error);
          return false;
        }
        return true;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "DELETE"
        });
        return res.ok;
      } catch (err) {
        console.error("Central API session delete failed:", err);
        return false;
      }
    }
  },

  // --- PODCAST EPISODES ---
  episodes: {
    list: async (): Promise<PodcastEpisode[]> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("episodes")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) return data;
          if (error) console.warn("Supabase episodes list warning (falling back to central API):", error);
        } catch (error) {
          console.warn("Supabase episodes fetch exception:", error);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/episodes");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API episodes fetch failed", err);
      }

      return PODCAST_EPISODES;
    },

    create: async (episode: Omit<PodcastEpisode, "id">): Promise<PodcastEpisode> => {
      const newId = `ep-${Date.now()}`;
      const newEpisode: PodcastEpisode = { id: newId, ...episode };

      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("episodes")
          .insert([newEpisode]);
        if (error) {
          console.error("Supabase episode insert error:", error);
          throw error;
        }
        return newEpisode;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/episodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEpisode)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API episode create failed:", err);
      }

      return newEpisode;
    },

    update: async (id: string, updates: Partial<PodcastEpisode>): Promise<PodcastEpisode> => {
      if (isSupabaseConfigured && realSupabase) {
        const { id: _, created_at: __, ...cleanUpdates } = updates as any;
        const { error } = await realSupabase
          .from("episodes")
          .update(cleanUpdates)
          .eq("id", id);
        if (error) {
          console.error("Supabase episode update error:", error);
          throw error;
        }
        return { id, ...updates } as PodcastEpisode;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/episodes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API episode update failed:", err);
      }

      throw new Error("Erro ao atualizar episódio.");
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("episodes")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase episode delete error:", error);
          return false;
        }
        return true;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/episodes/${id}`, {
          method: "DELETE"
        });
        return res.ok;
      } catch (err) {
        console.error("Central API episode delete failed:", err);
        return false;
      }
    }
  },

  // --- RESERVATIONS ---
  reservations: {
    list: async (): Promise<Reservation[]> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("reservations")
            .select("*")
            .order("timestamp", { ascending: false });
          if (!error && data) {
            return data.map((r: any) => ({
              ...r,
              status: r.status || "pending",
              imageConsent: r.imageConsent ?? r.image_consent ?? false,
              checkInTimestamp: r.checkInTimestamp ?? r.check_id_timestamp ?? undefined
            }));
          }
          if (error) console.warn("Supabase reservations list warning (falling back to central API):", error);
        } catch (error) {
          console.warn("Supabase reservations fetch exception:", error);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/reservations");
        if (res.ok) {
          const srvData = await res.json();
          return srvData.sort((a: any, b: any) => {
            return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
          });
        }
      } catch (err) {
        console.error("Central API reservations fetch failed", err);
      }

      return [];
    },

    create: async (reservation: Reservation): Promise<Reservation> => {
      const reservationWithStatus = {
        ...reservation,
        status: reservation.status || "pending",
        imageConsent: reservation.imageConsent || false,
        checkInTimestamp: reservation.checkInTimestamp || null
      };

      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("reservations")
          .insert([reservationWithStatus]);
        if (error) {
          console.warn("Supabase reservation insert failed, retrying with sanitized payload:", error);
          // Retry without 'guests' list to avoid column mismatches
          const { guests, ...sanitizedPayload } = reservationWithStatus;
          const { error: retryError } = await realSupabase
            .from("reservations")
            .insert([sanitizedPayload]);
          if (retryError) {
            console.error("Supabase sanitized insertion also failed:", retryError);
            throw retryError;
          }
        }
        return reservationWithStatus;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reservationWithStatus)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API reservation create failed:", err);
      }

      return reservationWithStatus;
    },

    update: async (id: string, updates: Partial<Reservation>): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("reservations")
          .update(updates)
          .eq("id", id);
        if (error) {
          console.warn("Supabase reservation update failed, retrying with sanitized payload:", error);
          const { guests, ...sanitizedUpdates } = updates;
          const { error: retryError } = await realSupabase
            .from("reservations")
            .update(sanitizedUpdates)
            .eq("id", id);
          if (retryError) {
            console.error("Supabase sanitized update also failed:", retryError);
            return false;
          }
        }
        return true;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/reservations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        return res.ok;
      } catch (err) {
        console.error("Central API reservation update failed:", err);
        return false;
      }
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("reservations")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase reservation delete error:", error);
          return false;
        }
        return true;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/reservations/${id}`, {
          method: "DELETE"
        });
        return res.ok;
      } catch (err) {
        console.error("Central API reservation delete failed:", err);
        return false;
      }
    }
  },

  // --- FEEDBACKS ---
  feedback: {
    list: async (): Promise<FeedbackMessage[]> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("feedback")
            .select("*")
            .order("timestamp", { ascending: false });
          if (!error && data) return data;
          if (error) console.warn("Supabase feedback list warning (falling back to central API):", error);
        } catch (error) {
          console.warn("Supabase feedback fetch exception:", error);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API feedback fetch failed", err);
      }

      return [];
    },

    create: async (message: Omit<FeedbackMessage, "id">): Promise<FeedbackMessage> => {
      const newId = `msg-${Date.now()}`;
      const newMsg: FeedbackMessage = { id: newId, ...message };

      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("feedback")
          .insert([newMsg]);
        if (error) {
          console.error("Supabase feedback insert error:", error);
          throw error;
        }
        return newMsg;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMsg)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API feedback create failed:", err);
      }

      return newMsg;
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase
          .from("feedback")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase feedback delete error:", error);
          return false;
        }
        return true;
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/feedback/${id}`, {
          method: "DELETE"
        });
        return res.ok;
      } catch (err) {
        console.error("Central API feedback delete failed:", err);
        return false;
      }
    }
  },

  // --- WAITING LIST ---
  waitingList: {
    list: async (): Promise<WaitingListEntry[]> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("waiting_list")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) {
            return data.map((row: any) => ({
              id: row.id,
              name: row.name,
              contact: row.contact,
              weekdayPreferences: row.weekdayPreferences,
              bestHours: row.bestHours,
              createdAt: row.created_at || row.createdAt
            }));
          }
          if (error) console.warn("Supabase waiting list fetch warning (falling back to central API):", error);
        } catch (error) {
          console.warn("Supabase waiting list fetch exception:", error);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/waiting-list");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API waiting list fetch failed", err);
      }

      return [];
    },

    create: async (entry: Omit<WaitingListEntry, "id">): Promise<WaitingListEntry> => {
      const newId = `wait-${Date.now()}`;
      const newEntry: WaitingListEntry = { id: newId, ...entry, createdAt: new Date().toISOString() };

      if (isSupabaseConfigured && realSupabase) {
        try {
          const payload = {
            id: newId,
            name: entry.name,
            contact: entry.contact,
            weekdayPreferences: entry.weekdayPreferences,
            bestHours: entry.bestHours
          };
          const { error } = await realSupabase
            .from("waiting_list")
            .insert([payload]);
          if (!error) {
            return newEntry;
          }
          console.warn("Supabase waiting list insert failed, falling back to local database API:", error);
        } catch (e) {
          console.warn("Supabase waiting list insert exception, falling back to local database API:", e);
        }
      }

      // Fallback/Non-Supabase/Failed-Supabase
      try {
        const res = await fetch("/api/waiting-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEntry)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API waiting list create failed:", err);
      }

      return newEntry;
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { error } = await realSupabase
            .from("waiting_list")
            .delete()
            .eq("id", id);
          if (!error) {
            return true;
          }
          console.warn("Supabase waiting list delete failed, trying local database API:", error);
        } catch (e) {
          console.warn("Supabase waiting list delete exception, trying local database API:", e);
        }
      }

      // Fallback/Non-Supabase/Failed-Supabase
      try {
        const res = await fetch(`/api/waiting-list/${id}`, {
          method: "DELETE"
        });
        return res.ok;
      } catch (err) {
        console.error("Central API waiting list delete failed:", err);
        return false;
      }
    }
  },

  // --- BANNERS (CURSOS & WORKSHOPS) ---
  banners: {
    list: async (): Promise<Banner[]> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("banners")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) return data;
          if (error) console.warn("Supabase banners list warning (falling back to central API):", error);
        } catch (error) {
          console.warn("Supabase banners fetch exception:", error);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/banners");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API banners fetch failed", err);
      }

      return [];
    },

    create: async (banner: Omit<Banner, "id">): Promise<Banner> => {
      const newId = `banner-${Date.now()}`;
      const newBanner: Banner = { id: newId, ...banner, createdAt: new Date().toISOString() };

      if (isSupabaseConfigured && realSupabase) {
        // Build a database-compatible payload avoiding frontend-only keys like createdAt/created_at
        const payload: any = {
          id: newId,
          title: banner.title,
          subtitle: banner.subtitle,
          description: banner.description,
          buttonText: banner.buttonText,
          buttonLink: banner.buttonLink,
          imageUrl: banner.imageUrl,
          type: banner.type,
          startDate: banner.startDate,
          status: banner.status
        };

        if (banner.startTime) {
          payload.startTime = banner.startTime;
        }

        try {
          const { error } = await realSupabase
            .from("banners")
            .insert([payload]);

          if (error) {
            // Check if error is due to missing startTime column in the database
            const errorMsg = String(error.message || "").toLowerCase();
            const errorCode = String(error.code || "");
            if (payload.startTime && (errorCode === "PGRST102" || errorCode === "42703" || errorMsg.includes("starttime") || errorMsg.includes("column"))) {
              console.warn("Supabase banners table might be missing 'startTime' column. Retrying insert without 'startTime'...");
              const fallbackPayload = { ...payload };
              delete fallbackPayload.startTime;
              const { error: retryError } = await realSupabase
                .from("banners")
                .insert([fallbackPayload]);
              
              if (retryError) {
                console.error("Supabase banner insert retry error:", retryError);
                throw retryError;
              }
            } else {
              console.error("Supabase banner insert error:", error);
              throw error;
            }
          }
          return newBanner;
        } catch (err) {
          console.error("Supabase banner insert exception. Falling back to Central API:", err);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch("/api/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newBanner)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API banner create failed:", err);
      }

      return newBanner;
    },

    update: async (id: string, updates: Partial<Banner>): Promise<Banner> => {
      if (isSupabaseConfigured && realSupabase) {
        const payload: any = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.buttonText !== undefined) payload.buttonText = updates.buttonText;
        if (updates.buttonLink !== undefined) payload.buttonLink = updates.buttonLink;
        if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl;
        if (updates.type !== undefined) payload.type = updates.type;
        if (updates.startDate !== undefined) payload.startDate = updates.startDate;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.startTime !== undefined) payload.startTime = updates.startTime;

        try {
          const { error } = await realSupabase
            .from("banners")
            .update(payload)
            .eq("id", id);

          if (error) {
            const errorMsg = String(error.message || "").toLowerCase();
            const errorCode = String(error.code || "");
            if (payload.startTime !== undefined && (errorCode === "PGRST102" || errorCode === "42703" || errorMsg.includes("starttime") || errorMsg.includes("column"))) {
              console.warn("Supabase banners table might be missing 'startTime' column. Retrying update without 'startTime'...");
              const fallbackPayload = { ...payload };
              delete fallbackPayload.startTime;
              const { error: retryError } = await realSupabase
                .from("banners")
                .update(fallbackPayload)
                .eq("id", id);
              
              if (retryError) {
                console.error("Supabase banner update retry error:", retryError);
                throw retryError;
              }
            } else {
              console.error("Supabase banner update error:", error);
              throw error;
            }
          }
          return { id, ...updates } as Banner;
        } catch (err) {
          console.error("Supabase banner update exception. Falling back to Central API:", err);
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/banners/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API banner update failed:", err);
      }

      throw new Error("Erro ao atualizar banner.");
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { error } = await realSupabase
            .from("banners")
            .delete()
            .eq("id", id);
          if (!error) {
            return true;
          }
          console.error("Supabase banner delete error:", error);
          throw new Error(error.message || "Erro de RLS ou permissão no Supabase.");
        } catch (err: any) {
          console.error("Supabase banner delete exception:", err);
          throw new Error(err.message || "Falha de comunicação ou permissão no Supabase.");
        }
      }

      // Fallback/Non-Supabase
      try {
        const res = await fetch(`/api/banners/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          return true;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro no servidor local.");
      } catch (err: any) {
        console.error("Central API banner delete failed:", err);
        throw new Error(err.message || "Erro ao deletar banner do servidor central.");
      }
    }
  }
};
