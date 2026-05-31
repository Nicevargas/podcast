import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

async function sendConfirmationEmail(reservation: any) {
  const smtpHost = process.env.SMTP_HOST || "us163-pl.valueserver.net";
  const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
  const smtpUser = process.env.SMTP_USER || "contato@curtatche.com.br";
  const smtpPass = process.env.SMTP_PASS || "";
  const smtpFrom = process.env.SMTP_FROM || `Café com Internet <${smtpUser}>`;

  // Build guests element
  const guestListHTML = reservation.guests && reservation.guests.length > 0
    ? `<ul style="color: #4b5563; font-size: 14px; margin: 8px 0; padding-left: 20px;">${reservation.guests.map((g: any) => `<li><strong>${g.name}</strong> (${g.email})</li>`).join("")}</ul>`
    : "<p style='color: #6b7280; font-size: 14px; margin: 8px 0; font-style: italic;'>Nenhum convidado adicional.</p>";

  const mailOptions = {
    from: smtpFrom,
    to: reservation.email,
    cc: "curtatche@gmail.com",
    subject: `Reserva Confirmada! Gravação Café com Internet: ${reservation.name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.04);">
        <div style="background-color: #7c2d12; color: #ffffff; padding: 35px 25px; text-align: center; background-image: radial-gradient(circle at 10% 20%, rgb(124, 45, 18) 0%, rgb(67, 20, 7) 90%);">
          <span style="background-color: rgba(255, 255, 255, 0.15); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px;">Agendamento Aprovado</span>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">Reserva Confirmada! ☕🎙️</h1>
          <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">Seu microfone está te esperando no Café com Internet.</p>
        </div>
        
        <div style="padding: 35px 30px; background-color: #ffffff; color: #1f2937; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0; color: #111827;">Olá, <strong>${reservation.name}</strong>!</p>
          <p style="font-size: 15px; color: #4b5563;">Excelente notícia! Sua solicitação de participação na gravação do podcast <strong>Café com Internet</strong> com <strong>Eunice Vargas</strong> foi aprovada e confirmada de forma oficial.</p>
          
          <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 22px; border-radius: 16px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 15px; color: #7c2d12; display: flex; align-items: center;">
              <strong style="min-width: 85px; display: inline-block; color: #431407;">📍 Espaço:</strong> ${reservation.sessionTitle}
            </p>
            <p style="margin: 0 0 10px 0; font-size: 15px; color: #7c2d12; display: flex; align-items: center;">
              <strong style="min-width: 85px; display: inline-block; color: #431407;">🏠 Endereço:</strong> ${reservation.address}
            </p>
            <p style="margin: 0 0 10px 0; font-size: 15px; color: #7c2d12; display: flex; align-items: center;">
              <strong style="min-width: 85px; display: inline-block; color: #431407;">📅 Data:</strong> ${reservation.sessionDate}
            </p>
            <p style="margin: 0; font-size: 15px; color: #7c2d12; display: flex; align-items: center;">
              <strong style="min-width: 85px; display: inline-block; color: #431407;">⏰ Horário:</strong> ${reservation.sessionTime}
            </p>
          </div>
          
          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 22px; border-radius: 16px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #111827; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">Pauta Sincronizada</h3>
            <p style="margin: 8px 0; font-size: 14px; color: #4b5563;"><strong style="color: #111827;">De que vamos falar:</strong> "${reservation.topic}"</p>
            <p style="margin: 8px 0; font-size: 14px; color: #4b5563;"><strong style="color: #111827;">Contato:</strong> ${reservation.phone}</p>
            ${reservation.instagram ? `<p style="margin: 8px 0; font-size: 14px; color: #4b5563;"><strong style="color: #111827;">Instagram:</strong> @${reservation.instagram.replace("@", "")}</p>` : ""}
          </div>

          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 22px; border-radius: 16px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #111827; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">👥 Convidados Adicionais</h3>
            ${guestListHTML}
          </div>
          
          <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 25px;">
            <h4 style="margin-top: 0; color: #111827; font-size: 15px; margin-bottom: 10px;">☕ Checklist para o dia da Gravação:</h4>
            <ul style="padding-left: 20px; margin: 0; color: #4b5563; font-size: 14px; line-height: 1.7;">
              <li style="margin-bottom: 6px;">Chegue com <strong>15 minutos de antecedência</strong> para podermos nos conhecer, tomar um café quentinho e ajustar o áudio.</li>
              <li style="margin-bottom: 6px;">O estúdio é totalmente equipado em parceria de fomento com o SampaCast / Ade Sampa.</li>
              <li style="margin-bottom: 6px;">Durante as gravações, faremos imagens de bastidores e trechos de voz/acervo. A sua confirmação de presença autoriza carinhosamente o uso de imagem.</li>
              <li>Caso ocorra algum imprevisto incontornável que impossibilite sua presença, nos notifique com antecedência!</li>
            </ul>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; color: #9ca3af; font-size: 12px; padding: 25px; text-align: center; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0 0 6px 0;">Este é um e-mail automático gerado pelo ecossistema Café com Internet.</p>
          <p style="margin: 0;">© 2026 Café com Internet. Todos os direitos reservados. · Dúvidas? Fale conosco em <a href="mailto:curtatche@gmail.com" style="color: #7c2d12; text-decoration: none; font-weight: 600;">curtatche@gmail.com</a></p>
        </div>
      </div>
    `
  };

  if (!smtpPass || smtpPass.trim() === "") {
    console.log("\n======================================================================");
    console.log("            ☕ SMTP ENVIO DE E-MAIL SIMULADO (NOT CONFIGURED) ☕");
    console.log("Por favor, forneça a credencial 'SMTP_PASS' nos Secrets da plataforma");
    console.log("para que este e-mail formal seja efetivamente enviado ao participante.");
    console.log("");
    console.log(`De: ${smtpFrom}`);
    console.log(`Para: ${mailOptions.to}`);
    console.log(`CC: ${mailOptions.cc}`);
    console.log(`Assunto: ${mailOptions.subject}`);
    console.log("----------------------------------------------------------------------");
    console.log(`[CONTEÚDO DO E-MAIL SIMULADO]:\nOlá ${reservation.name},\nSua gravação no ${reservation.sessionTitle} para o dia ${reservation.sessionDate} (${reservation.sessionTime}) da pauta "${reservation.topic}" foi confirmada formalmente!`);
    console.log("======================================================================\n");
    return { success: true, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer] Email enviado com sucesso para ${reservation.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[Nodemailer Error] Falha crítica ao disparar e-mail smtp real:", err);
    throw err;
  }
}

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
    waitingList: any[];
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
         const data = JSON.parse(content);
         if (!data.waitingList) {
           data.waitingList = [];
         }
         return data;
       }
    } catch (err) {
      console.error("Error reading database file:", err);
    }

    const defaultDB: DBStructure = {
      sessions: INITIAL_SESSIONS,
      episodes: INITIAL_EPISODES,
      reservations: [],
      feedback: [],
      waitingList: [],
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

  // EMAIL CONFIRMATION DISPATCH
  app.post("/api/send-confirmation", async (req, res) => {
    const { reservationId, reservation } = req.body;
    let finalRes = reservation;

    if (!finalRes && reservationId) {
      const dbData = readDB();
      finalRes = dbData.reservations.find(r => r.id === reservationId);
    }

    if (!finalRes) {
      return res.status(400).json({ error: "Reserva não especificada para envio de confirmação por e-mail." });
    }

    try {
      const emailResult = await sendConfirmationEmail(finalRes);
      return res.json({ success: true, ...emailResult });
    } catch (err: any) {
      console.error("Erro ao enviar confirmação de e-mail:", err);
      return res.status(500).json({ error: err.message || "Falha no envio do e-mail de confirmação." });
    }
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

  // WAITING LIST
  app.get("/api/waiting-list", (req, res) => {
    const dbData = readDB();
    res.json(dbData.waitingList || []);
  });

  app.post("/api/waiting-list", (req, res) => {
    const dbData = readDB();
    const newEntry = req.body;
    if (!newEntry.id) {
      newEntry.id = `wait-${Date.now()}`;
    }
    if (!dbData.waitingList) {
      dbData.waitingList = [];
    }
    dbData.waitingList.push(newEntry);
    writeDB(dbData);
    res.status(201).json(newEntry);
  });

  app.delete("/api/waiting-list/:id", (req, res) => {
    const dbData = readDB();
    const { id } = req.params;
    if (dbData.waitingList) {
      dbData.waitingList = dbData.waitingList.filter((entry) => entry.id !== id);
    }
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
