import { createClient } from "@supabase/supabase-js";
import { RecordingSession, PodcastEpisode, Reservation, FeedbackMessage } from "./types";
import { INITIAL_SESSIONS, PODCAST_EPISODES } from "./data";

// Retrieve environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

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

// Ensure local storage keys exist with initial seed data on first load
const SEED_DATA = {
  sessions: "cafe_sessions_data",
  episodes: "cafe_episodes_data",
  reservations: "cafe_reservations_data",
  feedback: "cafe_feedback_data",
  adminUser: "cafe_admin_user"
};

const initializeLocalStorageDB = () => {
  if (!localStorage.getItem(SEED_DATA.sessions)) {
    localStorage.setItem(SEED_DATA.sessions, JSON.stringify(INITIAL_SESSIONS));
  }
  if (!localStorage.getItem(SEED_DATA.episodes)) {
    localStorage.setItem(SEED_DATA.episodes, JSON.stringify(PODCAST_EPISODES));
  }
  if (!localStorage.getItem(SEED_DATA.reservations)) {
    localStorage.setItem(SEED_DATA.reservations, JSON.stringify([]));
  }
  if (!localStorage.getItem(SEED_DATA.feedback)) {
    localStorage.setItem(SEED_DATA.feedback, JSON.stringify([]));
  }
  if (!localStorage.getItem(SEED_DATA.adminUser)) {
    // Default mock admin account
    localStorage.setItem(
      SEED_DATA.adminUser,
      JSON.stringify({ email: "admin@cafe.com", password: "admin" })
    );
  }
};

// Start the local database if we are running in fallback mode
initializeLocalStorageDB();

