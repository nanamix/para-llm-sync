// src/core/LLMClient.ts
import type { LLMResponse } from "../types";
import type { PluginSettings } from "../settings";
import { GeminiClient } from "./GeminiClient";
import { ClaudeClient } from "./ClaudeClient";
import { OpenRouterClient } from "./OpenRouterClient";

export interface LLMClient {
  complete(prompt: string, context: string): Promise<LLMResponse>;
  readonly providerName: string;
}

export const PROMOTION_PROMPT = `
당신은 Obsidian 볼트의 지식 승격 에이전트입니다.
아래 저널 내용을 분석하여 다음 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 출력하지 마세요.

{
  "classification": "concept | entity | comparison | query | noise",
  "title": "파일명에 쓸 간결한 제목 (한국어 또는 영어, 특수문자 제외)",
  "tags": ["tag1", "tag2"],
  "summary": "마크다운 형식의 본문 내용",
  "backlinks": ["[[9000_JOURNAL/2026/04/2026-04-23.md]]"]
}

중요: backlinks 배열의 각 항목은 반드시 [[ 와 ]] 로 감싸야 합니다. 순수 경로만 쓰면 안 됩니다.

분류 기준:
- concept: 이론, 패턴, 원칙, 운영 인사이트
- entity: 도구, 서비스, 조직, 반복 등장 대상
- comparison: A vs B 비교 분석
- query: 플레이북, 체크리스트, 재사용 절차
- noise: 일회성 메모, 보존 가치 없는 내용
`;

export async function completeWithFallback(
  chain: LLMClient[],
  prompt: string,
  context: string
): Promise<{ response: LLMResponse; provider: string }> {
  console.log(`[para-llm-sync] chain 길이: ${chain.length}, providers: ${chain.map(c => c.providerName).join(", ")}`);
  for (const client of chain) {
    try {
      console.log(`[para-llm-sync] ${client.providerName} 호출 시작`);
      const response = await client.complete(prompt, context);
      console.log(`[para-llm-sync] ${client.providerName} 성공`);
      return { response, provider: client.providerName };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[para-llm-sync] ${client.providerName} 실패, Fallback 시도: ${msg}`);
    }
  }
  throw new Error("모든 LLM Provider 실패");
}

export function createLLMClientChain(settings: PluginSettings): LLMClient[] {
  const all: Record<string, LLMClient | null> = {
    gemini: settings.geminiApiKey
      ? new GeminiClient(settings.geminiApiKey, settings.geminiModel)
      : null,
    claude: settings.claudeApiKey
      ? new ClaudeClient(settings.claudeApiKey, settings.claudeModel)
      : null,
    openrouter: settings.openrouterApiKey
      ? new OpenRouterClient(settings.openrouterApiKey, settings.openrouterModel)
      : null,
  };

  // 선택된 provider를 1순위로, 나머지를 Fallback으로 추가
  const order = [settings.provider, ...["gemini", "claude", "openrouter"].filter((p) => p !== settings.provider)];
  return order.map((p) => all[p]).filter((c): c is LLMClient => c !== null);
}
