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
  status?: "pending" | "confirmed";
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
