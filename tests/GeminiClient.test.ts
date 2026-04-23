// tests/GeminiClient.test.ts
import { GeminiClient } from "../src/core/GeminiClient";

const mockOkResponse = (text: string) =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  });

describe("GeminiClient", () => {
  it("응답을 LLMResponse로 파싱한다", async () => {
    global.fetch = mockOkResponse(
      JSON.stringify({
        classification: "concept",
        title: "테스트 개념",
        tags: ["aws"],
        summary: "본문",
        backlinks: ["[[9000_JOURNAL/2026/04/2026-04-23.md]]"],
      })
    ) as unknown as typeof fetch;

    const client = new GeminiClient("fake-api-key", "gemini-2.0-flash");
    const result = await client.complete("프롬프트", "저널 내용");
    expect(result.classification).toBe("concept");
    expect(result.title).toBe("테스트 개념");
    expect(result.tags).toContain("aws");
  });

  it("classification이 noise이면 summary가 빈 문자열이어도 된다", async () => {
    global.fetch = mockOkResponse(
      JSON.stringify({ classification: "noise", title: "", tags: [], summary: "", backlinks: [] })
    ) as unknown as typeof fetch;

    const client = new GeminiClient("fake-api-key", "gemini-2.0-flash");
    const result = await client.complete("프롬프트", "일회성 메모");
    expect(result.classification).toBe("noise");
  });

  it("candidates가 빈 배열이면 에러를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    }) as unknown as typeof fetch;

    const client = new GeminiClient("fake-api-key", "gemini-2.0-flash");
    await expect(client.complete("프롬프트", "내용")).rejects.toThrow("candidates가 없습니다");
  });

  it("HTTP 4xx 에러 시 에러를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "API key not valid",
    }) as unknown as typeof fetch;

    const client = new GeminiClient("bad-key", "gemini-2.0-flash");
    await expect(client.complete("프롬프트", "내용")).rejects.toThrow("Gemini API error: 403");
  });

  it("JSON 파싱 실패 시 에러를 던진다", async () => {
    global.fetch = mockOkResponse("not a json string") as unknown as typeof fetch;

    const client = new GeminiClient("fake-api-key", "gemini-2.0-flash");
    await expect(client.complete("프롬프트", "내용")).rejects.toThrow("JSON 파싱 실패");
  });
});
