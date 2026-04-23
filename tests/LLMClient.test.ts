// tests/LLMClient.test.ts
import { GeminiClient } from "../src/core/GeminiClient";

describe("GeminiClient", () => {
  it("응답을 LLMResponse로 파싱한다", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                classification: "concept",
                title: "테스트 개념",
                tags: ["aws"],
                summary: "본문",
                backlinks: ["[[9000_JOURNAL/2026/04/2026-04-23.md]]"],
              }),
            }],
          },
        }],
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const client = new GeminiClient("fake-api-key", "gemini-2.0-flash");
    const result = await client.complete("프롬프트", "저널 내용");

    expect(result.classification).toBe("concept");
    expect(result.title).toBe("테스트 개념");
    expect(result.tags).toContain("aws");
  });

  it("classification이 noise이면 summary가 빈 문자열이어도 된다", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                classification: "noise",
                title: "",
                tags: [],
                summary: "",
                backlinks: [],
              }),
            }],
          },
        }],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const client = new GeminiClient("fake-api-key", "gemini-2.0-flash");
    const result = await client.complete("프롬프트", "일회성 메모");
    expect(result.classification).toBe("noise");
  });
});
