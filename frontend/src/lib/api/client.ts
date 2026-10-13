import createClient, { type Middleware } from "openapi-fetch";

import { apiErrorFromResponse, networkError } from "@/lib/api/problem";
import type { paths } from "@/lib/api/schema";
import { userTimeZone } from "@/lib/dates";

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const requestContext: Middleware = {
  onRequest({ request }) {
    request.headers.set("X-Timezone", userTimeZone());
    request.headers.set("X-Request-ID", crypto.randomUUID());
    return request;
  },
  async onResponse({ response }) {
    if (!response.ok) {
      throw await apiErrorFromResponse(response);
    }
    return response;
  },
  onError({ error }) {
    return isAbort(error) ? undefined : networkError();
  },
};

export const api = createClient<paths>({ baseUrl: "" });
api.use(requestContext);

type FetchResult<Data> = { data?: Data; response: Response };

export async function unwrap<Data>(result: Promise<FetchResult<Data>>): Promise<Data> {
  const { data, response } = await result;
  if (data === undefined) {
    throw await apiErrorFromResponse(response);
  }
  return data;
}
