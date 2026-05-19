import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { allStudyMaterials, programTopics, studyClusters } from "@/data/pscppSeed";
import type { ProgramTopic, StudyCluster, StudyMaterial } from "@/types/pscpp";

type PscppData = {
  clusters: StudyCluster[];
  materials: StudyMaterial[];
  topics: ProgramTopic[];
  loading: boolean;
  source: "supabase" | "local";
  updateMaterial: (
    materialId: string,
    patch: Partial<Pick<StudyMaterial, "priority" | "status" | "hasFile">>,
  ) => Promise<{ ok: boolean; message?: string }>;
  updateTopic: (
    topicId: string,
    patch: Partial<
      Pick<ProgramTopic, "studyStatus" | "importance" | "memorizationNeed" | "nextReview">
    >,
  ) => Promise<{ ok: boolean; message?: string }>;
};

type PscppState = Omit<PscppData, "updateMaterial" | "updateTopic">;

type ClusterRow = {
  id: string;
  name: string;
  description: string;
  priority: StudyCluster["priority"];
  status: StudyCluster["status"];
  progress: number;
  topics: string[] | null;
  next_actions: string[] | null;
  questions_done: number | null;
  accuracy: number | null;
  last_review: string | null;
  next_review: string | null;
};

type MaterialRow = {
  id: string;
  title: string;
  author: string | null;
  type: StudyMaterial["type"];
  chapters: string | null;
  priority: StudyMaterial["priority"];
  status: StudyMaterial["status"];
  origin: StudyMaterial["origin"];
  has_file: StudyMaterial["hasFile"];
  file_name: string | null;
  pdf_url: string | null;
  notes: string | null;
};

type MaterialClusterRow = {
  material_id: string;
  cluster_id: string;
};

type TopicRow = {
  id: string;
  name: string;
  cluster_id: string;
  subtopics: string[] | null;
  study_status: ProgramTopic["studyStatus"];
  importance: ProgramTopic["importance"];
  memorization_need: ProgramTopic["memorizationNeed"];
  questions_done: number | null;
  accuracy: number | null;
  last_review: string | null;
  next_review: string | null;
  observations: string | null;
};

type TopicMaterialRow = {
  topic_id: string;
  material_id: string;
};

