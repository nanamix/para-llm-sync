// src/core/GeminiOAuthClient.ts
// Service Account JSON → JWT → Access Token → Vertex AI Gemini API
import type { LLMClient } from "./LLMClient";
import type { LLMResponse } from "../types";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

export class GeminiOAuthClient implements LLMClient {
  readonly providerName: string;
  private sa: ServiceAccount;
  private cachedToken: string | null = null;
  private tokenExpiry = 0;

  constructor(serviceAccountJson: string, private model: string) {
    try {
      this.sa = JSON.parse(serviceAccountJson) as ServiceAccount;
    } catch {
      throw new Error("GeminiOAuth: Service Account JSON 파싱 실패");
    }
    if (!this.sa.client_email || !this.sa.private_key || !this.sa.project_id) {
      throw new Error("GeminiOAuth: client_email / private_key / project_id 필드가 필요합니다");
    }
    this.providerName = `Gemini OAuth ${model}`;
  }

  async complete(prompt: string, context: string): Promise<LLMResponse> {
    const token = await this.getAccessToken();
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${this.sa.project_id}/locations/us-central1/publishers/google/models/${this.model}:generateContent`;

    const body = {
      contents: [{ parts: [{ text: `${prompt}\n\n---\n\n${context}` }] }],
      generationConfig: { temperature: 0.2 },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini OAuth API error: ${res.status} ${errText}`);
    }

    const data = await res.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Gemini OAuth: 응답에 candidates가 없습니다");
    }

    const text = data.candidates[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new Error("Gemini OAuth: 응답 구조가 예상과 다릅니다");
    }

    // JSON 코드블록 제거 (Vertex AI는 마크다운으로 감쌀 수 있음)
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    try {
      return JSON.parse(cleaned) as LLMResponse;
    } catch {
      throw new Error(`Gemini OAuth: JSON 파싱 실패 — 응답: ${text.slice(0, 200)}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    // 캐시된 토큰이 5분 이상 남아있으면 재사용
    if (this.cachedToken && this.tokenExpiry - now > 300) {
      return this.cachedToken;
    }

    const token = await this.mintJWT();
    this.cachedToken = token;
    this.tokenExpiry = now + 3600;
    return token;
  }

  private async mintJWT(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const scope = "https://www.googleapis.com/auth/cloud-platform";

    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: this.sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const b64Header = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const b64Payload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signingInput = `${b64Header}.${b64Payload}`;

    const privateKey = await this.importPrivateKey(this.sa.private_key);
    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      privateKey,
      new TextEncoder().encode(signingInput)
    );

    const b64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const jwt = `${signingInput}.${b64Sig}`;

    // JWT → Access Token 교환
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Gemini OAuth: 토큰 발급 실패 — ${tokenRes.status} ${errText}`);
    }

    const tokenData = await tokenRes.json();
    return tokenData.access_token as string;
  }

  private async importPrivateKey(pem: string): Promise<CryptoKey> {
    const pemBody = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");

    const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    return crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }
}
