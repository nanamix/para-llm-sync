// tests/PromotionPipeline.test.ts
import { PromotionPipeline } from "../src/core/PromotionPipeline";

const mockWikiWriter = {
  write: jest.fn().mockResolvedValue("LLM-Wiki/30_Concepts/01_테스트.md"),
};
const mockIndexUpdater = {
  appendToContentIndex: jest.fn().mockResolvedValue(undefined),
  appendToOperationsLog: jest.fn().mockResolvedValue(undefined),
};

const mockChain = [{
  providerName: "Gemini gemini-2.0-flash",
  complete: jest.fn().mockResolvedValue({
    classification: "concept",
    title: "테스트 개념",
    tags: ["aws"],
    summary: "내용",
    backlinks: ["[[9000_JOURNAL/2026/04/2026-04-23.md]]"],
  }),
}];

describe("PromotionPipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWikiWriter.write.mockResolvedValue("LLM-Wiki/30_Concepts/01_테스트.md");
  });

  it("노트를 처리하여 PromotionResult를 반환한다", async () => {
    const pipeline = new PromotionPipeline(
      mockChain as any,
      mockWikiWriter as any,
      mockIndexUpdater as any
    );

    const result = await pipeline.run(
      [{ path: "9000_JOURNAL/2026/04/2026-04-23.md", content: "내용", date: "2026-04-23" }],
      "2026-04-23"
    );

    expect(result.created).toHaveLength(1);
    expect(result.skipped).toBe(0);
    expect(result.provider).toBe("Gemini gemini-2.0-flash");
    expect(mockIndexUpdater.appendToContentIndex).toHaveBeenCalledTimes(1);
    expect(mockIndexUpdater.appendToOperationsLog).toHaveBeenCalledTimes(1);
  });

  it("noise 분류 노트는 created에 포함되지 않고 skipped가 증가한다", async () => {
    const noiseChain = [{
      providerName: "Gemini gemini-2.0-flash",
      complete: jest.fn().mockResolvedValue({
        classification: "noise",
        title: "",
        tags: [],
        summary: "",
        backlinks: [],
      }),
    }];
    const noiseWriter = { write: jest.fn().mockResolvedValue(null) };

    const pipeline = new PromotionPipeline(
      noiseChain as any,
      noiseWriter as any,
      mockIndexUpdater as any
    );

    const result = await pipeline.run(
      [{ path: "9000_JOURNAL/2026/04/2026-04-23.md", content: "일회성", date: "2026-04-23" }],
      "2026-04-23"
    );

    expect(result.created).toHaveLength(0);
    expect(result.skipped).toBe(1);
    expect(noiseWriter.write).toHaveBeenCalledTimes(1);
    expect(mockIndexUpdater.appendToContentIndex).not.toHaveBeenCalled();
  });
});
