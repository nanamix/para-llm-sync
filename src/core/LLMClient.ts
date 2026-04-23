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
  "backlinks": ["[[저널 파일 경로]]"]
}

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
  for (const client of chain) {
    try {
      const response = await client.complete(prompt, context);
      return { response, provider: client.providerName };
    } catch (e) {
      console.warn(`[para-llm-sync] ${client.providerName} 실패, Fallback 시도:`, e);
    }
  }
  throw new Error("모든 LLM Provider 실패");
}

export function createLLMClientChain(settings: PluginSettings): LLMClient[] {
  const chain: LLMClient[] = [];

  if (settings.provider === "gemini" && settings.geminiApiKey) {
    chain.push(new GeminiClient(settings.geminiApiKey, settings.geminiModel));
  }
  if (settings.claudeApiKey) {
    chain.push(new ClaudeClient(settings.claudeApiKey, settings.claudeModel));
  }
  if (settings.openrouterApiKey) {
    chain.push(new OpenRouterClient(settings.openrouterApiKey, settings.openrouterModel));
  }

  return chain;
}
