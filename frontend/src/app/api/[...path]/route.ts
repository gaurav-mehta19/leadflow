import { connection, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "x-timezone", "x-request-id"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "location", "x-request-id", "allow"];
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

function pick(source: Headers, names: readonly string[]): Headers {
  const picked = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value !== null) {
      picked.set(name, value);
    }
  }
  return picked;
}

function upstreamUrl(path: readonly string[], search: string): URL {
  const encodedPath = path.map(encodeURIComponent).join("/");
  return new URL(`/api/${encodedPath}${search}`, getServerEnv().API_INTERNAL_URL);
}

function badGateway(request: NextRequest): Response {
  const requestId = request.headers.get("x-request-id");
  return Response.json(
    {
      type: "https://leadflow.dev/problems/bad-gateway",
      title: "Can't reach the API",
      status: 502,
      detail: "The LeadFlow API isn't responding. Try again in a moment.",
      instance: request.nextUrl.pathname,
      request_id: requestId,
      errors: [],
    },
    { status: 502, headers: { "content-type": "application/problem+json" } },
  );
}

async function forward(
  request: NextRequest,
  context: RouteContext<"/api/[...path]">,
): Promise<Response> {
  await connection();
  const { path } = await context.params;
  const hasBody = !METHODS_WITHOUT_BODY.has(request.method);
  try {
    const upstream = await fetch(upstreamUrl(path, request.nextUrl.search), {
      method: request.method,
      headers: pick(request.headers, FORWARDED_REQUEST_HEADERS),
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: pick(upstream.headers, FORWARDED_RESPONSE_HEADERS),
    });
  } catch {
    return badGateway(request);
  }
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST };
