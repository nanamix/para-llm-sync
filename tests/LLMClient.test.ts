// tests/LLMClient.test.ts
import { completeWithFallback } from "../src/core/LLMClient";
import type { LLMClient } from "../src/core/LLMClient";
import type { LLMResponse } from "../src/types";

const makeClient = (name: string, result: LLMResponse | Error): LLMClient => ({
  providerName: name,
  complete: jest.fn().mockImplementation(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
  ),
});

const sampleResponse: LLMResponse = {
  classification: "concept",
  title: "테스트",
  tags: ["test"],
  summary: "요약",
  backlinks: [],
};

describe("completeWithFallback", () => {
  it("첫 번째 provider가 성공하면 해당 응답을 반환한다", async () => {
    const primary = makeClient("Gemini", sampleResponse);
    const fallback = makeClient("Claude", sampleResponse);

    const result = await completeWithFallback([primary, fallback], "프롬프트", "내용");
    expect(result.provider).toBe("Gemini");
    expect(result.response.classification).toBe("concept");
    expect(fallback.complete).not.toHaveBeenCalled();
  });

  it("첫 번째 provider 실패 시 두 번째로 Fallback한다", async () => {
    const failing = makeClient("Gemini", new Error("API 실패"));
    const backup = makeClient("Claude", sampleResponse);

    const result = await completeWithFallback([failing, backup], "프롬프트", "내용");
    expect(result.provider).toBe("Claude");
    expect(result.response.classification).toBe("concept");
  });

  it("모든 provider가 실패하면 에러를 던진다", async () => {
    const a = makeClient("Gemini", new Error("실패1"));
    const b = makeClient("Claude", new Error("실패2"));

    await expect(completeWithFallback([a, b], "프롬프트", "내용")).rejects.toThrow(
      "모든 LLM Provider 실패"
    );
  });

  it("체인이 비어있으면 에러를 던진다", async () => {
    await expect(completeWithFallback([], "프롬프트", "내용")).rejects.toThrow(
      "모든 LLM Provider 실패"
    );
  });
});
