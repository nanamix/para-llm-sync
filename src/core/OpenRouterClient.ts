// src/core/OpenRouterClient.ts
import OpenAI from "openai";
import type { LLMClient } from "./LLMClient";
import type { LLMResponse } from "../types";

export class OpenRouterClient implements LLMClient {
  readonly providerName: string;
  private client: OpenAI;

  constructor(apiKey: string, private model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      dangerouslyAllowBrowser: true,
    });
    this.providerName = `OpenRouter ${model}`;
  }

  async complete(prompt: string, context: string): Promise<LLMResponse> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: `${prompt}\n\n---\n\n${context}` }],
      response_format: { type: "json_object" },
    });

    const text = res.choices[0].message.content ?? "";

    try {
      return JSON.parse(text) as LLMResponse;
    } catch {
      throw new Error(`OpenRouter API: JSON 파싱 실패 — 응답: ${text.slice(0, 200)}`);
    }
  }
}
