-- ═══════════════════════════════════════════════════════════
--  NEXUS v2 — Complete Supabase Setup
--  Paste this entire file into the Supabase SQL Editor and Run.
-- ═══════════════════════════════════════════════════════════

-- ── 1. NODES ────────────────────────────────────────────────
create table if not exists nodes (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  kind            text not null default 'field'
                  check (kind in ('field','person','company','tech')),
  parent_id       uuid references nodes(id) on delete cascade,
  description     text not null default '',
  programs_ecs    text not null default '',
  connection_count integer not null default 0,
  likes           integer not null default 0,
  views           integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists nodes_parent_idx on nodes(parent_id);
create index if not exists nodes_name_idx   on nodes(lower(name));
create index if not exists nodes_kind_idx   on nodes(kind);

-- ── 2. CONNECTIONS ──────────────────────────────────────────
create table if not exists connections (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references nodes(id) on delete cascade,
  target_id   uuid not null references nodes(id) on delete cascade,
  kind        text not null default 'academic'
              check (kind in ('academic','tech_case','person','company')),
  label       text not null,
  description text not null default '',
  programs_ecs text not null default '',
  likes       integer not null default 0,
  views       integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint no_self_loop check (source_id <> target_id)
);

create index if not exists conns_source_idx on connections(source_id);
create index if not exists conns_target_idx on connections(target_id);

-- ── 3. RPC FUNCTIONS ────────────────────────────────────────

-- Increment connection count on a node
create or replace function increment_connection_count(node_id uuid)
returns void language plpgsql as $$
begin
  update nodes set connection_count = connection_count + 1 where id = node_id;
end;
$$;

-- Adjust likes (+1 or -1) on nodes or connections
create or replace function adjust_likes(row_id uuid, tbl_name text, delta_val integer)
returns void language plpgsql as $$
begin
  if tbl_name = 'connections' then
    update connections set likes = greatest(0, likes + delta_val) where id = row_id;
  else
    update nodes set likes = greatest(0, likes + delta_val) where id = row_id;
  end if;
end;
$$;

-- Increment views
create or replace function increment_views_fn(row_id uuid, tbl_name text)
returns void language plpgsql as $$
begin
  if tbl_name = 'connections' then
    update connections set views = views + 1 where id = row_id;
  else
    update nodes set views = views + 1 where id = row_id;
  end if;
end;
$$;

-- ── 4. ROW LEVEL SECURITY ───────────────────────────────────
alter table nodes       enable row level security;
alter table connections enable row level security;

-- Public read
create policy "Public read nodes"       on nodes       for select using (true);
create policy "Public read connections" on connections for select using (true);

-- Anyone can insert (AI validation happens in the API layer)
create policy "Anon insert nodes"       on nodes       for insert with check (true);
create policy "Anon insert connections" on connections for insert with check (true);

-- Anyone can update likes/views (API controls what can actually change)
create policy "Anon update nodes"       on nodes       for update using (true);
create policy "Anon update connections" on connections for update using (true);

-- ── 5. SEED DATA ────────────────────────────────────────────
insert into nodes (name, kind, description) values
  ('Biology',         'field', 'The study of living organisms, their structure, function, growth, evolution, and distribution.'),
  ('Chemistry',       'field', 'The science of matter, its properties, and how substances interact, combine, and change.'),
  ('Physics',         'field', 'The study of matter, energy, and the fundamental forces and laws of nature.'),
  ('Mathematics',     'field', 'The abstract science of number, quantity, space, and structure.'),
  ('Computer Science','field', 'The theory and practice of computation, algorithms, and information processing.'),
  ('Medicine',        'field', 'The science and practice of diagnosing, treating, and preventing disease.'),
  ('Psychology',      'field', 'The scientific study of the human mind, behavior, and mental processes.'),
  ('Economics',       'field', 'The social science studying production, distribution, and consumption of goods and services.'),
  ('Philosophy',      'field', 'The study of fundamental questions about existence, knowledge, ethics, and reason.'),
  ('Linguistics',     'field', 'The scientific study of language, its structure, history, and relationship to mind and society.'),
  ('Environmental Science','field','The interdisciplinary study of the natural world and human impact on the environment.'),
  ('Neuroscience',    'field', 'The scientific study of the nervous system — structure, function, development, and disorders.')
on conflict do nothing;

-- ── Biology subtopics ──
with bio as (select id from nodes where name = 'Biology' limit 1) insert into nodes (name, kind, parent_id, description) values
  ('Genetics',           'field', (select id from bio), 'The study of genes, heredity, and genetic variation in living organisms.'),
  ('Zoology',            'field', (select id from bio), 'The branch of biology that studies the animal kingdom.'),
  ('Botany',             'field', (select id from bio), 'The scientific study of plants, algae, and fungi.'),
  ('Cell Biology',       'field', (select id from bio), 'The study of the structure and function of cells.'),
  ('Molecular Biology',  'field', (select id from bio), 'Biology at the molecular level — DNA, RNA, proteins.')
on conflict do nothing;

-- ── Chemistry subtopics ──
with chem as (select id from nodes where name = 'Chemistry' limit 1) insert into nodes (name, kind, parent_id, description) values
  ('Organic Chemistry',   'field', (select id from chem), 'The study of carbon-containing compounds.'),
  ('Inorganic Chemistry', 'field', (select id from chem), 'The study of non-carbon compounds and metals.'),
  ('Physical Chemistry',  'field', (select id from chem), 'The study of how matter behaves on molecular and atomic levels.')
on conflict do nothing;

-- ── Physics subtopics ──
with phys as (select id from nodes where name = 'Physics' limit 1) insert into nodes (name, kind, parent_id, description) values
  ('Quantum Physics',    'field', (select id from phys), 'Physics governing subatomic particles and wave-particle duality.'),
  ('Thermodynamics',     'field', (select id from phys), 'The study of heat, work, temperature, and energy.'),
  ('Astrophysics',       'field', (select id from phys), 'The study of the physical nature of stars, galaxies, and the universe.'),
  ('Wave Motion',        'field', (select id from phys), 'The study of oscillations and wave propagation.')
on conflict do nothing;

-- ── Computer Science subtopics ──
with cs as (select id from nodes where name = 'Computer Science' limit 1) insert into nodes (name, kind, parent_id, description) values
  ('Machine Learning',   'field', (select id from cs), 'Algorithms and models that learn patterns from data.'),
  ('Cybersecurity',      'field', (select id from cs), 'Protecting systems, networks, and programs from digital attacks.'),
  ('Algorithms',         'field', (select id from cs), 'The design and analysis of step-by-step computational procedures.')
on conflict do nothing;

-- ── Seed connections ──
with
  bio  as (select id from nodes where name = 'Biology'          and parent_id is null limit 1),
  chem as (select id from nodes where name = 'Chemistry'        and parent_id is null limit 1),
  phys as (select id from nodes where name = 'Physics'          and parent_id is null limit 1),
  math as (select id from nodes where name = 'Mathematics'      and parent_id is null limit 1),
  cs   as (select id from nodes where name = 'Computer Science' and parent_id is null limit 1),
  med  as (select id from nodes where name = 'Medicine'         and parent_id is null limit 1),
  psy  as (select id from nodes where name = 'Psychology'       and parent_id is null limit 1),
  econ as (select id from nodes where name = 'Economics'        and parent_id is null limit 1),
  phil as (select id from nodes where name = 'Philosophy'       and parent_id is null limit 1),
  ling as (select id from nodes where name = 'Linguistics'      and parent_id is null limit 1),
  env  as (select id from nodes where name = 'Environmental Science' and parent_id is null limit 1),
  neuro as (select id from nodes where name = 'Neuroscience'    and parent_id is null limit 1)
insert into connections (source_id, target_id, kind, label, description) values
  ((select id from bio),  (select id from chem), 'academic',  'Biochemistry',           'The chemistry of living organisms and biological processes.'),
  ((select id from bio),  (select id from phys), 'academic',  'Biophysics',             'Application of physics principles to biological systems.'),
  ((select id from bio),  (select id from med),  'academic',  'Biomedical Science',     'Application of biology to clinical medicine.'),
  ((select id from bio),  (select id from cs),   'academic',  'Bioinformatics',         'Using computation to analyze biological data.'),
  ((select id from chem), (select id from phys), 'academic',  'Physical Chemistry',     'How matter behaves on molecular and atomic levels.'),
  ((select id from phys), (select id from cs),   'tech_case', 'Quantum Computing',      'Computing based on quantum-mechanical phenomena.'),
  ((select id from phys), (select id from cs),   'tech_case', 'Quantum Lock',           'Quantum cryptography applied to cybersecurity.'),
  ((select id from cs),   (select id from math), 'academic',  'Computational Mathematics','Using computers to solve and explore mathematical problems.'),
  ((select id from econ), (select id from psy),  'academic',  'Behavioral Economics',   'How psychological factors affect economic decisions.'),
  ((select id from phil), (select id from ling),  'academic', 'Philosophy of Language',  'The study of language, meaning, and reference.'),
  ((select id from math), (select id from phys),  'academic', 'Mathematical Physics',    'Application of mathematics to problems in physics.'),
  ((select id from neuro),(select id from cs),    'academic', 'Computational Neuroscience','Using mathematical models to study the nervous system.'),
  ((select id from neuro),(select id from psy),   'academic', 'Cognitive Neuroscience', 'How the brain underlies cognitive functions.'),
  ((select id from env),  (select id from chem),  'academic', 'Environmental Chemistry', 'Chemical processes in the environment.'),
  ((select id from bio),  (select id from env),   'academic', 'Ecology',                'Study of interactions between organisms and their environment.')
on conflict do nothing;

-- ── Seed iconic person node ──
insert into nodes (name, kind, description, programs_ecs) values
  ('Charles Darwin', 'person', 'Naturalist and biologist who proposed the theory of evolution by natural selection. Bridged zoology, botany, geology, and philosophy of science.', 'His work inspired modern evolutionary biology programs worldwide.')
on conflict do nothing;

-- Link Darwin to Biology and Philosophy
with
  darwin as (select id from nodes where name = 'Charles Darwin' limit 1),
  bio    as (select id from nodes where name = 'Biology'     and parent_id is null limit 1),
  phil   as (select id from nodes where name = 'Philosophy'  and parent_id is null limit 1)
insert into connections (source_id, target_id, kind, label, description) values
  ((select id from darwin), (select id from bio),  'person', 'Charles Darwin', 'Darwin''s theory of natural selection is the foundation of modern biology.'),
  ((select id from darwin), (select id from phil), 'person', 'Charles Darwin', 'Evolution raised profound philosophical questions about life, design, and human nature.')
on conflict do nothing;

-- ── Seed company node ──
insert into nodes (name, kind, description, programs_ecs) values
  ('iGEM', 'company', 'International Genetically Engineered Machine. A foundation and competition advancing synthetic biology worldwide.', 'iGEM competition: student teams design genetically engineered systems. Open to high school and university teams globally.')
on conflict do nothing;

with
  igem as (select id from nodes where name = 'iGEM'    limit 1),
  bio  as (select id from nodes where name = 'Biology' and parent_id is null limit 1),
  chem as (select id from nodes where name = 'Chemistry' and parent_id is null limit 1)
insert into connections (source_id, target_id, kind, label, description) values
  ((select id from igem), (select id from bio),  'company', 'iGEM', 'iGEM teams engineer biological systems, directly applying biology.'),
  ((select id from igem), (select id from chem), 'company', 'iGEM', 'Synthetic biology bridges genetic engineering with chemistry.')
on conflict do nothing;

-- ── Update all connection counts ──
update nodes set connection_count = (
  select count(*) from connections
  where connections.source_id = nodes.id or connections.target_id = nodes.id
);
