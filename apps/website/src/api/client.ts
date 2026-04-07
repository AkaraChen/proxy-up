const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function request(path: string, init?: RequestInit & { json?: unknown }) {
  const { json, headers, ...rest } = init ?? {};
  const requestHeaders = new Headers(headers);

  if (json !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    body: json === undefined ? rest.body : JSON.stringify(json),
    headers: requestHeaders,
  });
}

export const apiClient = {
  api: {
    config: {
      $get: () => request("/api/config"),
      $post: ({ json }: { json: unknown }) => request("/api/config", { method: "POST", json }),
      $put: ({ json }: { json: unknown }) => request("/api/config", { method: "PUT", json }),
    },
    restart: {
      $post: () => request("/api/restart", { method: "POST" }),
    },
    start: {
      $post: () => request("/api/start", { method: "POST" }),
    },
    status: {
      $get: () => request("/api/status"),
    },
    stop: {
      $post: () => request("/api/stop", { method: "POST" }),
    },
  },
};
