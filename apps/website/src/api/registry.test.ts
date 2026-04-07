import { describe, expect, test } from "vite-plus/test";
import { registryToPresets, type Registry } from "./registry";

describe("registryToPresets", () => {
  test("preserves all models from the registry entry", () => {
    const registry: Registry = {
      openai: {
        name: {
          "zh-CN": "OpenAI",
          en: "OpenAI",
        },
        endpoints: {
          default: {
            openai: "https://api.openai.com/v1",
          },
        },
        models: {
          "gpt-4.1": {},
          "gpt-4.1-mini": {},
          "gpt-5.4": {},
        },
      },
    };

    expect(registryToPresets(registry)).toEqual([
      {
        label: "OpenAI",
        providerInterface: "openai",
        baseUrl: "https://api.openai.com/v1",
        models: ["gpt-4.1", "gpt-4.1-mini", "gpt-5.4"],
      },
    ]);
  });
});
