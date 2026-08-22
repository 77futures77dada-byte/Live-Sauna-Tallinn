import { GoogleGenAI, Type } from "@google/genai";
import type { Locale } from "@/lib/i18n";
import type { IceCondition, LocationType } from "@/lib/supabase/types";

// See docs/ARCHITECTURE.md section 7 for the two-call flow this
// implements: extractIntent() classifies the question (structured JSON,
// no real data involved yet), the route assembles real Supabase/weather
// data for that intent, then formulateAnswer() narrates it — Gemini
// never invents occupancy/temperature/ice numbers itself, it only
// describes what the server already computed.
// "-latest" alias rather than a pinned version — Gemini model versions
// get retired periodically ("no longer available to new users") and this
// keeps the assistant on whatever Google currently recommends as their
// fast/cheap tier instead of needing a code change each time.
const MODEL = "gemini-flash-latest";

let client: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export type AssistantMetric = "occupancy" | "water_temp" | "ice" | "distance" | "general";
export type AssistantOrder = "asc" | "desc";

export interface AssistantIntent {
  metric: AssistantMetric;
  order: AssistantOrder;
  locationType: LocationType | "any";
  needsUserLocation: boolean;
}

const LOCATION_TYPES: LocationType[] = [
  "sauna",
  "winter_swimming",
  "beach",
  "ice_swimming",
  "sauna_swimming",
];

const INTENT_SYSTEM_PROMPT = `You classify questions asked inside "Live Sauna Tallinn", a live tracker for public saunas, winter-swimming spots, and beaches in Tallinn, Estonia. The question may be written in Estonian, Russian, or English — classify it regardless of language.

Pick the single metric the question is really asking about:
- "occupancy": how crowded/busy/empty a place is
- "water_temp": water temperature
- "ice": ice/frozen condition
- "distance": which place is nearest/closest to the visitor
- "general": anything else (opening hours, what a place is like, free-form questions)

Pick "order":
- "asc" for least/coldest/nearest/emptiest
- "desc" for most/warmest/busiest/most frozen
(irrelevant for "general" — just return "asc")

Pick "locationType" only if the question clearly names a type of place, otherwise "any": sauna, winter_swimming, beach, ice_swimming, sauna_swimming, any.

Set "needsUserLocation" to true only if answering requires knowing where the visitor currently is (e.g. "nearest to me").

Examples:
"Kus on kõige vähem inimesi?" -> {"metric":"occupancy","order":"asc","locationType":"any","needsUserLocation":false}
"Где сейчас меньше всего людей?" -> {"metric":"occupancy","order":"asc","locationType":"any","needsUserLocation":false}
"Which place is least busy right now?" -> {"metric":"occupancy","order":"asc","locationType":"any","needsUserLocation":false}
"Kus on kõige külmem vesi?" -> {"metric":"water_temp","order":"asc","locationType":"any","needsUserLocation":false}
"Where's the warmest water?" -> {"metric":"water_temp","order":"desc","locationType":"any","needsUserLocation":false}
"Milline saun on mulle kõige lähemal?" -> {"metric":"distance","order":"asc","locationType":"sauna","needsUserLocation":true}
"Какой пляж ближе всего ко мне?" -> {"metric":"distance","order":"asc","locationType":"beach","needsUserLocation":true}
"Is there ice at Pirita right now?" -> {"metric":"ice","order":"desc","locationType":"any","needsUserLocation":false}
"What are Harku's opening hours?" -> {"metric":"general","order":"asc","locationType":"any","needsUserLocation":false}`;

function sanitizeIntent(raw: unknown): AssistantIntent {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const metric: AssistantMetric = (
    ["occupancy", "water_temp", "ice", "distance", "general"] as const
  ).includes(obj.metric as AssistantMetric)
    ? (obj.metric as AssistantMetric)
    : "general";
  const order: AssistantOrder = obj.order === "desc" ? "desc" : "asc";
  const locationType: LocationType | "any" = LOCATION_TYPES.includes(obj.locationType as LocationType)
    ? (obj.locationType as LocationType)
    : "any";

  return {
    metric,
    order,
    locationType,
    // Distance is meaningless without the visitor's coordinates —
    // enforced here regardless of whether the model flagged it.
    needsUserLocation: metric === "distance" ? true : obj.needsUserLocation === true,
  };
}

