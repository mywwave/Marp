import type { APIRoute } from "astro";

import { buildMarpProjectFileJsonSchema } from "@marp/shared/marpProjectFile";

export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(buildMarpProjectFileJsonSchema(), null, 2)}\n`, {
    headers: { "Content-Type": "application/json" },
  });
