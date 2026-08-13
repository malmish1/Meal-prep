import { isRecipeResult, recipeSchema } from "./schema";

type Env = { OPENAI_API_KEY: string; ALLOWED_ORIGIN: string };
const localOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = origin === env.ALLOWED_ORIGIN || localOrigins.has(origin);
    const headers = corsHeaders(allowed ? origin : env.ALLOWED_ORIGIN);
    if (request.method === "OPTIONS") return allowed ? new Response(null, { status: 204, headers }) : json({ error: "origin_not_allowed" }, 403, headers);
    if (!allowed) return json({ error: "origin_not_allowed" }, 403, headers);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);

    let images: unknown;
    try { ({ images } = await request.json() as { images?: unknown }); }
    catch { return json({ error: "invalid_request" }, 400, headers); }
    if (!Array.isArray(images) || images.length < 1 || images.length > 6 ||
        images.some((image) => typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 8_000_000))
      return json({ error: "invalid_images" }, 400, headers);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40_000);
    try {
      const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4.1-mini-2025-04-14",
          store: false,
          max_output_tokens: 2500,
          input: [{ role: "user", content: [
            { type: "input_text", text: recipePrompt },
            ...images.map((image) => ({ type: "input_image", image_url: image, detail: "high" })),
          ] }],
          text: { format: { type: "json_schema", name: "meal_prep_recipe", strict: true, schema: recipeSchema } },
        }),
      });
      if (!openAiResponse.ok) {
        const status = openAiResponse.status === 429 ? 429 : openAiResponse.status === 402 ? 402 : 503;
        return json({ error: status === 429 ? "rate_limit" : status === 402 ? "spend_limit" : "upstream_unavailable" }, status, headers);
      }
      const payload = await openAiResponse.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
      const text = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!text) return json({ error: "malformed_model_response" }, 502, headers);
      const result: unknown = JSON.parse(text);
      if (!isRecipeResult(result)) return json({ error: "malformed_model_response" }, 502, headers);
      return json(result, 200, headers);
    } catch {
      return json({ error: "upstream_unavailable" }, 503, headers);
    } finally { clearTimeout(timeout); }
  },
};

const recipePrompt = `Interpret all attached screenshots, in their given order, as ONE recipe. Semantically distinguish title, introduction, ingredients, instructions, servings, nutrition and source. Ignore phone clock, status bar, browser/navigation/social controls, likes, comments, ads and unrelated recommendations. Remove overlap duplicates across screenshots. Never invent missing quantities, ingredients, times, temperatures, servings or nutrition: use null/empty values and a short Swedish warning. Mark an ingredient uncertain when its name, amount or unit cannot be read confidently. Confidence values must be 0–1. Return only the required structured result.`;

function corsHeaders(origin: string) {
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin", "Cache-Control": "no-store" };
}
function json(value: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
