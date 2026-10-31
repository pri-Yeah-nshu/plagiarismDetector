import config from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import {
  PLAGIARISM_SYSTEM_PROMPT,
  buildUserPrompt,
} from "../prompts/plagiarism.prompt.js";

const buildEndpoint = () =>
  `${config.llm.baseUrl.replace(/\/+$/, "")}/chat/completions`;

const readContent = (data) => {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }

  return "";
};

const mapProviderError = async (response) => {
  let body = "";
  try {
    body = (await response.text()).slice(0, 500);
  } catch {
    body = "";
  }
  console.error(
    `[llm.service] Provider responded with ${response.status}: ${body}`,
  );

  if (response.status === 401 || response.status === 403) {
    return new ApiError(
      502,
      "The LLM provider rejected the request credentials",
      "LLM_AUTH_FAILED",
    );
  }
  if (response.status === 429) {
    return new ApiError(
      503,
      "The LLM provider is rate limiting requests. Please try again shortly.",
      "LLM_RATE_LIMITED",
    );
  }
  return new ApiError(
    502,
    "The LLM provider returned an error",
    "LLM_REQUEST_FAILED",
  );
};

/**
 * Sends the source and student text to an OpenAI-compatible chat completions API.
 * Returns the raw model output; parsing and validation happen in plagiarism.service.js.
 */
export const analyzePlagiarism = async (sourceText, studentText) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);

  try {
    const response = await fetch(buildEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.model,
        temperature: 0,
        messages: [
          { role: "system", content: PLAGIARISM_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(sourceText, studentText) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await mapProviderError(response);
    }

    const data = await response.json();
    const content = readContent(data);

    if (!content.trim()) {
      throw new ApiError(
        502,
        "The LLM returned an empty response",
        "LLM_EMPTY_RESPONSE",
      );
    }

    return { content, model: config.llm.model };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error.name === "AbortError") {
      throw new ApiError(
        504,
        "The LLM request timed out. Please try again or submit a shorter document.",
        "LLM_TIMEOUT",
      );
    }

    console.error("[llm.service] Request failed:", error.message);
    throw new ApiError(
      502,
      "Unable to reach the LLM provider",
      "LLM_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timer);
  }
};
