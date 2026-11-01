import { z } from "zod";
import { pathToFileURL } from "node:url";
import { auditNotice, decideSupportAction, type PaymentEvent } from "./decision.ts";
import { InfraiClient, infraiEmailSend } from "./infrai_client.ts";

export const paymentEventSchema = z.object({
  paymentId: z.string().min(1), amountCents: z.number().int().nonnegative(), currency: z.string().length(3), country: z.string().length(2), customerMessage: z.string().min(1),
});

export async function openSupportChat(input: unknown, accountId: string, visitorEmail: string) {
  const event = paymentEventSchema.parse(input) as PaymentEvent;
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const client = new InfraiClient(key);
  const channel = `payment-support-${event.paymentId}`;
  await client.createChannel(channel);
  const decision = decideSupportAction(event);
  await client.publish(channel, "payment.audit", { notice: auditNotice(event, decision) }, accountId);
  await client.publish(channel, "visitor.message", { text: event.customerMessage }, accountId);
  return { channel, decision };
}

export async function emailTranscript(visitorEmail: string, transcript: string) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return infraiEmailSend(new InfraiClient(key), visitorEmail, transcript);
}

async function runFromEnvironment() {
  const event = process.env.INFRAI_PAYMENT_EVENT;
  const accountId = process.env.INFRAI_ACCOUNT_ID;
  const visitorEmail = process.env.INFRAI_VISITOR_EMAIL;
  if (!event || !accountId || !visitorEmail) {
    throw new Error("INFRAI_PAYMENT_EVENT, INFRAI_ACCOUNT_ID, and INFRAI_VISITOR_EMAIL are required");
  }

  const result = await openSupportChat(JSON.parse(event), accountId, visitorEmail);
  const transcript = `channel=${result.channel} | decision=${result.decision}`;
  const email = await emailTranscript(visitorEmail, transcript);
  console.log(JSON.stringify({ ...result, message_id: email.message_id }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFromEnvironment().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
