import http from "node:http";

import { afterEach, expect, test } from "vite-plus/test";

import { findAvailablePort, startProxyGateway } from "../src";
import type { ProxyGateway } from "../src";

interface CapturedRequest {
  authorization?: string;
  body: string;
  method?: string;
  path?: string;
}

let activeGateway: ProxyGateway | undefined;
let activeServer: http.Server | undefined;

afterEach(async () => {
  await activeGateway?.stop();
  activeGateway = undefined;

  await new Promise<void>((resolve, reject) => {
    if (!activeServer) {
      resolve();
      return;
    }
    activeServer.close((error) => {
      activeServer = undefined;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

test("proxy package can generate config, boot Plano's native gateway, and proxy a full chat completion flow", async () => {
  const upstreamPort = await findAvailablePort();
  const gatewayPort = await findAvailablePort();
  const internalPort = await findAvailablePort();
  const brightstaffPort = await findAvailablePort();
  const adminPort = await findAvailablePort();

  const capturedRequests: CapturedRequest[] = [];

  activeServer = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    request.on("end", () => {
      capturedRequests.push({
        authorization: request.headers.authorization,
        body: Buffer.concat(chunks).toString("utf8"),
        method: request.method,
        path: request.url,
      });

      response.writeHead(200, {
        "content-type": "application/json",
      });
      response.end(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              index: 0,
              message: {
                content: "hello from the mock upstream",
                role: "assistant",
              },
            },
          ],
          created: 0,
          id: "chatcmpl_test",
          model: "mock-model",
          object: "chat.completion",
          usage: {
            completion_tokens: 4,
            prompt_tokens: 4,
            total_tokens: 8,
          },
        }),
      );
    });
  });

  await new Promise<void>((resolve, reject) => {
    activeServer!.listen(upstreamPort, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  activeGateway = await startProxyGateway({
    cleanupOnStop: true,
    ports: {
      admin: adminPort,
      brightstaff: brightstaffPort,
      gateway: gatewayPort,
      internal: internalPort,
    },
    providers: [
      {
        apiKey: "sk-test",
        baseUrl: `http://127.0.0.1:${upstreamPort}/upstream`,
        default: true,
        model: "openai/mock-model",
      },
    ],
  });

  const firstResponse = await fetch(`${activeGateway.gatewayUrl}/v1/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "say hello",
          role: "user",
        },
      ],
      model: "openai/mock-model",
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  expect(firstResponse.status).toBe(200);
  await expect(firstResponse.json()).resolves.toMatchObject({
    choices: [
      {
        message: {
          content: "hello from the mock upstream",
        },
      },
    ],
  });

  const modelsResponse = await fetch(`${activeGateway.gatewayUrl}/v1/models`);
  expect(modelsResponse.status).toBe(200);
  await expect(modelsResponse.json()).resolves.toMatchObject({
    data: [
      {
        id: "openai/mock-model",
      },
    ],
  });

  expect(capturedRequests).toHaveLength(1);

  const parsedBody = JSON.parse(capturedRequests[0]!.body) as {
    messages: Array<{ content: string; role: string }>;
    model: string;
  };

  expect(capturedRequests[0]).toMatchObject({
    authorization: "Bearer sk-test",
    method: "POST",
    path: "/upstream/chat/completions",
  });
  expect(parsedBody.model).toBe("mock-model");
  expect(parsedBody.messages[0]?.content).toBe("say hello");
}, 300_000);
