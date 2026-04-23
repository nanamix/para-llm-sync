// src/core/ClaudeClient.ts
import Anthropic from "@anthropic-ai/sdk";
import type { LLMClient } from "./LLMClient";
import type { LLMResponse } from "../types";

export class ClaudeClient implements LLMClient {
  readonly providerName: string;
  private client: Anthropic;

  constructor(apiKey: string, private model: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    this.providerName = `Claude ${model}`;
  }

  async complete(prompt: string, context: string): Promise<LLMResponse> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: `${prompt}\n\n---\n\n${context}` }],
    });

    const text = (msg.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾을 수 없음");

    try {
      return JSON.parse(jsonMatch[0]) as LLMResponse;
    } catch {
      throw new Error(`Claude API: JSON 파싱 실패 — 응답: ${text.slice(0, 200)}`);
    }
  }
}
