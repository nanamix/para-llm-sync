// tests/WikiWriter.test.ts
import { FileNamer, FrontmatterBuilder } from "../src/core/WikiWriter";

describe("FileNamer", () => {
  it("폴더 내 최대 번호 + 1로 파일명을 생성한다", () => {
    const existingFiles = [
      "30_Concepts/00_Index.md",
      "30_Concepts/01_개념1.md",
      "30_Concepts/06_개념6.md",
    ];
    const name = FileNamer.next(existingFiles, "30_Concepts", "새-개념");
    expect(name).toBe("07_새-개념.md");
  });

  it("파일이 없으면 01부터 시작한다", () => {
    const name = FileNamer.next([], "30_Concepts", "첫-개념");
    expect(name).toBe("01_첫-개념.md");
  });

  it("제목의 공백을 하이픈으로 변환한다", () => {
    const name = FileNamer.next([], "30_Concepts", "ECS 배포 실패 원인");
    expect(name).toBe("01_ECS-배포-실패-원인.md");
  });
});

describe("FrontmatterBuilder", () => {
  it("올바른 YAML frontmatter를 생성한다", () => {
    const fm = FrontmatterBuilder.build({
      date: "2026-04-23",
      tags: ["aws", "concept"],
      status: "active",
    });
    expect(fm).toContain("created: 2026-04-23");
    expect(fm).toContain("source: para-llm-sync");
    expect(fm).toContain("- aws");
  });
});
