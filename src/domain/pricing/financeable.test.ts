import { beforeAll, describe, expect, it } from 'vitest';
import { loadCoefficientTable, loadPriceLists, loadVatRates } from '@/data/load';
import type { PriceList } from '@/data/schemas';
import { financeOffer } from './financeable';
import type { PricingData } from './quote';

let data: PricingData;
beforeAll(async () => {
  data = {
    priceLists: await loadPriceLists(),
    table: await loadCoefficientTable(),
    vatRates: await loadVatRates(),
  };
});

const THURSDAY = '2026-11-05'; // price list 1
const FRIDAY = '2026-11-06'; // price list 2: e-bikes +5 %

describe('financeOffer', () => {
  it('gives the plain offer, one unit and nothing down, when that can be financed', () => {
    const offer = financeOffer(data, { assetId: 'ebike-003', termMonths: 36, isoDate: THURSDAY });
    expect(offer.kind).toBe('standard');
    expect(offer.kind === 'standard' && offer.quote.monthlyGrossCents).toBe(13_466);
  });

  it('suggests two units of the kids bike, 289 € on price list 1, under the 300 € minimum', () => {
    const offer = financeOffer(data, { assetId: 'ebike-010', termMonths: 36, isoDate: THURSDAY });
    expect(offer).toMatchObject({ kind: 'needs_quantity', quantity: 2 });
    expect(offer.kind === 'needs_quantity' && offer.quote.financedCents).toBe(57_800);
  });

  it('gives the kids bike the plain offer on Friday, when price list 2 puts it at 303 €', () => {
    const offer = financeOffer(data, { assetId: 'ebike-010', termMonths: 36, isoDate: FRIDAY });
    expect(offer.kind).toBe('standard');
    expect(offer.kind === 'standard' && offer.quote.financedCents).toBe(30_300);
  });

  it('suggests 10 000 € down for the 260 000 € combine, leaving exactly the 250 000 € maximum', () => {
    const offer = financeOffer(data, { assetId: 'farm-006', termMonths: 48, isoDate: THURSDAY });
    expect(offer).toMatchObject({ kind: 'needs_down_payment', downPaymentCents: 1_000_000 });
    expect(offer.kind === 'needs_down_payment' && offer.quote.financedCents).toBe(25_000_000);
    expect(offer.kind === 'needs_down_payment' && offer.quote.band).toBe('D');
  });

  it('rounds the quantity up when the minimum is not a whole number of units', () => {
    // 110 € a unit: two make 220 €, three make 330 €, the first over 300 €.
    const cheap: PriceList[] = [
      { ...data.priceLists[0]!, valid_to: null, prices: { 'test-cheap': 11_000 } },
    ];
    const offer = financeOffer(
      { ...data, priceLists: cheap },
      { assetId: 'test-cheap', termMonths: 12, isoDate: '2026-06-01' }
    );
    expect(offer).toMatchObject({ kind: 'needs_quantity', quantity: 3 });
  });

  it('gives up when even the most units the catalogue suggests stay under the minimum', () => {
    const tiny: PriceList[] = [
      { ...data.priceLists[0]!, valid_to: null, prices: { 'test-tiny': 100 } },
    ];
    const offer = financeOffer(
      { ...data, priceLists: tiny },
      { assetId: 'test-tiny', termMonths: 12, isoDate: '2026-06-01' }
    );
    expect(offer).toMatchObject({ kind: 'none', reason: { code: 'below_minimum' } });
  });

  it('passes other refusals through, such as an unknown asset or term', () => {
    expect(
      financeOffer(data, { assetId: 'nope', termMonths: 36, isoDate: THURSDAY })
    ).toMatchObject({ kind: 'none', reason: { code: 'unknown_asset' } });
    expect(
      financeOffer(data, { assetId: 'ebike-003', termMonths: 30, isoDate: THURSDAY })
    ).toMatchObject({ kind: 'none', reason: { code: 'unknown_term' } });
  });
});
