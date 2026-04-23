// src/core/GeminiClient.ts
import type { LLMClient } from "./LLMClient";
import type { LLMResponse } from "../types";

export class GeminiClient implements LLMClient {
  readonly providerName: string;

  constructor(private apiKey: string, private model: string) {
    this.providerName = `Gemini ${model}`;
  }

  async complete(prompt: string, context: string): Promise<LLMResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = {
      contents: [{
        parts: [{ text: `${prompt}\n\n---\n\n${context}` }],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${errText}`);
    }

    const data = await res.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Gemini API: 응답에 candidates가 없습니다 (안전 필터 또는 빈 응답)");
    }

    const text = data.candidates[0].content.parts[0].text;

    try {
      return JSON.parse(text) as LLMResponse;
    } catch {
      throw new Error(`Gemini API: JSON 파싱 실패 — 응답: ${text.slice(0, 200)}`);
    }
  }
}
