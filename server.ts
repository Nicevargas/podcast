import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  const DB_FILE = path.join(process.cwd(), "data-store.json");

  interface DBStructure {
    sessions: any[];
    episodes: any[];
    reservations: any[];
    feedback: any[];
    admin: any;
  }

  const INITIAL_SESSIONS = [
    {
      id: "session-1",
      day: "01",
      month: "Junho",
      year: "2026",
      title: "Teia Centro Histórico",
      timeStart: "09:00",
      timeEnd: "11:00",
      location: "Teia Centro Histórico",
      address: "Rua Líbero Badaró, 425 · São Paulo, SP",
      spotsLeft: 2,
      totalSpots: 3
    },
    {
      id: "session-2",
      day: "02",
      month: "Junho",
      year: "2026",
      title: "Teia Centro Histórico",
      timeStart: "15:00",
      timeEnd: "16:30",
      location: "Teia Centro Histórico",
      address: "Rua Líbero Badaró, 425 · São Paulo, SP",
      spotsLeft: 1,
      totalSpots: 3
    },
    {
      id: "session-3",
      day: "09",
      month: "Junho",
      year: "2026",
      title: "Teia Vergueiro",
      timeStart: "15:00",
      timeEnd: "16:30",
      location: "Teia Vergueiro",
      address: "Av. Vergueiro, 1000 · São Paulo, SP",
      spotsLeft: 3,
      totalSpots: 3
    },
    {
      id: "session-4",
      day: "10",
      month: "Junho",
      year: "2026",
      title: "Teia Pinheiros",
      timeStart: "09:00",
      timeEnd: "11:00",
      location: "Teia Pinheiros",
      address: "Rua Sumidouro, 580 · Pinheiros, SP",
      spotsLeft: 1,
      totalSpots: 3
    },
    {
      id: "session-5",
      day: "16",
      month: "Junho",
      year: "2026",
      title: "Teia Vergueiro",
      timeStart: "14:00",
      timeEnd: "16:00",
      location: "Teia Vergueiro",
      address: "Av. Vergueiro, 1000 · São Paulo, SP",
      spotsLeft: 3,
      totalSpots: 3
    },
    {
      id: "session-6",
      day: "23",
      month: "Junho",
      year: "2026",
      title: "Teia Vergueiro",
      timeStart: "10:00",
      timeEnd: "12:00",
      location: "Teia Vergueiro",
      address: "Av. Vergueiro, 1000 · São Paulo, SP",
      spotsLeft: 3,
      totalSpots: 3
    }
  ];

  const INITIAL_EPISODES = [
    {
      id: "ep-1",
      title: "Como se Diferenciar na Criação de Conteúdo Digital",
      description: "Neste episódio de estreia de Junho, Eunice Vargas conversa sobre os desafios de se destacar em redes sociais saturadas e as melhores táticas práticas para capturar e reter atenção qualificada.",
      duration: "45:12",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      publishDate: "24 de Maio, 2026",
      coverImage: "https://agencia.curtatche.com.br/podcast_episodio2.jpeg",
      guestName: "Marcos Santos",
      guestRole: "Estrategista de Marcas"
    },
    {
      id: "ep-2",
      title: "A Revolução do Trabalho Remoto e Infraestrutura",
      description: "Será que o futuro é 100% híbrido? Mergulhamos na cultura dos coworkings e como ferramentas digitais estão moldando a produtividade das startups brasileiras.",
      duration: "38:40",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      publishDate: "17 de Maio, 2026",
      coverImage: "https://agencia.curtatche.com.br/podcast_episodio2.jpeg",
      guestName: "Carol Azevedo",
      guestRole: "Diretora de Operações"
    },
    {
      id: "ep-3",
      title: "Saúde Mental na Era da Hiperconexão Instantânea",
      description: "Um bate-papo necessário com café quentinho sobre cansaço digital, mindfulness para empreendedores e como traçar limites saudáveis em um mundo conectado por notificações permanentes.",
      duration: "51:05",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      publishDate: "10 de Maio, 2026",
      coverImage: "https://agencia.curtatche.com.br/podcast_episodio2.jpeg",
      guestName: "Dr. Fábio Reis",
      guestRole: "Psicólogo & Autor"
    }
  ];

  function readDB(): DBStructure {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(content);
      }
    } catch (err) {
      console.error("Error reading database file:", err);
    }

    const defaultDB: DBStructure = {
      sessions: INITIAL_SESSIONS,
      episodes: INITIAL_EPISODES,
      reservations: [],
      feedback: [],
      admin: { email: "admin@cafe.com", password: "admin" }
    };
    writeDB(defaultDB);
    return defaultDB;
  }

  function writeDB(data: DBStructure) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing database file:", err);
    }
  }

  // --- API ROUTES ---

  // SESSIONS
  app.get("/api/sessions", (req, res) => {
    const dbData = readDB();
    res.json(dbData.sessions);
  });

  app.post("/api/sessions", (req, res) => {
    const dbData = readDB();
    const newSession = req.body;
    if (!newSession.id) {
      newSession.id = `session-${Date.now()}`;
    }
    dbData.sessions.push(newSession);
    writeDB(dbData);
    res.status(201).json(newSession);
  });

  app.put("/api/sessions/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    const index = dbData.sessions.findIndex((s) => s.id === id);
    if (index !== -1) {
      dbData.sessions[index] = { ...dbData.sessions[index], ...req.body };
      writeDB(dbData);
      res.json(dbData.sessions[index]);
    } else {
      res.status(404).json({ error: "Sessão não encontrada" });
    }
  });

  app.delete("/api/sessions/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    dbData.sessions = dbData.sessions.filter((s) => s.id !== id);
    writeDB(dbData);
    res.json({ success: true });
  });

  // EPISODES
  app.get("/api/episodes", (req, res) => {
    const dbData = readDB();
    res.json(dbData.episodes);
  });

  app.post("/api/episodes", (req, res) => {
    const dbData = readDB();
    const newEpisode = req.body;
    if (!newEpisode.id) {
      newEpisode.id = `ep-${Date.now()}`;
    }
    dbData.episodes.push(newEpisode);
    writeDB(dbData);
    res.status(201).json(newEpisode);
  });

  app.put("/api/episodes/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    const index = dbData.episodes.findIndex((e) => e.id === id);
    if (index !== -1) {
      dbData.episodes[index] = { ...dbData.episodes[index], ...req.body };
      writeDB(dbData);
      res.json(dbData.episodes[index]);
    } else {
      res.status(404).json({ error: "Episódio não encontrado" });
    }
  });

  app.delete("/api/episodes/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    dbData.episodes = dbData.episodes.filter((e) => e.id !== id);
    writeDB(dbData);
    res.json({ success: true });
  });

  // RESERVATIONS
  app.get("/api/reservations", (req, res) => {
    const dbData = readDB();
    res.json(dbData.reservations);
  });

  app.post("/api/reservations", (req, res) => {
    const dbData = readDB();
    const newReservation = req.body;
    if (!newReservation.id) {
      newReservation.id = `res-${Date.now()}`;
    }
    
    // Dedup by reservation ID
    if (!dbData.reservations.some(r => r.id === newReservation.id)) {
      dbData.reservations.push(newReservation);
      
      // Auto-update spot count in corresponding session if room left
      const sessionIndex = dbData.sessions.findIndex(s => s.id === newReservation.sessionId);
      if (sessionIndex !== -1) {
        if (dbData.sessions[sessionIndex].spotsLeft > 0) {
          dbData.sessions[sessionIndex].spotsLeft -= 1;
        }
      }
      writeDB(dbData);
    }
    res.status(201).json(newReservation);
  });

  app.put("/api/reservations/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    const index = dbData.reservations.findIndex((r) => r.id === id);
    if (index !== -1) {
      dbData.reservations[index] = { ...dbData.reservations[index], ...req.body };
      writeDB(dbData);
      res.json(dbData.reservations[index]);
    } else {
      res.status(404).json({ error: "Reserva não encontrada" });
    }
  });

  app.delete("/api/reservations/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    const resToDelete = dbData.reservations.find(r => r.id === id);
    dbData.reservations = dbData.reservations.filter((r) => r.id !== id);
    
    if (resToDelete) {
      const sessionIndex = dbData.sessions.findIndex(s => s.id === resToDelete.sessionId);
      if (sessionIndex !== -1) {
        dbData.sessions[sessionIndex].spotsLeft = Math.min(
          dbData.sessions[sessionIndex].spotsLeft + 1,
          dbData.sessions[sessionIndex].totalSpots
        );
      }
    }
    
    writeDB(dbData);
    res.json({ success: true });
  });

  // FEEDBACK
  app.get("/api/feedback", (req, res) => {
    const dbData = readDB();
    res.json(dbData.feedback);
  });

  app.post("/api/feedback", (req, res) => {
    const dbData = readDB();
    const newFeedback = req.body;
    if (!newFeedback.id) {
      newFeedback.id = `msg-${Date.now()}`;
    }
    dbData.feedback.push(newFeedback);
    writeDB(dbData);
    res.status(201).json(newFeedback);
  });

  app.delete("/api/feedback/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    dbData.feedback = dbData.feedback.filter((f) => f.id !== id);
    writeDB(dbData);
    res.json({ success: true });
  });

  // AUTHENTICATION fallback on backend check
  app.post("/api/auth/signin", (req, res) => {
    const { email, password } = req.body;
    const dbData = readDB();
    if (dbData.admin && dbData.admin.email === email && dbData.admin.password === password) {
      res.json({ id: "admin-srv", email });
    } else if (email === "admin@cafe.com" && password === "admin") {
      res.json({ id: "admin-srv", email: "admin@cafe.com" });
    } else {
      res.status(401).json({ error: "Credenciais de administrador inválidas." });
    }
  });

  app.post("/api/auth/signup", (req, res) => {
    const { email, password } = req.body;
    const dbData = readDB();
    dbData.admin = { email, password };
    writeDB(dbData);
    res.json({ id: "admin-srv", email });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fullstack Server] running on http://localhost:${PORT}`);
  });
}

startServer();
