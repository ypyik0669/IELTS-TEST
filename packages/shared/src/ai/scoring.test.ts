import { describe, expect, it } from "vitest";
import {
  computeOverallBand,
  heuristicSpeakingEvaluation,
  heuristicWritingEvaluation,
  listeningRawToBand,
  readingAcademicRawToBand,
} from "./scoring";

describe("IELTS score transforms", () => {
  it("maps listening raw score to expected band checkpoints", () => {
    expect(listeningRawToBand(30)).toBe(7);
    expect(listeningRawToBand(23)).toBe(6);
    expect(listeningRawToBand(16)).toBe(5);
  });

  it("maps reading raw score to expected academic checkpoints", () => {
    expect(readingAcademicRawToBand(30)).toBe(7);
    expect(readingAcademicRawToBand(23)).toBe(6);
    expect(readingAcademicRawToBand(15)).toBe(5);
  });

  it("rounds overall score using IELTS half-band rule", () => {
    expect(
      computeOverallBand({
        listening: 6.5,
        reading: 6,
        writing: 6.5,
        speaking: 6,
      }),
    ).toBe(6.5);
  });
});

describe("Heuristic fallbacks", () => {
  it("returns structured writing feedback", () => {
    const result = heuristicWritingEvaluation({
      prompt: "Some people think universities should focus on job skills.",
      essay:
        "In conclusion this essay discusses why practical skills matter because students need jobs. However universities should also teach theory and critical thinking for long term growth and social benefit.",
      provider: "local_ollama",
      userId: "u1",
    });
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.revisionSuggestions.length).toBeGreaterThan(0);
  });

  it("returns structured speaking feedback", () => {
    const result = heuristicSpeakingEvaluation({
      transcript:
        "I think public transport is important because it saves money and reduces traffic. For example, in my city many students use the metro every day.",
      topic: "transport",
      provider: "local_ollama",
      userId: "u1",
    });
    expect(result.transcript.length).toBeGreaterThan(0);
    expect(result.comments.length).toBeGreaterThan(0);
  });
});
