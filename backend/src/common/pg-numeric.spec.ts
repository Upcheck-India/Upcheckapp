import { types } from 'pg';
import { NUMERIC_OID } from './pg-numeric';

// B3: decimal columns came back as strings, so two sale prices concatenated.
describe('pg NUMERIC type parser', () => {
  const parse = types.getTypeParser(NUMERIC_OID, 'text') as (v: string) => unknown;

  it('parses NUMERIC to a number', () => {
    expect(parse('50000.00')).toBe(50000);
  });

  it('two decimal(15,2) prices sum numerically', () => {
    expect((parse('50000.00') as number) + (parse('25000.00') as number)).toBe(
      75000,
    );
  });
});
