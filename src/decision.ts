export type PaymentEvent = {
  paymentId: string;
  amountCents: number;
  currency: string;
  country: string;
  customerMessage: string;
};

export type SupportDecision = "reply" | "manual_review";

export function decideSupportAction(event: PaymentEvent): SupportDecision {
  return event.amountCents >= 100000 || event.country !== "US" ? "manual_review" : "reply";
}

export function auditNotice(event: PaymentEvent, decision: SupportDecision): string {
  return [
    `payment=${event.paymentId}`,
    `amount=${event.currency} ${event.amountCents}`,
    `decision=${decision}`,
  ].join(" | ");
}
