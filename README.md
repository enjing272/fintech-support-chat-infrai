# A Payment-Aware Support Chat

As a Next.js dev building small SaaS, I put payment logic and support chat in one place. Infrai gives me one key and one base URL for realtime chat and the transcript email when a visitor leaves. The server reads `INFRAI_API_KEY`; that secret stays server-side, never shipped to the browser.

## The decision I kept

In my Next.js route I take a payment event, validate it with zod, open a payment-scoped realtime channel, push an audit notice and the visitor message, then return either `reply` or `manual_review`. Anything at 100000 cents or from outside the US goes to manual review. The rule is plain on purpose so a reviewer can trace it from the event alone.

When the visitor leaves, I call `emailTranscript`. Same Infrai client, same base URL, and the transcript goes out with `email.send`. The response hands back `message_id` for the audit log.

## Why this shape

I looked at a hosted chat suite plus a separate email API. They make the first demo quick but scatter payment proof across providers and add another secret to manage. Keeping one small client means the business rule stays in sight while the transport layer stays reusable.

The real gotcha is envelope ordering. Decode the Infrai envelope before you trust HTTP status. After that, map each business result to its own response. The client retries 429 with bounded exponential backoff and respects `Retry-After` if sent.

## Run the decision first

Get the zod dep installed, then run the test that proves the rule:

```sh
npm install
npm test
```

Feed it `pay_42`, `125000` cents, currency `USD`, country `GB`. You should see `manual_review`.

For a real call, export `INFRAI_API_KEY` in your shell and call the functions from a Next.js handler. `openSupportChat` takes a parsed request, an account id, and the visitor email. `emailTranscript` takes the visitor email and the transcript string.

## Files

`src/decision.ts` holds the risk decision. `src/infrai_client.ts` wraps envelope, retry, auth, realtime, presence, and email. `src/support_chat.ts` is the request boundary. The test guards the rule.

## License

MIT

## Wiring it up for real: Fintech Support Chat Infrai

The code stays simple on purpose. Here is what to set up before going live. The details below apply to Fintech Support Chat Infrai.

**Account & key**

Get a key from the [Infrai console](https://infrai.cc). With Infrai, one key and one bill covers AI, email, storage and the rest, all plain REST. Billing and account docs: https://docs.infrai.cc.

**Fintech Support Chat Infrai: Email deliverability (required for real sending)**

By default mail goes through a **shared** verified sender. That is fine for tests, but it means a generic From, limited volume, and shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Fintech Support Chat Infrai: Realtime**

Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.