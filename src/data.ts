import { RecordingSession, PodcastEpisode } from "./types";

export const INITIAL_SESSIONS: RecordingSession[] = [
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

export const STUDIO_LOCATIONS = [
  {
    name: "Teia Centro Histórico",
    address: "Rua Líbero Badaró, 425 · São Paulo, SP",
    description: "Espaço de coworking iluminado e histórico com design elegante e estrutura completa para produção e colaboração digital no coração de São Paulo.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Teia Vergueiro",
    address: "Av. Vergueiro, 1000 · São Paulo, SP",
    description: "Hub de inovação moderno caracterizado pela estética minimalista e ambiente focado em novos criadores de conteúdo e podcasters profissionais.",
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Hub Green Sampa",
    address: "Rua Sumidouro, 580 · Pinheiros, SP",
    description: "Espaço focado em sustentabilidade e tecnologia no vibrante bairro de Pinheiros, equipado com estúdios com isolamento acústico de última geração.",
    image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800"
  }
];

export const PODCAST_EPISODES: PodcastEpisode[] = [
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
