import assert from "node:assert/strict";
import test from "node:test";
import { decideSupportAction } from "../src/decision.ts";

test("a cross-border high-value payment goes to manual review", () => {
  assert.equal(decideSupportAction({ paymentId: "pay_42", amountCents: 125000, currency: "USD", country: "GB", customerMessage: "Please check this payment" }), "manual_review");
});
