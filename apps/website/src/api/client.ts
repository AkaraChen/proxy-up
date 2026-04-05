import { hc } from "hono/client";
import type { AppType } from "../../../../packages/server/src/index";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const apiClient = hc<AppType>(API_BASE_URL);
