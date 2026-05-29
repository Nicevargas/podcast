-- ==========================================
-- CAFÉ COM INTERNET - SUPABASE DATABASE MIGRATION
-- Copy and execute this SQL code in the 'SQL Editor' of your Supabase Dashboard
-- This script is safe to be run multiple times (idempotent).
-- ==========================================

-- --------------------------------------------------
-- 1. CLEANUP (Optional: Uncomment to reset tables)
-- --------------------------------------------------
-- DROP TABLE IF EXISTS public.reservations CASCADE;
-- DROP TABLE IF EXISTS public.feedback CASCADE;
-- DROP TABLE IF EXISTS public.sessions CASCADE;
-- DROP TABLE IF EXISTS public.episodes CASCADE;

-- --------------------------------------------------
-- 2. CREATE TABLES (Using IF NOT EXISTS)
-- --------------------------------------------------

-- SESSIONS / HORÁRIOS DA AGENDA
create table if not exists public.sessions (
    id text primary key,
    day text not null,
    month text not null,
    year text not null,
    title text not null,
    "timeStart" text not null,
    "timeEnd" text not null,
    location text not null,
    address text not null,
    "spotsLeft" integer not null default 3,
    "totalSpots" integer not null default 3,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EPISODES / VÍDEOS E ÁUDIOS DO FEED
create table if not exists public.episodes (
    id text primary key,
    title text not null,
    description text not null,
    duration text not null,
    "audioUrl" text not null,
    "publishDate" text not null,
    "coverImage" text not null,
    "guestName" text,
    "guestRole" text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure guest columns of up to 3 guest slots exist on episodes
alter table public.episodes add column if not exists "guestName2" text;
alter table public.episodes add column if not exists "guestRole2" text;
alter table public.episodes add column if not exists "guestName3" text;
alter table public.episodes add column if not exists "guestRole3" text;

-- RESERVATIONS / PARTICIPANTES INSCRITOS NAS GRAVAÇÕES
create table if not exists public.reservations (
    id text primary key,
    "sessionId" text not null references public.sessions(id) on delete cascade,
    "sessionTitle" text not null,
    "sessionDate" text not null,
    "sessionTime" text not null,
    address text not null,
    name text not null,
    email text not null,
    phone text not null,
    topic text not null,
    instagram text,
    timestamp text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FEEDBACKS / DÚVIDAS E FALE CONOSCO
create table if not exists public.feedback (
    id text primary key,
    name text not null,
    email text not null,
    message text not null,
    timestamp text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- --------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------
alter table public.sessions enable row level security;
alter table public.episodes enable row level security;
alter table public.reservations enable row level security;
alter table public.feedback enable row level security;


-- --------------------------------------------------
-- 4. CONFIGURE SECURITY RLS POLICIES (Drop first, then recreate)
-- --------------------------------------------------

-- Sessions Policies
drop policy if exists "Allow public read access to sessions" on public.sessions;
create policy "Allow public read access to sessions" 
    on public.sessions for select 
    using (true);

drop policy if exists "Allow all actions to authenticated admins on sessions" on public.sessions;
create policy "Allow all actions to authenticated admins on sessions" 
    on public.sessions for all 
    to authenticated 
    using (true) 
    with check (true);

drop policy if exists "Allow anonymous modifications on sessions for reservation count sync" on public.sessions;
create policy "Allow anonymous modifications on sessions for reservation count sync"
    on public.sessions for update
    using (true)
    with check (true);


-- Episodes Policies
drop policy if exists "Allow public read access to episodes" on public.episodes;
create policy "Allow public read access to episodes" 
    on public.episodes for select 
    using (true);

drop policy if exists "Allow all actions to authenticated admins on episodes" on public.episodes;
create policy "Allow all actions to authenticated admins on episodes" 
    on public.episodes for all 
    to authenticated 
    using (true) 
    with check (true);


-- Reservations Policies
drop policy if exists "Allow public insert and delete on reservations" on public.reservations;
create policy "Allow public insert and delete on reservations" 
    on public.reservations for insert 
    with check (true);

drop policy if exists "Allow public select and delete on reservations" on public.reservations;
create policy "Allow public select and delete on reservations" 
    on public.reservations for select 
    using (true);

drop policy if exists "Allow public delete on reservations" on public.reservations;
create policy "Allow public delete on reservations" 
    on public.reservations for delete 
    using (true);

drop policy if exists "Allow all actions to authenticated admins on reservations" on public.reservations;
create policy "Allow all actions to authenticated admins on reservations" 
    on public.reservations for all 
    to authenticated 
    using (true) 
    with check (true);


-- Feedback Policies
drop policy if exists "Allow public insert to send feedback messages" on public.feedback;
create policy "Allow public insert to send feedback messages" 
    on public.feedback for insert 
    with check (true);

drop policy if exists "Allow authenticating select and delete actions for feedback management" on public.feedback;
create policy "Allow authenticating select and delete actions for feedback management" 
    on public.feedback for select 
    to authenticated 
    using (true);

drop policy if exists "Allow authenticating delete action for feedback" on public.feedback;
create policy "Allow authenticating delete action for feedback" 
    on public.feedback for delete 
    to authenticated 
    using (true);

drop policy if exists "Allow generic read on feedback if anonymous" on public.feedback;
create policy "Allow generic read on feedback if anonymous"
    on public.feedback for select
    using (true);


-- --------------------------------------------------
-- 5. INITIAL SEED DATA (Safe using ON CONFLICT)
-- --------------------------------------------------

-- Episodes Seeds
INSERT INTO public.episodes (id, title, description, duration, "audioUrl", "publishDate", "coverImage", "guestName", "guestRole") VALUES
('ep-1', 'Como se Diferenciar na Criação de Conteúdo Digital', 'Neste episódio de estreia de Junho, Eunice Vargas conversa sobre os desafios de se destacar em redes sociais saturadas e as melhores táticas práticas para capturar e reter atenção qualificada.', '45:12', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', '24 de Maio, 2026', 'https://agencia.curtatche.com.br/podcast_episodio2.jpeg', 'Marcos Santos', 'Estrategista de Marcas'),
('ep-2', 'A Revolução do Trabalho Remoto e Infraestrutura', 'Será que o futuro é 100% híbrido? Mergulhamos na cultura dos coworkings e como ferramentas digitais estão moldando a produtividade das startups brasileiras.', '38:40', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', '17 de Maio, 2026', 'https://agencia.curtatche.com.br/podcast_episodio2.jpeg', 'Carol Azevedo', 'Diretora de Operações'),
('ep-3', 'Saúde Mental na Era da Hiperconexão Instantânea', 'Um bate-papo necessário com café quentinho sobre cansaço digital, mindfulness para empreendedores e como traçar limites saudáveis em um mundo conectado por notificações permanentes.', '51:05', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', '10 de Maio, 2026', 'https://agencia.curtatche.com.br/podcast_episodio2.jpeg', 'Dr. Fábio Reis', 'Psicólogo & Autor')
ON CONFLICT (id) DO NOTHING;

-- Sessions / Agenda Seeds
INSERT INTO public.sessions (id, day, month, year, title, "timeStart", "timeEnd", location, address, "spotsLeft", "totalSpots") VALUES
('session-1', '01', 'Junho', '2026', 'Teia Centro Histórico', '09:00', '11:00', 'Teia Centro Histórico', 'Rua Líbero Badaró, 425 · São Paulo, SP', 2, 3),
('session-2', '02', 'Junho', '2026', 'Teia Centro Histórico', '15:00', '16:30', 'Teia Centro Histórico', 'Rua Líbero Badaró, 425 · São Paulo, SP', 1, 3),
('session-3', '09', 'Junho', '2026', 'Teia Vergueiro', '15:00', '16:30', 'Teia Vergueiro', 'Av. Vergueiro, 1000 · São Paulo, SP', 3, 3),
('session-4', '10', 'Junho', '2026', 'Teia Pinheiros', '09:00', '11:00', 'Teia Pinheiros', 'Rua Sumidouro, 580 · Pinheiros, SP', 1, 3),
('session-5', '16', 'Junho', '2026', 'Teia Vergueiro', '14:00', '16:00', 'Teia Vergueiro', 'Av. Vergueiro, 1000 · São Paulo, SP', 3, 3),
('session-6', '23', 'Junho', '2026', 'Teia Vergueiro', '10:00', '12:00', 'Teia Vergueiro', 'Av. Vergueiro, 1000 · São Paulo, SP', 3, 3)
ON CONFLICT (id) DO NOTHING;