// Unified DB provider interface
export const db = {
  // Check backend status
  isOnline: () => !!isSupabaseConfigured,

  // --- AUTHENTICATION ---
  auth: {
    getUser: async () => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data: { user } } = await realSupabase.auth.getUser();
          return user;
        } catch (error) {
          console.warn("Supabase auth.getUser exception, using local session storage fallback:", error);
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
          console.warn("Supabase auth.signIn exception, falling back to local storage auth:", error);
          if (error instanceof Error && !error.message.includes("fetch")) {
            // If it's a specific incorrect credential password/user error rather than a connection failure, rethrow
            throw error;
          }
        }
      }

      // Local storage fallback authentication
      const adminCreds = JSON.parse(localStorage.getItem(SEED_DATA.adminUser) || "{}");
      if (adminCreds.email === email && adminCreds.password === pass) {
        const mockUser = { id: "admin-fallback", email };
        sessionStorage.setItem("cafe_logged_in_user", JSON.stringify(mockUser));
        return mockUser;
      }
      throw new Error("Credenciais inválidas. Use admin@cafe.com com a senha admin no modo local.");
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
          console.warn("Supabase auth.signUp exception, registering locally:", error);
          if (error instanceof Error && !error.message.includes("fetch")) {
            throw error;
          }
        }
      }

      // Local storage fallback registration
      const newAdmin = { email, password: pass };
      localStorage.setItem(SEED_DATA.adminUser, JSON.stringify(newAdmin));
      sessionStorage.setItem("cafe_logged_in_user", JSON.stringify({ id: "admin-fallback", email }));
      return { id: "admin-fallback", email };
    },

    signOut: async () => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          await realSupabase.auth.signOut();
          return;
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
          console.warn("Supabase sessions fetch returned error, falling back to local:", error);
        } catch (error) {
          console.warn("Supabase sessions fetch exception, falling back to local:", error);
        }
      }
      return JSON.parse(localStorage.getItem(SEED_DATA.sessions) || "[]");
    },

    create: async (session: Omit<RecordingSession, "id">): Promise<RecordingSession> => {
      const newId = `session-${Date.now()}`;
      const newSession: RecordingSession = { id: newId, ...session };

      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("sessions")
            .insert([newSession])
            .select();
          if (!error && data) return data[0];
          console.warn("Supabase session insert returned error, writing locally:", error);
        } catch (error) {
          console.warn("Supabase session insert exception, writing locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.sessions) || "[]");
      list.push(newSession);
      localStorage.setItem(SEED_DATA.sessions, JSON.stringify(list));
      return newSession;
    },

    update: async (id: string, updates: Partial<RecordingSession>): Promise<RecordingSession> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          // Strip id and metadata fields before updating in Supabase to prevent policy/constraint errors
          const { id: _, created_at: __, ...cleanUpdates } = updates as any;
          const { data, error } = await realSupabase
            .from("sessions")
            .update(cleanUpdates)
            .eq("id", id)
            .select();
          if (!error && data) return data[0];
          console.warn("Supabase session update returned error, modifying locally:", error);
        } catch (error) {
          console.warn("Supabase session update exception, modifying locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.sessions) || "[]") as RecordingSession[];
      const idx = list.findIndex(s => s.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(SEED_DATA.sessions, JSON.stringify(list));
        return list[idx];
      }
      throw new Error("Session not found");
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { error } = await realSupabase
            .from("sessions")
            .delete()
            .eq("id", id);
          if (!error) return true;
          console.warn("Supabase session delete returned error, deleting locally:", error);
        } catch (error) {
          console.warn("Supabase session delete exception, deleting locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.sessions) || "[]") as RecordingSession[];
      const filtered = list.filter(s => s.id !== id);
      localStorage.setItem(SEED_DATA.sessions, JSON.stringify(filtered));
      return true;
    }
  },

  // --- PODCAST EPISODES / VIDEOS ---
  episodes: {
    list: async (): Promise<PodcastEpisode[]> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("episodes")
            .select("*")
            .order("id", { ascending: false });
          if (!error && data) return data;
          console.warn("Supabase episodes fetch returned error, falling back to local:", error);
        } catch (error) {
          console.warn("Supabase episodes fetch exception, falling back to local:", error);
        }
      }
      return JSON.parse(localStorage.getItem(SEED_DATA.episodes) || "[]");
    },

    create: async (episode: Omit<PodcastEpisode, "id">): Promise<PodcastEpisode> => {
      const newId = `ep-${Date.now()}`;
      const newEpisode: PodcastEpisode = { id: newId, ...episode };

      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("episodes")
            .insert([newEpisode])
            .select();
           if (!error && data) return data[0];
           console.warn("Supabase episode insert returned error, writing locally:", error);
        } catch (error) {
          console.warn("Supabase episode insert exception, writing locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.episodes) || "[]");
      list.push(newEpisode);
      localStorage.setItem(SEED_DATA.episodes, JSON.stringify(list));
      return newEpisode;
    },

    update: async (id: string, updates: Partial<PodcastEpisode>): Promise<PodcastEpisode> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          // Strip id and metadata fields before updating in Supabase to prevent policy/constraint errors
          const { id: _, created_at: __, ...cleanUpdates } = updates as any;
          const { data, error } = await realSupabase
            .from("episodes")
            .update(cleanUpdates)
            .eq("id", id)
            .select();
          if (!error && data) return data[0];
          console.warn("Supabase episode update returned error, updating locally:", error);
        } catch (error) {
          console.warn("Supabase episode update exception, updating locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.episodes) || "[]") as PodcastEpisode[];
      const idx = list.findIndex(e => e.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(SEED_DATA.episodes, JSON.stringify(list));
        return list[idx];
      }
      throw new Error("Episode not found");
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { error } = await realSupabase
            .from("episodes")
            .delete()
            .eq("id", id);
          if (!error) return true;
          console.warn("Supabase episode delete returned error, deleting locally:", error);
        } catch (error) {
          console.warn("Supabase episode delete exception, deleting locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.episodes) || "[]") as PodcastEpisode[];
      const filtered = list.filter(e => e.id !== id);
      localStorage.setItem(SEED_DATA.episodes, JSON.stringify(filtered));
      return true;
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
            // Apply default status client-side if missing
            return data.map(r => ({
              ...r,
              status: r.status || "pending",
              imageConsent: r.imageConsent ?? r.image_consent ?? false,
              checkInTimestamp: r.checkInTimestamp ?? r.check_in_timestamp ?? undefined
            }));
          }
          console.warn("Supabase reservations fetch returned error, falling back to local:", error);
        } catch (error) {
          console.warn("Supabase reservations fetch exception, falling back to local:", error);
        }
      }
      const local = JSON.parse(localStorage.getItem(SEED_DATA.reservations) || "[]") as Reservation[];
      return local.map(r => ({ ...r, status: r.status || "pending" }));
    },

    create: async (reservation: Reservation): Promise<Reservation> => {
      const reservationWithStatus = {
        ...reservation,
        status: reservation.status || "pending",
        imageConsent: reservation.imageConsent || false,
        checkInTimestamp: reservation.checkInTimestamp || null
      };

      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("reservations")
            .insert([reservationWithStatus])
            .select();
          if (!error && data) return data[0];
          console.warn("Supabase reservation insert returned error, writing locally:", error);
        } catch (error) {
          console.warn("Supabase reservation insert exception, writing locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.reservations) || "[]");
      list.push(reservationWithStatus);
      localStorage.setItem(SEED_DATA.reservations, JSON.stringify(list));
      return reservationWithStatus;
    },

    update: async (id: string, updates: Partial<Reservation>): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { error } = await realSupabase
            .from("reservations")
            .update(updates)
            .eq("id", id);
          if (!error) return true;
          console.warn("Supabase reservation update returned error, writing locally:", error);
        } catch (error) {
          console.warn("Supabase reservation update exception, writing locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.reservations) || "[]") as Reservation[];
      const updated = list.map(r => r.id === id ? { ...r, ...updates } : r);
      localStorage.setItem(SEED_DATA.reservations, JSON.stringify(updated));
      return true;
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { error } = await realSupabase
            .from("reservations")
            .delete()
            .eq("id", id);
          if (!error) return true;
          console.warn("Supabase reservation delete returned error, deleting locally:", error);
        } catch (error) {
          console.warn("Supabase reservation delete exception, deleting locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.reservations) || "[]") as Reservation[];
      const filtered = list.filter(r => r.id !== id);
      localStorage.setItem(SEED_DATA.reservations, JSON.stringify(filtered));
      return true;
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
          console.warn("Supabase feedback fetch returned error, falling back to local:", error);
        } catch (error) {
          console.warn("Supabase feedback fetch exception, falling back to local:", error);
        }
      }
      return JSON.parse(localStorage.getItem(SEED_DATA.feedback) || "[]");
    },

    create: async (message: Omit<FeedbackMessage, "id">): Promise<FeedbackMessage> => {
      const newId = `msg-${Date.now()}`;
      const newMsg: FeedbackMessage = { id: newId, ...message };

      if (isSupabaseConfigured && realSupabase) {
        try {
          const { data, error } = await realSupabase
            .from("feedback")
            .insert([newMsg])
            .select();
          if (!error && data) return data[0];
          console.warn("Supabase feedback insert returned error, saving locally:", error);
        } catch (error) {
          console.warn("Supabase feedback insert exception, saving locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.feedback) || "[]");
      list.push(newMsg);
      localStorage.setItem(SEED_DATA.feedback, JSON.stringify(list));
      return newMsg;
    },

    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured && realSupabase) {
        try {
          const { error } = await realSupabase
            .from("feedback")
            .delete()
            .eq("id", id);
          if (!error) return true;
          console.warn("Supabase feedback delete returned error, deleting locally:", error);
        } catch (error) {
          console.warn("Supabase feedback delete exception, deleting locally:", error);
        }
      }

      const list = JSON.parse(localStorage.getItem(SEED_DATA.feedback) || "[]") as FeedbackMessage[];
      const filtered = list.filter(f => f.id !== id);
      localStorage.setItem(SEED_DATA.feedback, JSON.stringify(filtered));
      return true;
    }
  }
};
