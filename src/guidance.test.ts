import { describe, expect, it, vi } from "vitest";
import {
  completeOnboarding,
  helpTopicById,
  helpTopics,
  onboardingSlides,
  shouldShowOnboarding,
  tourSteps
} from "./guidance";

describe("application guidance", () => {
  it("covers every main workspace screen", () => {
    expect(helpTopics.map((topic) => topic.id)).toEqual([
      "projects",
      "photos",
      "video",
      "audio",
      "preview",
      "timeline",
      "inspector",
      "export",
      "settings"
    ]);
    expect(helpTopics.every((topic) => topic.steps.length >= 4)).toBe(true);
    expect(helpTopics.every((topic) => topic.tips.length >= 3)).toBe(true);
  });

  it("provides a complete first-run flow and workspace tour", () => {
    expect(onboardingSlides).toHaveLength(4);
    expect(tourSteps.map((step) => step.target)).toEqual([
      "projects",
      "library",
      "preview",
      "timeline",
      "inspector",
      "export"
    ]);
  });

  it("persists onboarding completion", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn()
    };
    expect(shouldShowOnboarding(storage)).toBe(true);
    completeOnboarding(storage);
    expect(storage.setItem).toHaveBeenCalledWith("videor-onboarding-complete", "true");
    storage.getItem.mockReturnValue("true");
    expect(shouldShowOnboarding(storage)).toBe(false);
  });

  it("falls back to project help for an unknown topic", () => {
    expect(helpTopicById("unknown" as never).id).toBe("projects");
  });
});
