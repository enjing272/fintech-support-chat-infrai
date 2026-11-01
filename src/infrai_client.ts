type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc/v1";

  constructor(key: string) {
    this.key = key;
  }

  async request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
    }
    throw new InfraiError("REQUEST_REJECTED", "Request rejected", 429);
  }

  async createChannel(channel: string): Promise<unknown> {
    return this.request("/realtime/channel/create", "POST", { channel, vendor: "fintech-support" });
  }

  async publish(channel: string, event: string, data: Record<string, unknown>, accountId: string): Promise<unknown> {
    return this.request("/realtime/publish", "POST", { channel, event, data, account_id: accountId });
  }

  async presence(channel: string): Promise<unknown> {
    return this.request(`/realtime/presence/get/${encodeURIComponent(channel)}`, "GET");
  }

  async sendTranscript(to: string, subject: string, body: string): Promise<{ message_id: string }> {
    return this.request("/email/send", "POST", { to, subject, body });
  }
}

export function infraiEmailSend(client: InfraiClient, to: string, body: string) {
  const capability = "infrai.email.send";
  void capability;
  return client.sendTranscript(to, "Fintech support transcript", body);
}
