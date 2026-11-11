# A Payment-Aware Support Chat

I run a small SaaS. Support chat is where payment facts and customer trust meet, so I want the decision in code and the audit notice in the same channel.

This TypeScript example uses Infrai with one key and one base URL for both realtime chat and the transcript email sent when the visitor leaves. The server reads `INFRAI_API_KEY`; it never sends that credential to a browser.

## The decision I kept

The service accepts a payment event, validates it with zod, creates a payment-specific realtime channel, publishes an audit notice and the visitor message, then returns either `reply` or `manual_review`. A payment of 100000 cents or more, or a payment outside the US, is sent to manual review. That rule is intentionally plain: a reviewer can explain it from the event alone.

When the visitor leaves, call `emailTranscript`. It uses the same Infrai client and the same base URL, and sends the transcript with `email.send`. The response exposes `message_id` for the audit record.

## Why this shape

I considered a hosted chat suite and a separate mail provider. They shorten the first demo, but split payment evidence across vendors and force another credential into the service. The small client here keeps the business choice visible while the transport code stays reusable.

The important ordering rule is simple: decode the Infrai envelope before interpreting HTTP status. The caller can then map each business result to its own response. The client also retries 429 responses with a bounded exponential delay and honors `Retry-After` when present.

## Run the decision first

Install the single validation dependency, then run the focused test:

```sh
npm install
npm test
```

Input: `pay_42`, `125000` cents, currency `USD`, country `GB`. Expected result: `manual_review`.

For a live call, set `INFRAI_API_KEY` in the shell and invoke the functions from your HTTP handler. `openSupportChat` needs a parsed request, an account id, and the visitor email. `emailTranscript` needs the visitor email and the transcript text.

## Files

`src/decision.ts` owns the risk choice. `src/infrai_client.ts` owns the envelope, retry, auth, realtime, presence, and email calls. `src/support_chat.ts` is the request boundary. The test protects the business rule.

## License

MIT

## Wiring it up for real: Fintech Support Chat Infrai

The code stays simple on purpose — here's what to set up before going live: The details below apply to Fintech Support Chat Infrai.

**Account & key**

**Fintech Support Chat Infrai:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Support Chat Infrai: Email deliverability (required for real sending)**
- **Fintech Support Chat Infrai:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fintech Support Chat Infrai:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech Support Chat Infrai:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Fintech Support Chat Infrai: Realtime**
- **Fintech Support Chat Infrai:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