export function usePscppData(): PscppData {
  const [data, setData] = useState<PscppState>({
    clusters: studyClusters,
    materials: allStudyMaterials,
    topics: programTopics,
    loading: true,
    source: "local",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      const [
        clustersResult,
        materialsResult,
        materialClustersResult,
        topicsResult,
        topicMaterialsResult,
      ] = await Promise.all([
        supabase
          .from("pscpp_clusters" as never)
          .select("*")
          .order("name"),
        supabase
          .from("pscpp_materials" as never)
          .select("*")
          .order("title"),
        supabase.from("pscpp_material_clusters" as never).select("*"),
        supabase
          .from("pscpp_program_topics" as never)
          .select("*")
          .order("name"),
        supabase.from("pscpp_topic_materials" as never).select("*"),
      ]);

      if (!alive) return;

      if (clustersResult.error || materialsResult.error || topicsResult.error) {
        setData((current) => ({
          ...current,
          loading: false,
          source: "local",
        }));
        return;
      }

      const clusters = ((clustersResult.data ?? []) as unknown as ClusterRow[]).map(toCluster);
      const materialClusterRows = (materialClustersResult.data ??
        []) as unknown as MaterialClusterRow[];
      const topicMaterialRows = (topicMaterialsResult.data ?? []) as unknown as TopicMaterialRow[];
      const materials = ((materialsResult.data ?? []) as unknown as MaterialRow[]).map((row) =>
        toMaterial(row, materialClusterRows),
      );
      const topics = ((topicsResult.data ?? []) as unknown as TopicRow[]).map((row) =>
        toTopic(row, topicMaterialRows),
      );

      setData({
        clusters: clusters.length ? clusters : studyClusters,
        materials: materials.length ? materials : allStudyMaterials,
        topics: topics.length ? topics : programTopics,
        loading: false,
        source: clusters.length ? "supabase" : "local",
      });
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  async function updateMaterial(
    materialId: string,
    patch: Partial<Pick<StudyMaterial, "priority" | "status" | "hasFile">>,
  ) {
    if (data.source !== "supabase") {
      return { ok: false, message: "A migration PSCPP ainda não foi aplicada no Supabase." };
    }

    const previousMaterials = data.materials;
    setData((current) => ({
      ...current,
      materials: current.materials.map((material) =>
        material.id === materialId ? { ...material, ...patch } : material,
      ),
    }));

    const payload: Record<string, string> = {};
    if (patch.priority) payload.priority = patch.priority;
    if (patch.status) payload.status = patch.status;
    if (patch.hasFile) payload.has_file = patch.hasFile;

    const { error } = await supabase
      .from("pscpp_materials" as never)
      .update(payload as never)
      .eq("id", materialId);

    if (error) {
      setData((current) => ({ ...current, materials: previousMaterials }));
      return { ok: false, message: error.message };
    }

    return { ok: true };
  }

  async function updateTopic(
    topicId: string,
    patch: Partial<
      Pick<ProgramTopic, "studyStatus" | "importance" | "memorizationNeed" | "nextReview">
    >,
  ) {
    if (data.source !== "supabase") {
      return { ok: false, message: "A migration PSCPP ainda não foi aplicada no Supabase." };
    }

    const previousTopics = data.topics;
    setData((current) => ({
      ...current,
      topics: current.topics.map((topic) =>
        topic.id === topicId ? { ...topic, ...patch } : topic,
      ),
    }));

    const payload: Record<string, string | null> = {};
    if (patch.studyStatus) payload.study_status = patch.studyStatus;
    if (patch.importance) payload.importance = patch.importance;
    if (patch.memorizationNeed) payload.memorization_need = patch.memorizationNeed;
    if ("nextReview" in patch) payload.next_review = patch.nextReview ?? null;

    const { error } = await supabase
      .from("pscpp_program_topics" as never)
      .update(payload as never)
      .eq("id", topicId);

    if (error) {
      setData((current) => ({ ...current, topics: previousTopics }));
      return { ok: false, message: error.message };
    }

    return { ok: true };
  }

  return { ...data, updateMaterial, updateTopic };
}

function toCluster(row: ClusterRow): StudyCluster {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priority: row.priority,
    status: row.status,
    progress: row.progress,
    topics: row.topics ?? [],
    nextActions: row.next_actions ?? [],
    questionsDone: row.questions_done ?? 0,
    accuracy: Number(row.accuracy ?? 0),
    lastReview: row.last_review,
    nextReview: row.next_review,
  };
}

function toMaterial(row: MaterialRow, materialClusters: MaterialClusterRow[]): StudyMaterial {
  return {
    id: row.id,
    title: row.title,
    author: row.author ?? undefined,
    type: row.type,
    clusterIds: materialClusters
      .filter((item) => item.material_id === row.id)
      .map((item) => item.cluster_id),
    chapters: row.chapters ?? undefined,
    priority: row.priority,
    status: row.status,
    origin: row.origin,
    hasFile: row.has_file,
    fileName: row.file_name ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function toTopic(row: TopicRow, topicMaterials: TopicMaterialRow[]): ProgramTopic {
  return {
    id: row.id,
    name: row.name,
    clusterId: row.cluster_id,
    subtopics: row.subtopics ?? [],
    relatedMaterialIds: topicMaterials
      .filter((item) => item.topic_id === row.id)
      .map((item) => item.material_id),
    studyStatus: row.study_status,
    importance: row.importance,
    memorizationNeed: row.memorization_need,
    questionsDone: row.questions_done ?? 0,
    accuracy: Number(row.accuracy ?? 0),
    lastReview: row.last_review,
    nextReview: row.next_review,
    notes: row.observations ?? undefined,
  };
}