export async function extractIntent(query: string): Promise<AssistantIntent> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: query,
    config: {
      systemInstruction: INTENT_SYSTEM_PROMPT,
      // Classification, not creative writing — low temperature keeps the
      // same question mapping to the same intent run to run.
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metric: {
            type: Type.STRING,
            enum: ["occupancy", "water_temp", "ice", "distance", "general"],
          },
          order: { type: Type.STRING, enum: ["asc", "desc"] },
          locationType: { type: Type.STRING, enum: [...LOCATION_TYPES, "any"] },
          needsUserLocation: { type: Type.BOOLEAN },
        },
        required: ["metric", "order", "locationType", "needsUserLocation"],
      },
    },
  });

  return sanitizeIntent(JSON.parse(response.text ?? "{}"));
}

export interface LocationSnapshot {
  id: string;
  slug: string;
  name: string;
  type: LocationType;
  occupancy: { peopleCount: number; minutesAgo: number } | null;
  waterTempC: { value: number; source: "report" | "station"; minutesAgo: number } | null;
  ice: { condition: IceCondition; minutesAgo: number } | null;
  distanceKm: number | null;
}

const localeLanguageName: Record<Locale, string> = {
  et: "Estonian",
  ru: "Russian",
  en: "English",
};

function buildAnswerSystemPrompt(locale: Locale): string {
  return `You are the AI assistant inside "Live Sauna Tallinn", a live tracker for public saunas, winter-swimming spots, and beaches in Tallinn, Estonia.

Reply in ${localeLanguageName[locale]}, regardless of what language the question was asked in.

You will be given the visitor's question and a JSON snapshot of real, freshly-fetched data for each candidate location (occupancy, water temperature, ice condition, distance — each either a real reading with its age in minutes, or null meaning no fresh data exists right now).

Hard rules:
- Answer strictly what the question asks about (the "intent.metric" field tells you which: occupancy, water_temp, ice, distance, or general). Do not switch topics — e.g. if asked about occupancy/crowds and every location's occupancy is null, say there's no fresh crowd data right now. Do NOT answer with water temperature or any other field instead just because it happens to be available; that would misleadingly look like an answer to a question it doesn't answer.
- Use ONLY the numbers and facts in the JSON snapshot. Never invent, estimate, or guess an occupancy count, temperature, ice condition, or distance.
- The snapshot ONLY contains occupancy, water temperature, ice condition, and distance — it has no opening hours, prices, amenities, rules, or other facts about a location. If "intent.metric" is "general" or the question asks about anything not present in the snapshot (e.g. opening hours, price, facilities, how to get there, rules), do NOT guess or make up an answer — say plainly that you don't have that information and suggest checking the location's page in the app.
- If the data needed to answer is null for every location, or the location list is empty, say plainly that there's no fresh data for that right now — do not make one up and do not substitute a different metric.
- If a "topMatch" location is given, name it specifically in your answer.
- Keep the answer short: 1-3 sentences, friendly and practical, like a helpful local.
- Never mention "JSON", "snapshot", "data provided", or anything about how you work internally — just answer naturally.`;
}

export async function formulateAnswer(params: {
  locale: Locale;
  query: string;
  intent: AssistantIntent;
  snapshot: LocationSnapshot[];
  topMatch: LocationSnapshot | null;
}): Promise<string> {
  const ai = getClient();
  const payload = {
    question: params.query,
    intent: params.intent,
    locations: params.snapshot,
    topMatch: params.topMatch,
  };

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: JSON.stringify(payload),
    config: {
      systemInstruction: buildAnswerSystemPrompt(params.locale),
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty answer");
  return text;
}
