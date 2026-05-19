-- PSCPP Stage 1: study map, material library, and syllabus topics.
-- These are shared catalog tables for the authenticated PSCPP app.

CREATE TABLE IF NOT EXISTS public.pscpp_clusters (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('baixa', 'média', 'alta', 'altíssima')),
  status text NOT NULL CHECK (status IN ('não iniciado', 'em andamento', 'em leitura', 'resumido', 'revisado', 'finalizado', 'confirmar')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  topics text[] NOT NULL DEFAULT '{}',
  next_actions text[] NOT NULL DEFAULT '{}',
  questions_done integer NOT NULL DEFAULT 0 CHECK (questions_done >= 0),
  accuracy numeric(5,2) NOT NULL DEFAULT 0 CHECK (accuracy BETWEEN 0 AND 100),
  last_review date,
  next_review date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pscpp_materials (
  id text PRIMARY KEY,
  title text NOT NULL,
  author text,
  type text NOT NULL CHECK (type IN (
    'livro', 'norma', 'resolução IMO', 'publicação DHN', 'legislação',
    'apostila', 'prova antiga', 'artigo', 'mapa mental', 'planejamento', 'outro'
  )),
  chapters text,
  priority text NOT NULL CHECK (priority IN ('baixa', 'média', 'alta', 'altíssima')),
  status text NOT NULL CHECK (status IN ('não iniciado', 'em andamento', 'em leitura', 'resumido', 'revisado', 'finalizado', 'confirmar')),
  origin text NOT NULL CHECK (origin IN ('Jorge', 'Curso H', 'Catavento', 'bibliografia oficial', 'arquivo antigo')),
  has_file text NOT NULL CHECK (has_file IN ('sim', 'não', 'confirmar')),
  file_name text,
  pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pscpp_material_clusters (
  material_id text NOT NULL REFERENCES public.pscpp_materials(id) ON DELETE CASCADE,
  cluster_id text NOT NULL REFERENCES public.pscpp_clusters(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, cluster_id)
);

CREATE TABLE IF NOT EXISTS public.pscpp_program_topics (
  id text PRIMARY KEY,
  name text NOT NULL,
  cluster_id text NOT NULL REFERENCES public.pscpp_clusters(id) ON DELETE CASCADE,
  subtopics text[] NOT NULL DEFAULT '{}',
  study_status text NOT NULL DEFAULT 'não iniciado' CHECK (study_status IN ('não iniciado', 'iniciado', 'estudado', 'resumido', 'revisado', 'dominado')),
  importance text NOT NULL CHECK (importance IN ('baixa', 'média', 'alta', 'altíssima')),
  memorization_need text NOT NULL CHECK (memorization_need IN ('baixa', 'média', 'alta')),
  questions_done integer NOT NULL DEFAULT 0 CHECK (questions_done >= 0),
  accuracy numeric(5,2) NOT NULL DEFAULT 0 CHECK (accuracy BETWEEN 0 AND 100),
  last_review date,
  next_review date,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pscpp_topic_materials (
  topic_id text NOT NULL REFERENCES public.pscpp_program_topics(id) ON DELETE CASCADE,
  material_id text NOT NULL REFERENCES public.pscpp_materials(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_pscpp_material_clusters_cluster
  ON public.pscpp_material_clusters (cluster_id);
CREATE INDEX IF NOT EXISTS idx_pscpp_program_topics_cluster
  ON public.pscpp_program_topics (cluster_id);
CREATE INDEX IF NOT EXISTS idx_pscpp_topic_materials_material
  ON public.pscpp_topic_materials (material_id);

ALTER TABLE public.pscpp_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pscpp_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pscpp_material_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pscpp_program_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pscpp_topic_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pscpp clusters authenticated access" ON public.pscpp_clusters;
CREATE POLICY "pscpp clusters authenticated access"
  ON public.pscpp_clusters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "pscpp materials authenticated access" ON public.pscpp_materials;
CREATE POLICY "pscpp materials authenticated access"
  ON public.pscpp_materials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "pscpp material clusters authenticated access" ON public.pscpp_material_clusters;
CREATE POLICY "pscpp material clusters authenticated access"
  ON public.pscpp_material_clusters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "pscpp topics authenticated access" ON public.pscpp_program_topics;
CREATE POLICY "pscpp topics authenticated access"
  ON public.pscpp_program_topics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "pscpp topic materials authenticated access" ON public.pscpp_topic_materials;
CREATE POLICY "pscpp topic materials authenticated access"
  ON public.pscpp_topic_materials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_pscpp_clusters_updated_at ON public.pscpp_clusters;
CREATE TRIGGER trg_pscpp_clusters_updated_at
  BEFORE UPDATE ON public.pscpp_clusters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_pscpp_materials_updated_at ON public.pscpp_materials;
CREATE TRIGGER trg_pscpp_materials_updated_at
  BEFORE UPDATE ON public.pscpp_materials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_pscpp_program_topics_updated_at ON public.pscpp_program_topics;
CREATE TRIGGER trg_pscpp_program_topics_updated_at
  BEFORE UPDATE ON public.pscpp_program_topics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.pscpp_clusters
  (id, name, description, priority, status, progress, topics, next_actions, next_review)
VALUES
  (
    'manobrabilidade',
    'Manobrabilidade do Navio',
    'Hidrodinâmica aplicada, comportamento do navio e efeitos ambientais nas manobras.',
    'altíssima',
    'em andamento',
    12,
    ARRAY['hidrodinâmica', 'resistência ao avanço', 'propulsão', 'controlabilidade', 'padrões IMO de manobrabilidade', 'geometria do navio', 'manobras', 'curvas de giro', 'crash stop', 'águas rasas', 'bank effect', 'squat', 'interação navio-navio', 'efeito do vento', 'efeito da corrente', 'efeito das ondas', 'manobras especiais'],
    ARRAY['Ler squat e interação', 'Criar resumo de águas rasas', 'Listar padrões IMO'],
    '2026-05-20'
  ),
  (
    'arte-naval',
    'Arte Naval',
    'Estrutura, nomenclatura, equipamentos, rebocadores, amarração e fundamentos práticos do navio.',
    'alta',
    'não iniciado',
    6,
    ARRAY['nomenclatura do navio', 'geometria do navio', 'classificação dos navios', 'trabalhos do marinheiro', 'aparelho de laborar', 'aparelho de fundear', 'aparelho de suspender', 'aparelho de governo', 'manobra do navio', 'amarração', 'cabos', 'âncoras', 'rebocadores', 'tipos de rebocadores', 'bollard pull', 'interação com rebocadores', 'estabilidade', 'dimensões do navio', 'infraestrutura marítima'],
    ARRAY['Separar materiais de rebocadores', 'Revisar estabilidade básica'],
    NULL
  ),
  (
    'navegacao-restrita',
    'Navegação em Águas Restritas',
    'Planejamento, execução e monitoramento de derrota em áreas de navegação restrita.',
    'altíssima',
    'em andamento',
    10,
    ARRAY['planejamento de derrota', 'carta náutica', 'projeções cartográficas', 'agulhas náuticas', 'navegação costeira', 'navegação estimada', 'linhas de posição', 'navegação em águas restritas', 'instrumentos náuticos', 'publicações náuticas', 'auxílios à navegação', 'radar', 'AIS', 'ECDIS', 'passage planning', 'bridge team management', 'pilotage exchange', 'master-pilot information exchange', 'monitoramento da derrota'],
    ARRAY['Abrir Bridge Procedures Guide', 'Mapear publicações DHN', 'Criar checklist de passage planning'],
    '2026-05-22'
  ),
  (
    'legislacao',
    'Legislação e Regulamentação',
    'Normas nacionais e internacionais, autoridade marítima, RIPEAM, SOLAS e praticagem.',
    'altíssima',
    'não iniciado',
    4,
    ARRAY['NORMAMs', 'RIPEAM/COLREG', 'SOLAS', 'autoridade marítima', 'Tribunal Marítimo', 'Lei 2.180', 'registro de propriedade marítima', 'praticagem', 'segurança da navegação', 'normas da DPC', 'normas da DHN', 'decretos', 'leis marítimas', 'portarias', 'publicações oficiais'],
    ARRAY['Confirmar NORMAMs vigentes', 'Separar RIPEAM/COLREG', 'Criar índice da Lei 2.180'],
    NULL
  ),
  (
    'meteorologia',
    'Meteorologia e Oceanografia',
    'Condições ambientais que afetam a navegação, o acesso portuário e a segurança da manobra.',
    'alta',
    'não iniciado',
    3,
    ARRAY['meteorologia marítima', 'pressão atmosférica', 'vento', 'massas de ar', 'frentes', 'nevoeiro', 'tempestades', 'ondas', 'maré', 'correntes', 'oceanografia', 'previsão meteorológica', 'hidrometeorologia aplicada ao acesso portuário'],
    ARRAY['Confirmar material-base', 'Criar mapa mental de maré/correntes'],
    NULL
  ),
  (
    'comunicacoes',
    'Comunicações',
    'Fraseologia padrão, comunicação operacional, sinais e comunicações em emergência.',
    'alta',
    'não iniciado',
    2,
    ARRAY['IMO Standard Marine Communication Phrases', 'SMCP', 'comunicação ponte-prático', 'comunicação com rebocadores', 'radiocomunicação', 'Código Internacional de Sinais', 'sinais visuais', 'sinais sonoros', 'comunicações em emergência'],
    ARRAY['Confirmar A918(22) MSCP', 'Organizar CIS', 'Criar cartões de SMCP'],
    NULL
  ),
  (
    'conhecimentos-gerais',
    'Conhecimentos Gerais, Portos, Economia e Direito Marítimo',
    'Portos, comércio marítimo, economia, direito marítimo e interface navio-porto.',
    'média',
    'não iniciado',
    5,
    ARRAY['planejamento portuário', 'canais de acesso', 'áreas de risco', 'interface navio-porto', 'VTS', 'DP', 'economia marítima', 'transporte marítimo', 'portos', 'comércio internacional', 'direito processual marítimo', 'acidentes e fatos da navegação', 'responsabilidades marítimas'],
    ARRAY['Separar CONAPRA', 'Definir capítulos de Economia Marítima', 'Conectar direito marítimo à Lei 2.180'],
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  progress = EXCLUDED.progress,
  topics = EXCLUDED.topics,
  next_actions = EXCLUDED.next_actions,
  next_review = EXCLUDED.next_review;

INSERT INTO public.pscpp_materials
  (id, title, type, chapters, priority, status, origin, has_file, file_name, notes)
VALUES
  ('ship-resistance-flow', 'Ship Resistance and Flow', 'livro', '1 a 8', 'altíssima', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('practical-ship-hydrodynamics', 'Practical Ship Hydrodynamics', 'livro', '2, 3 e 6', 'altíssima', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('manobra-navio-seculo-21', 'A Manobra do Navio no Século 21', 'livro', '2 ao 11', 'altíssima', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('hidrodinamica-ondas', 'Princípios de Hidrodinâmica e Ação das Ondas', 'livro', '3 e 4', 'alta', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('marine-pilotage', 'Theory and Practices of Marine Pilotage', 'livro', '3, 4, 5, 6, 13, 14, 15, 16, 17, 18 e 19', 'altíssima', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('estabilidade-rebocadores', 'Estabilidade dos Rebocadores', 'livro', '2', 'alta', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('mooring-anchoring', 'Mooring and Anchoring Ships: Principles and Practice', 'livro', '6', 'alta', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('bridge-procedures-guide', 'Bridge Procedures Guide', 'livro', '2, 3, 5 e 6', 'altíssima', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('navegacao-integrada', 'Navegação Integrada', 'livro', '4ª edição', 'altíssima', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('meteorologia-nocoes-basicas', 'Meteorologia: Noções Básicas', 'livro', NULL, 'alta', 'não iniciado', 'Jorge', 'confirmar', NULL, 'Prioridade média/alta no levantamento original.'),
  ('planejamento-portuario-conapra', 'Planejamento Portuário — CONAPRA', 'livro', '2 e 8', 'alta', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('shiphandling-beautiful-game', 'Shiphandling the Beautiful Game', 'livro', '1, 3, 11 e 12', 'alta', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('economia-maritima', 'Economia Marítima', 'livro', '1 ao 17', 'média', 'não iniciado', 'Jorge', 'confirmar', NULL, NULL),
  ('direito-processual-maritimo', 'Direito Processual Marítimo', 'livro', '1 ao 11', 'alta', 'não iniciado', 'Jorge', 'confirmar', NULL, 'Prioridade média/alta no levantamento original.'),
  ('resolucoes-imo', 'Resoluções da IMO', 'resolução IMO', NULL, 'alta', 'confirmar', 'Jorge', 'confirmar', NULL, NULL),
  ('solas', 'SOLAS', 'norma', NULL, 'alta', 'confirmar', 'Jorge', 'confirmar', NULL, NULL),
  ('pianc', 'PIANC', 'publicação DHN', NULL, 'alta', 'confirmar', 'Jorge', 'confirmar', NULL, NULL),
  ('normams', 'NORMAMs', 'norma', NULL, 'altíssima', 'confirmar', 'Jorge', 'confirmar', NULL, NULL),
  ('leis-decretos', 'Leis e Decretos', 'legislação', NULL, 'alta', 'confirmar', 'Jorge', 'confirmar', NULL, NULL),
  ('arquivo-a918-mscp', 'A918(22) MSCP', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'A918(22) MSCP.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-cis', 'CIS', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'CIS.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-ripeam', 'RIPEAM', 'outro', NULL, 'altíssima', 'confirmar', 'arquivo antigo', 'sim', 'RIPEAM.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-carta-12000', 'Carta 12000', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Carta 12000.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-imo-a960', 'IMO A960', 'outro', NULL, 'alta', 'confirmar', 'arquivo antigo', 'sim', 'IMO A960.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-pianc-harbour-approach', 'PIANC Harbour Approach Design Guidelines 2014', 'outro', NULL, 'alta', 'confirmar', 'arquivo antigo', 'sim', 'PIANC Harbour Approach Design Guidelines 2014.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-ship-stability-2008', 'Ship Stability 2008', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Ship Stability 2008.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-squat-interaction', 'Squat Interaction Maneuvering', 'outro', NULL, 'altíssima', 'confirmar', 'arquivo antigo', 'sim', 'Squat Interaction Maneuvering.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-ship-handling-2019', 'Ship Handling 2019', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Ship Handling 2019.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-lei-2180', 'Lei 2.180', 'legislação', NULL, 'alta', 'confirmar', 'arquivo antigo', 'sim', 'Lei 2.180.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-normam-12', 'NORMAM-12', 'norma', NULL, 'altíssima', 'confirmar', 'arquivo antigo', 'sim', 'NORMAM-12.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-normam-26', 'NORMAM-26', 'norma', NULL, 'altíssima', 'confirmar', 'arquivo antigo', 'sim', 'NORMAM-26.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-prova-2008', 'Prova 2008', 'prova antiga', NULL, 'alta', 'confirmar', 'arquivo antigo', 'sim', 'Prova 2008.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-resultado-2008', 'Resultado 2008', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Resultado 2008.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-resultado-2011', 'Resultado 2011', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Resultado 2011.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-conteudo-programatico-final', 'Conteúdo Programático Final', 'planejamento', NULL, 'altíssima', 'confirmar', 'arquivo antigo', 'sim', 'Conteúdo Programático Final.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-bibliografia-final', 'Bibliografia Final', 'planejamento', NULL, 'altíssima', 'confirmar', 'arquivo antigo', 'sim', 'Bibliografia Final.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-planejamento-estudos', 'Planejamento Estudos', 'planejamento', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Planejamento Estudos.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-abp12-p-pianc', 'ABP12_P - PIANC Harbour Approach Design Guidelines 2014', 'outro', NULL, 'alta', 'confirmar', 'arquivo antigo', 'sim', 'ABP12_P - PIANC Harbour Approach Design Guidelines 2014.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-anuladas-2008', 'ANULADAS 2008', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'ANULADAS 2008.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-avisos-navegantes', 'AVISOS AOS NAVEGANTES', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'AVISOS AOS NAVEGANTES.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-comunicacao-opcoes-zp', 'Comunicacao Opcoes ZP', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Comunicacao Opcoes ZP.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-curso-exercicios-2022', 'Curso de Exercícios 2022', 'apostila', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Curso de Exercícios 2022.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-dicionario', 'Dicionário', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Dicionário.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-erog', 'EROG', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'EROG.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-roteiro-costa-sul', 'Roteiro Costa Sul', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Roteiro Costa Sul.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-homologacao-2013', 'Homologação 2013', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Homologação 2013.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-implementing-e-navigation', 'Implementing e-Navigation', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Implementing e-Navigation.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-its2002-carrousel-tug', 'ITS2002 Paper Carrousel Tug', 'artigo', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'ITS2002 Paper Carrousel Tug.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-livro-rebocadores-icn', 'Livro Rebocadores ICN', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Livro Rebocadores ICN.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-propulsion-iii-interacao-casco', 'Propulsion III Interação com casco', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Propulsion III Interação com casco.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-propulsion-iv-cavitacao', 'Propulsion IV Materiais cavitação tipos', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Propulsion IV Materiais cavitação tipos.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-opcoes-zp-pscpp-2008', 'Opções ZP PSCPP 2008', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Opções ZP PSCPP 2008.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-pratico-marinha-homologacao-convocacao', 'Prático da Marinha Homologação e Convocação', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Prático da Marinha Homologação e Convocação.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-pub102', 'PUB102', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'PUB102.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-simbologia', 'Simbologia', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'Simbologia.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-tuip', 'TUIP', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'TUIP.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.'),
  ('arquivo-shftm', 'SHFTM', 'outro', NULL, 'média', 'confirmar', 'arquivo antigo', 'sim', 'SHFTM.pdf', 'Abrir PDF e confirmar conteúdo, escopo e capítulos úteis.')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  chapters = EXCLUDED.chapters,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  origin = EXCLUDED.origin,
  has_file = EXCLUDED.has_file,
  file_name = EXCLUDED.file_name,
  notes = EXCLUDED.notes;

INSERT INTO public.pscpp_material_clusters (material_id, cluster_id)
VALUES
  ('ship-resistance-flow', 'manobrabilidade'),
  ('practical-ship-hydrodynamics', 'manobrabilidade'),
  ('manobra-navio-seculo-21', 'manobrabilidade'),
  ('hidrodinamica-ondas', 'manobrabilidade'),
  ('marine-pilotage', 'arte-naval'),
  ('marine-pilotage', 'navegacao-restrita'),
  ('estabilidade-rebocadores', 'arte-naval'),
  ('mooring-anchoring', 'arte-naval'),
  ('bridge-procedures-guide', 'navegacao-restrita'),
  ('navegacao-integrada', 'navegacao-restrita'),
  ('meteorologia-nocoes-basicas', 'meteorologia'),
  ('planejamento-portuario-conapra', 'conhecimentos-gerais'),
  ('shiphandling-beautiful-game', 'arte-naval'),
  ('shiphandling-beautiful-game', 'manobrabilidade'),
  ('economia-maritima', 'conhecimentos-gerais'),
  ('direito-processual-maritimo', 'legislacao'),
  ('direito-processual-maritimo', 'conhecimentos-gerais'),
  ('resolucoes-imo', 'legislacao'),
  ('solas', 'legislacao'),
  ('pianc', 'conhecimentos-gerais'),
  ('pianc', 'navegacao-restrita'),
  ('normams', 'legislacao'),
  ('leis-decretos', 'legislacao'),
  ('arquivo-a918-mscp', 'comunicacoes'),
  ('arquivo-cis', 'comunicacoes'),
  ('arquivo-ripeam', 'legislacao'),
  ('arquivo-carta-12000', 'navegacao-restrita'),
  ('arquivo-imo-a960', 'legislacao'),
  ('arquivo-pianc-harbour-approach', 'navegacao-restrita'),
  ('arquivo-ship-stability-2008', 'arte-naval'),
  ('arquivo-squat-interaction', 'manobrabilidade'),
  ('arquivo-ship-handling-2019', 'manobrabilidade'),
  ('arquivo-lei-2180', 'legislacao'),
  ('arquivo-normam-12', 'legislacao'),
  ('arquivo-normam-26', 'legislacao'),
  ('arquivo-prova-2008', 'conhecimentos-gerais'),
  ('arquivo-resultado-2008', 'conhecimentos-gerais'),
  ('arquivo-resultado-2011', 'conhecimentos-gerais'),
  ('arquivo-conteudo-programatico-final', 'conhecimentos-gerais'),
  ('arquivo-bibliografia-final', 'conhecimentos-gerais'),
  ('arquivo-planejamento-estudos', 'conhecimentos-gerais'),
  ('arquivo-abp12-p-pianc', 'navegacao-restrita'),
  ('arquivo-anuladas-2008', 'conhecimentos-gerais'),
  ('arquivo-avisos-navegantes', 'navegacao-restrita'),
  ('arquivo-comunicacao-opcoes-zp', 'comunicacoes'),
  ('arquivo-curso-exercicios-2022', 'conhecimentos-gerais'),
  ('arquivo-dicionario', 'comunicacoes'),
  ('arquivo-erog', 'navegacao-restrita'),
  ('arquivo-roteiro-costa-sul', 'navegacao-restrita'),
  ('arquivo-homologacao-2013', 'legislacao'),
  ('arquivo-implementing-e-navigation', 'navegacao-restrita'),
  ('arquivo-its2002-carrousel-tug', 'arte-naval'),
  ('arquivo-livro-rebocadores-icn', 'arte-naval'),
  ('arquivo-propulsion-iii-interacao-casco', 'manobrabilidade'),
  ('arquivo-propulsion-iv-cavitacao', 'manobrabilidade'),
  ('arquivo-opcoes-zp-pscpp-2008', 'conhecimentos-gerais'),
  ('arquivo-pratico-marinha-homologacao-convocacao', 'legislacao'),
  ('arquivo-pub102', 'navegacao-restrita'),
  ('arquivo-simbologia', 'navegacao-restrita'),
  ('arquivo-tuip', 'arte-naval'),
  ('arquivo-shftm', 'manobrabilidade')
ON CONFLICT DO NOTHING;

INSERT INTO public.pscpp_program_topics
  (id, name, cluster_id, study_status, importance, memorization_need, next_review)
SELECT
  c.id || '-' || regexp_replace(lower(unaccent_topic.topic), '[^a-z0-9]+', '-', 'g') AS id,
  unaccent_topic.topic AS name,
  c.id AS cluster_id,
  CASE WHEN c.id IN ('manobrabilidade', 'navegacao-restrita') AND unaccent_topic.ordinality <= 2 THEN 'iniciado' ELSE 'não iniciado' END AS study_status,
  c.priority AS importance,
  CASE WHEN c.id IN ('legislacao', 'comunicacoes') THEN 'alta' ELSE 'média' END AS memorization_need,
  CASE WHEN unaccent_topic.ordinality = 1 THEN c.next_review ELSE NULL END AS next_review
FROM public.pscpp_clusters c
CROSS JOIN LATERAL unnest(c.topics) WITH ORDINALITY AS unaccent_topic(topic, ordinality)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  cluster_id = EXCLUDED.cluster_id,
  importance = EXCLUDED.importance,
  memorization_need = EXCLUDED.memorization_need,
  next_review = EXCLUDED.next_review;

INSERT INTO public.pscpp_topic_materials (topic_id, material_id)
SELECT topic.id, material.id
FROM public.pscpp_program_topics topic
JOIN public.pscpp_material_clusters mc ON mc.cluster_id = topic.cluster_id
JOIN public.pscpp_materials material ON material.id = mc.material_id
WHERE material.priority IN ('alta', 'altíssima')
ON CONFLICT DO NOTHING;
