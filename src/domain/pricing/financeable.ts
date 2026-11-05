// How an item can be financed (the catalogue's "from" offer). The coefficient table limits the
// amount financed, not the item's price, so an item outside the bands is not unleasable:
// - below the lowest band (ebike-010 at 289 € on price list 1): several units financed
//   together reach the minimum, so the offer is the smallest such quantity;
// - above the highest band (farm-006 at 260 000 €): a down payment brings the financed amount
//   down to the maximum, so the offer is that down payment.
// Everything else is the plain offer: one unit, nothing down. Pure; the caller passes the day.
import { priceQuote, type PricingData, type QuoteBreakdown, type QuoteRefusal } from './quote';

export type FinanceOffer =
  | { kind: 'standard'; quote: QuoteBreakdown }
  | { kind: 'needs_quantity'; quantity: number; quote: QuoteBreakdown }
  | { kind: 'needs_down_payment'; downPaymentCents: number; quote: QuoteBreakdown }
  | { kind: 'none'; reason: QuoteRefusal };

/** The most units the catalogue suggests financing together (the price page allows 20). */
export const MAX_SUGGESTED_QUANTITY = 20;

export function financeOffer(
  data: PricingData,
  input: { assetId: string; termMonths: number; isoDate: string }
): FinanceOffer {
  const base = { ...input, quantity: 1, downPaymentCents: 0 };
  const plain = priceQuote(data, base);
  if (plain.ok) return { kind: 'standard', quote: plain.quote };

  const { reason } = plain;
  if (reason.code === 'below_minimum') {
    // financed = unit price × quantity; the smallest quantity that reaches the minimum.
    const unit = reason.params.financedCents;
    const quantity = Math.ceil(reason.params.minimumCents / unit);
    if (quantity <= MAX_SUGGESTED_QUANTITY) {
      const together = priceQuote(data, { ...base, quantity });
      if (together.ok) return { kind: 'needs_quantity', quantity, quote: together.quote };
    }
  }
  if (reason.code === 'above_maximum') {
    // Paying the excess at the start leaves exactly the maximum to finance (limits inclusive).
    const downPaymentCents = reason.params.financedCents - reason.params.maximumCents;
    const withDown = priceQuote(data, { ...base, downPaymentCents });
    if (withDown.ok) return { kind: 'needs_down_payment', downPaymentCents, quote: withDown.quote };
  }
  return { kind: 'none', reason };
}
