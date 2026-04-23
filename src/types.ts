export type Classification = "concept" | "entity" | "comparison" | "query" | "noise";

export interface LLMResponse {
  classification: Classification;
  title: string;
  tags: string[];
  summary: string;
  backlinks: string[];
}

export interface CollectedNote {
  path: string;           // 볼트 기준 상대 경로
  content: string;
  date: string;           // YYYY-MM-DD
}

export interface PromotionResult {
  created: string[];      // 생성된 파일 경로 목록
  skipped: number;        // noise로 건너뛴 수
  provider: string;       // 사용된 LLM Provider 이름
}

export const FOLDER_MAP: Record<Exclude<Classification, "noise">, string> = {
  entity: "20_Entities",
  concept: "30_Concepts",
  comparison: "40_Comparisons",
  query: "50_Queries",
};
