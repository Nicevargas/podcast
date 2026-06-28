export interface RecordingSession {
  id: string;
  day: string;
  month: string;
  year: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  address: string;
  spotsLeft: number;
  totalSpots: number;
}

export interface Reservation {
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  address: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  instagram?: string;
  timestamp: string;
  guests?: Array<{ name: string; email: string }>;
  status?: "pending" | "confirmed" | "checked_in";
  imageConsent?: boolean;
  checkInTimestamp?: string;
}

export interface FeedbackMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioUrl: string;
  publishDate: string;
  coverImage: string;
  guestName?: string;
  guestRole?: string;
  guestName2?: string;
  guestRole2?: string;
  guestName3?: string;
  guestRole3?: string;
}

export interface WaitingListEntry {
  id: string;
  name: string;
  contact: string;
  weekdayPreferences: string; // Comma-separated days (e.g. "Segunda-feira, Terça-feira")
  bestHours: string; // Comma-separated or specific text (e.g. "09:00 - 12:00, 14:00 - 16:00")
  createdAt?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  type: "curso" | "workshop" | "geral";
  startDate?: string;
  startTime?: string;
  status: "active" | "inactive";
  createdAt?: string;
}

