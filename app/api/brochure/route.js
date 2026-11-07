import { getPresetById } from "@/lib/presets";
import { runBrochurePipeline } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * NDJSON stream: one JSON object per line.
 * { type: 'step', ... } | { type: 'brochure', chunk } | { type: 'done' } | { type: 'error', message }
 */
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(ip);

    if (!limit.allowed) {
      return Response.json(
        {
          error: "Daily limit reached. Try again tomorrow.",
          resetAt: limit.resetAt,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const presetId = body?.presetId;

    if (!presetId || typeof presetId !== "string") {
      return Response.json(
        { error: "presetId is required" },
        { status: 400 }
      );
    }

    const preset = getPresetById(presetId);
    if (!preset) {
      return Response.json(
        { error: "Unknown preset. Only curated demo companies are allowed." },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        };

        try {
          for await (const event of runBrochurePipeline(
            preset.name,
            preset.url
          )) {
            send(event);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Pipeline failed";
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
