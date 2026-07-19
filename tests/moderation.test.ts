import { describe, expect, it } from "vitest";
import { screenText, screenCharacterFields } from "@/lib/moderation";

describe("moderation.screenText", () => {
  it("allows ordinary content", () => {
    expect(screenText("A friendly wizard who loves tea.").ok).toBe(true);
    expect(screenText("").ok).toBe(true);
    expect(screenText("An 80 year old sea captain telling stories.").ok).toBe(
      true
    );
  });

  it("blocks standalone sexualised-minor terms", () => {
    expect(screenText("cute loli character").ok).toBe(false);
    expect(screenText("shota roleplay").category).toBe("csae");
  });

  it("blocks minor + sexual combinations", () => {
    const r = screenText("a sexy child companion");
    expect(r.ok).toBe(false);
    expect(r.category).toBe("csae");
  });

  it("blocks explicit underage ages combined with sexual terms", () => {
    expect(screenText("a 14 year old, nude").ok).toBe(false);
    // adult age + sexual term is allowed by the baseline filter
    expect(screenText("a 25 year old, romance").ok).toBe(true);
  });

  it("resists trivial leetspeak evasion", () => {
    expect(screenText("s3xy ch1ld").ok).toBe(false);
  });

  it("honours the MODERATION_BLOCKLIST env var", () => {
    process.env.MODERATION_BLOCKLIST = "forbiddenword, another";
    expect(screenText("this has a forbiddenword in it").ok).toBe(false);
    delete process.env.MODERATION_BLOCKLIST;
  });

  it("screens all character fields together", () => {
    const r = screenCharacterFields({
      name: "Innocent",
      persona: "actually a sexy toddler",
    });
    expect(r.ok).toBe(false);
  });
});
