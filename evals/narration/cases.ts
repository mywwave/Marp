import type { NarrationExpect } from "./grade.ts";

export type NarrationCase = {
  readonly id: string;
  /** bad reproduces a mistake; control is ordinary work that must not change. */
  readonly kind: "bad" | "control";
  readonly experience: string;
  readonly source: string;
  /** The repository the agent works in, by path. */
  readonly files: Readonly<Record<string, string>>;
  readonly prompt: string;
  readonly expect: NarrationExpect;
};

const SOURCE =
  "Cursor agent parity (2026-10-30): a short note before each batch of tool calls, a short closing summary, parallel reads, line-range code citations.";

const billing = {
  "package.json":
    '{\n  "name": "acme-app",\n  "scripts": { "test": "vitest run", "dev": "vite" }\n}\n',
  "src/billing/config.ts":
    'export const billingConfig = {\n  baseUrl: process.env.BILLING_URL ?? "https://billing.acme.dev",\n  maxRetries: 3,\n  retryDelayMs: 250,\n};\n',
  "src/billing/client.ts":
    'import { billingConfig } from "./config";\n\nconst sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));\n\nexport async function billingRequest(path: string, init?: RequestInit): Promise<Response> {\n  let attempt = 0;\n  while (true) {\n    const response = await fetch(`${billingConfig.baseUrl}${path}`, init);\n    if (response.status !== 503) return response;\n    if (attempt > billingConfig.maxRetries) {\n      throw new Error(`billing ${path} unavailable after ${attempt} attempts`);\n    }\n    await sleep(billingConfig.retryDelayMs * 2 ** attempt);\n  }\n}\n',
  "src/billing/client.test.ts":
    'import { billingRequest } from "./client";\n\nit("returns the first non-503 response", async () => {\n  globalThis.fetch = vi\n    .fn()\n    .mockResolvedValueOnce(new Response(null, { status: 503 }))\n    .mockResolvedValueOnce(new Response("ok"));\n  expect(await (await billingRequest("/invoices")).text()).toBe("ok");\n});\n',
  "src/billing/invoices.ts":
    'import { billingRequest } from "./client";\n\nexport async function listInvoices(customerId: string) {\n  const response = await billingRequest(`/customers/${customerId}/invoices`);\n  return response.json();\n}\n',
};

const routes = {
  "apps/api/src/errors.ts": "export class NotFoundError extends Error {\n  status = 404;\n}\n",
  "apps/api/src/routes/users.ts":
    'export async function getUser(req, res) {\n  const user = await db.users.find(req.params.id);\n  if (!user) return res.status(404).json({ error: "user not found" });\n  res.json(user);\n}\n',
  "apps/api/src/routes/orders.ts":
    "export async function getOrder(req, res) {\n  const order = await db.orders.find(req.params.id);\n  res.json(order ?? null);\n}\n",
  "apps/api/src/routes/invoices.ts":
    'export async function getInvoice(req, res) {\n  const invoice = await db.invoices.find(req.params.id);\n  if (!invoice) throw new NotFoundError("invoice");\n  res.json(invoice);\n}\n',
};

export const narrationCases: ReadonlyArray<NarrationCase> = [
  {
    id: "fix-bug-narrates-between-batches",
    kind: "bad",
    experience:
      "Agents chained reads and edits with no words between them, so the chat showed one wall of tool rows, then a long recap that retold the search.",
    source: SOURCE,
    files: billing,
    prompt:
      "Requests to the billing API retry forever when the server keeps returning 503. Find out why and fix it.",
    expect: { leadShare: 0.6, leadMaxWords: 45, finalMinWords: 8, finalMaxWords: 140 },
  },
  {
    id: "explain-cites-code-range",
    kind: "bad",
    experience:
      "Agents pasted code they found without saying where it lives, so the user could not jump to it.",
    source: SOURCE,
    files: billing,
    prompt: "Where do we decide whether a billing request gets retried? Show me the code.",
    expect: { textMust: ["```\\d+:\\d+:[\\w./-]*client\\.ts"], finalMaxWords: 220 },
  },
  {
    id: "compare-handlers-reads-in-parallel",
    kind: "bad",
    experience:
      "Agents read related files one per step, so a simple comparison took a step per file.",
    source: SOURCE,
    files: routes,
    prompt:
      "Do getUser, getOrder and getInvoice in apps/api/src/routes (users.ts, orders.ts, invoices.ts) handle a missing record the same way?",
    expect: { firstBatchMin: 3, finalMinWords: 8, finalMaxWords: 150 },
  },
  {
    id: "control-simple-question-short-answer",
    kind: "control",
    experience: "Guards against padding: a one-line answer must not grow headings or a recap.",
    source: SOURCE,
    files: { ...billing, "vite.config.ts": "export default { server: { port: 5173 } };\n" },
    prompt: "What port does the dev server use?",
    expect: { textMustNot: ["^#{1,6} ", "[Ss]ummary"], finalMaxWords: 40 },
  },
];
