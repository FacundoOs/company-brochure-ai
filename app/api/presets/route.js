import { PRESETS } from "@/lib/presets";

export async function GET() {
  return Response.json({ presets: PRESETS });
}
