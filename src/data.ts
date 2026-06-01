import { RecordingSession, PodcastEpisode } from "./types";
import sampaLapaImg from "./assets/images/sampa_cast_lapa_1780333577178.png";

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
  },
  {
    id: "session-7",
    day: "15",
    month: "Junho",
    year: "2026",
    title: "Sampa Cast - Lapa",
    timeStart: "10:00",
    timeEnd: "12:00",
    location: "Sampa Cast - Lapa",
    address: "R. Catão, 611 - Vila Romana, São Paulo",
    spotsLeft: 3,
    totalSpots: 3
  },
  {
    id: "session-8",
    day: "18",
    month: "Junho",
    year: "2026",
    title: "Sampa Cast - Lapa",
    timeStart: "14:00",
    timeEnd: "16:00",
    location: "Sampa Cast - Lapa",
    address: "R. Catão, 611 - Vila Romana, São Paulo",
    spotsLeft: 3,
    totalSpots: 3
  }
];

export const STUDIO_LOCATIONS = [
  {
    name: "Teia Centro Histórico",
    address: "Rua Líbero Badaró, 425 · São Paulo, SP",
    description: "Espaço de coworking iluminado e histórico com design elegante e estrutura completa para produção e colaboração digital no coração de São Paulo.",
    image: "https://agencia.curtatche.com.br/spcast_game.jpg"
  },
  {
    name: "Teia Vergueiro",
    address: "Av. Vergueiro, 1000 · São Paulo, SP",
    description: "Hub de inovação moderno caracterizado pela estética minimalista e ambiente focado em novos criadores de conteúdo e podcasters profissionais.",
    image: "https://agencia.curtatche.com.br/spcast_vergueiro.jpg"
  },
  {
    name: "Hub Green Sampa",
    address: "Rua Sumidouro, 580 · Pinheiros, SP",
    description: "Espaço focado em sustentabilidade e tecnologia no vibrante bairro de Pinheiros, equipado com estúdios com isolamento acústico de última geração.",
    image: "https://agencia.curtatche.com.br/spcast_paulista2.jpg"
  },
  {
    name: "Sampa Cast - Lapa",
    address: "R. Catão, 611 - Vila Romana, São Paulo",
    description: "Estúdio de gravação de podcast premium na Lapa totalmente equipado com isolamento acústico de alto padrão, iluminação cenográfica profissional, câmeras DSLR e microfones Shure, ideal para episódios marcantes.",
    image: sampaLapaImg
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
