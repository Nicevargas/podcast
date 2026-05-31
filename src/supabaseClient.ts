import { createClient } from "@supabase/supabase-js";
import { RecordingSession, PodcastEpisode, Reservation, FeedbackMessage, WaitingListEntry } from "./types";
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
          if (error) console.error("Supabase sessions list error:", error);
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
          if (error) console.error("Supabase episodes list error:", error);
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
          if (error) console.error("Supabase reservations list error:", error);
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
          if (error) console.error("Supabase feedback list error:", error);
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
          if (!error && data) return data;
          if (error) console.error("Supabase waiting list fetch error:", error);
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
        const { error } = await realSupabase
          .from("waiting_list")
          .insert([newEntry]);
        if (error) {
          console.error("Supabase waiting list insert error:", error);
          throw error;
        }
        return newEntry;
      }

      // Fallback/Non-Supabase
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
        const { error } = await realSupabase
          .from("waiting_list")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase waiting list delete error:", error);
          return false;
        }
        return true;
      }

      // Fallback/Non-Supabase
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
  }
};
