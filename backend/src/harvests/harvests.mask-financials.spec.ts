import { maskFinancials } from './harvests.service';

/**
 * F5 test gate: a money photo (the buyer's weighing slip) is not returned
 * without VIEW_FINANCIALS — same rule as the sale price it sits beside.
 */
describe('maskFinancials — weighing slip is money too (F5)', () => {
  const row = {
    salePriceTotal: 50000,
    buyerName: 'Trader Co',
    photoPaths: ['f1/a.jpg', 'f1/b.jpg'],
  };

  it('strips photoPaths (and price/buyer) without VIEW_FINANCIALS', () => {
    const masked = maskFinancials(row, false);
    expect(masked.photoPaths).toEqual([]);
    expect(masked.salePriceTotal).toBeNull();
    expect(masked.buyerName).toBeNull();
  });

  it('keeps photoPaths untouched WITH VIEW_FINANCIALS', () => {
    const visible = maskFinancials(row, true);
    expect(visible.photoPaths).toEqual(['f1/a.jpg', 'f1/b.jpg']);
    expect(visible.salePriceTotal).toBe(50000);
  });

  it('does nothing to photoPaths when the row never carried it (no key added)', () => {
    const masked = maskFinancials({ salePriceTotal: 1, buyerName: 'x' }, false);
    expect('photoPaths' in masked).toBe(false);
  });
});
