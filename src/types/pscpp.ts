export type PscppPriority = "baixa" | "média" | "alta" | "altíssima";

export type PscppStatus =
  | "não iniciado"
  | "em andamento"
  | "em leitura"
  | "resumido"
  | "revisado"
  | "finalizado"
  | "confirmar";

export type StudyCluster = {
  id: string;
  name: string;
  description: string;
  priority: PscppPriority;
  status: PscppStatus;
  progress: number;
  topics: string[];
  nextActions: string[];
  questionsDone: number;
  accuracy: number;
  lastReview: string | null;
  nextReview: string | null;
};

export type MaterialType =
  | "livro"
  | "norma"
  | "resolução IMO"
  | "publicação DHN"
  | "legislação"
  | "apostila"
  | "prova antiga"
  | "artigo"
  | "mapa mental"
  | "planejamento"
  | "outro";

export type MaterialFileStatus = "sim" | "não" | "confirmar";

export type StudyMaterial = {
  id: string;
  title: string;
  author?: string;
  type: MaterialType;
  clusterIds: string[];
  chapters?: string;
  priority: PscppPriority;
  status: PscppStatus;
  origin: "Jorge" | "Curso H" | "Catavento" | "bibliografia oficial" | "arquivo antigo";
  hasFile: MaterialFileStatus;
  fileName?: string;
  notes?: string;
};

export type ProgramTopic = {
  id: string;
  name: string;
  clusterId: string;
  subtopics: string[];
  relatedMaterialIds: string[];
  studyStatus: "não iniciado" | "iniciado" | "estudado" | "resumido" | "revisado" | "dominado";
  importance: PscppPriority;
  memorizationNeed: "baixa" | "média" | "alta";
  questionsDone: number;
  accuracy: number;
  lastReview: string | null;
  nextReview: string | null;
  notes?: string;
};

export type NextObjectiveAction = {
  cluster: string;
  topic: string;
  material: string;
  duration: string;
  task: string;
};
