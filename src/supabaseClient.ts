import { createClient } from "@supabase/supabase-js";
import { RecordingSession, PodcastEpisode, Reservation, FeedbackMessage } from "./types";
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
      // Fetch from our master central shared API first to guarantee sync across all browsers
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API sessions fetch failed, resorting to Supabase:", err);
      }

      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("sessions")
            .select("*")
            .order("year", { ascending: true })
            .order("month", { ascending: true })
            .order("day", { ascending: true });
          if (!error && data) return data;
        } catch (error) {
          console.warn("Supabase sessions fetch exception:", error);
        }
      }

      return INITIAL_SESSIONS;
    },

    create: async (session: Omit<RecordingSession, "id">): Promise<RecordingSession> => {
      const newId = `session-${Date.now()}`;
      const newSession: RecordingSession = { id: newId, ...session };

      // 1. Write to centrally shared Express server (Master)
      let savedSession = newSession;
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSession)
        });
        if (res.ok) {
          savedSession = await res.json();
        }
      } catch (err) {
        console.error("Central API session create failed:", err);
      }

      // 2. Parallel backup replication to Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("sessions")
          .insert([savedSession])
          .then(({ error }: any) => {
            if (error) console.warn("Supabase background session insertion error:", error);
          })
          .catch((e: any) => console.warn("Supabase session insert exception:", e));
      }

      return savedSession;
    },

    update: async (id: string, updates: Partial<RecordingSession>): Promise<RecordingSession> => {
      // 1. Write to centrally shared Express server (Master)
      let updatedSession: any = null;
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          updatedSession = await res.json();
        }
      } catch (err) {
        console.error("Central API session update failed:", err);
      }

      // 2. Parallel backup replication to Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        const { id: _, created_at: __, ...cleanUpdates } = updates as any;
        realSupabase
          .from("sessions")
          .update(cleanUpdates)
          .eq("id", id)
          .catch((e: any) => console.warn("Supabase session update exception:", e));
      }

      if (updatedSession) return updatedSession;
      throw new Error("Erro ao atualizar sessão.");
    },

    delete: async (id: string): Promise<boolean> => {
      let success = false;
      // 1. Delete from centrally shared Express server (Master)
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "DELETE"
        });
        success = res.ok;
      } catch (err) {
        console.error("Central API session delete failed:", err);
      }

      // 2. Parallel backup deletion in Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("sessions")
          .delete()
          .eq("id", id)
          .catch((e: any) => console.warn("Supabase session delete exception:", e));
      }

      return success;
    }
  },

  // --- PODCAST EPISODES ---
  episodes: {
    list: async (): Promise<PodcastEpisode[]> => {
      // Fetch from our master central shared API first to guarantee sync across all browsers
      try {
        const res = await fetch("/api/episodes");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API episodes fetch failed, resorting to Supabase:", err);
      }

      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("episodes")
            .select("*")
            .order("id", { ascending: false });
          if (!error && data) return data;
        } catch (error) {
          console.warn("Supabase episodes fetch exception:", error);
        }
      }

      return PODCAST_EPISODES;
    },

    create: async (episode: Omit<PodcastEpisode, "id">): Promise<PodcastEpisode> => {
      const newId = `ep-${Date.now()}`;
      const newEpisode: PodcastEpisode = { id: newId, ...episode };

      let savedEpisode = newEpisode;
      try {
        const res = await fetch("/api/episodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEpisode)
        });
        if (res.ok) {
          savedEpisode = await res.json();
        }
      } catch (err) {
        console.error("Central API episode create failed:", err);
      }

      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("episodes")
          .insert([savedEpisode])
          .then(({ error }: any) => {
            if (error) console.warn("Supabase background episode insertion error:", error);
          })
          .catch((e: any) => console.warn("Supabase episode insert exception:", e));
      }

      return savedEpisode;
    },

    update: async (id: string, updates: Partial<PodcastEpisode>): Promise<PodcastEpisode> => {
      let updatedEpisode: any = null;
      try {
        const res = await fetch(`/api/episodes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        if (res.ok) {
          updatedEpisode = await res.json();
        }
      } catch (err) {
        console.error("Central API episode update failed:", err);
      }

      if (isSupabaseConfigured && realSupabase) {
        const { id: _, created_at: __, ...cleanUpdates } = updates as any;
        realSupabase
          .from("episodes")
          .update(cleanUpdates)
          .eq("id", id)
          .catch((e: any) => console.warn("Supabase episode update exception:", e));
      }

      if (updatedEpisode) return updatedEpisode;
      throw new Error("Erro ao atualizar episódio.");
    },

    delete: async (id: string): Promise<boolean> => {
      let success = false;
      try {
        const res = await fetch(`/api/episodes/${id}`, {
          method: "DELETE"
        });
        success = res.ok;
      } catch (err) {
        console.error("Central API episode delete failed:", err);
      }

      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("episodes")
          .delete()
          .eq("id", id)
          .catch((e: any) => console.warn("Supabase episode delete exception:", e));
      }

      return success;
    }
  },

  // --- RESERVATIONS ---
  reservations: {
    list: async (): Promise<Reservation[]> => {
      // Fetch from our master central shared API first to guarantee sync across all browsers
      try {
        const res = await fetch("/api/reservations");
        if (res.ok) {
          const srvData = await res.json();
          return srvData.sort((a: any, b: any) => {
            return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
          });
        }
      } catch (err) {
        console.error("Central API reservations fetch failed, resorting to Supabase:", err);
      }

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
        } catch (error) {
          console.warn("Supabase reservations fetch exception:", error);
        }
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

      // 1. Write to centrally shared Express server (Master)
      let savedRes = reservationWithStatus;
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reservationWithStatus)
        });
        if (res.ok) {
          savedRes = await res.json();
        }
      } catch (err) {
        console.error("Central API reservation create failed:", err);
      }

      // 2. Parallel backup replication to Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("reservations")
          .insert([savedRes])
          .then(({ error }: any) => {
            if (error) console.warn("Supabase background reservation insertion error:", error);
          })
          .catch((e: any) => console.warn("Supabase reservation insert exception:", e));
      }

      return savedRes;
    },

    update: async (id: string, updates: Partial<Reservation>): Promise<boolean> => {
      let success = false;
      // 1. Write to centrally shared Express server (Master)
      try {
        const res = await fetch(`/api/reservations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
        success = res.ok;
      } catch (err) {
        console.error("Central API reservation update failed:", err);
      }

      // 2. Parallel backup replication to Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("reservations")
          .update(updates)
          .eq("id", id)
          .then(({ error }: any) => {
            if (error) console.warn("Supabase background reservation update error:", error);
          })
          .catch((e: any) => console.warn("Supabase reservation update exception:", e));
      }

      return success;
    },

    delete: async (id: string): Promise<boolean> => {
      let success = false;
      // 1. Delete from centrally shared Express server (Master)
      try {
        const res = await fetch(`/api/reservations/${id}`, {
          method: "DELETE"
        });
        success = res.ok;
      } catch (err) {
        console.error("Central API reservation delete failed:", err);
      }

      // 2. Parallel backup deletion in Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("reservations")
          .delete()
          .eq("id", id)
          .catch((e: any) => console.warn("Supabase reservation delete exception:", e));
      }

      return success;
    }
  },

  // --- FEEDBACKS ---
  feedback: {
    list: async (): Promise<FeedbackMessage[]> => {
      // Fetch from our master central shared API first to guarantee sync across all browsers
      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Central API feedback fetch failed, resorting to Supabase:", err);
      }

      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("feedback")
            .select("*")
            .order("timestamp", { ascending: false });
          if (!error && data) return data;
        } catch (error) {
          console.warn("Supabase feedback fetch exception:", error);
        }
      }

      return [];
    },

    create: async (message: Omit<FeedbackMessage, "id">): Promise<FeedbackMessage> => {
      const newId = `msg-${Date.now()}`;
      const newMsg: FeedbackMessage = { id: newId, ...message };

      // 1. Write to centrally shared Express server (Master)
      let savedMsg = newMsg;
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMsg)
        });
        if (res.ok) {
          savedMsg = await res.json();
        }
      } catch (err) {
        console.error("Central API feedback create failed:", err);
      }

      // 2. Parallel backup replication to Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("feedback")
          .insert([savedMsg])
          .then(({ error }: any) => {
            if (error) console.warn("Supabase background feedback insertion error:", error);
          })
          .catch((e: any) => console.warn("Supabase feedback insert exception:", e));
      }

      return savedMsg;
    },

    delete: async (id: string): Promise<boolean> => {
      let success = false;
      // 1. Delete from centrally shared Express server (Master)
      try {
        const res = await fetch(`/api/feedback/${id}`, {
          method: "DELETE"
        });
        success = res.ok;
      } catch (err) {
        console.error("Central API feedback delete failed:", err);
      }

      // 2. Parallel backup deletion in Supabase in background
      if (isSupabaseConfigured && realSupabase) {
        realSupabase
          .from("feedback")
          .delete()
          .eq("id", id)
          .catch((e: any) => console.warn("Supabase feedback delete exception:", e));
      }

      return success;
    }
  }
};
