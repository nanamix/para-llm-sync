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
      generationConfig: { responseMimeType: "application/json" },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text) as LLMResponse;
  }
}
