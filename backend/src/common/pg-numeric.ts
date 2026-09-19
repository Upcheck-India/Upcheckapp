import { types } from 'pg';

/**
 * Postgres NUMERIC/DECIMAL (oid 1700) → JS number, process-wide.
 *
 * node-postgres returns NUMERIC as a string by default (it can exceed double
 * precision). Every money column here is decimal(15,2) or a plain numeric of
 * farm-sized values, all well inside a double's 15 significant digits, so the
 * string bought nothing but bugs: `'50000.00' + '25000.00'` rendered a cycle's
 * revenue as `050000.0025000.00`. Consumers that already wrap in Number() keep
 * working; ones that did string maths or `!==` against a number now get
 * numbers. Imported once, for its side effect, by app.module.ts.
 *
 * ponytail: global parser, not per-column transformers. If a column ever needs
 * more than 15 significant digits, give that column a string transformer.
 */
export const NUMERIC_OID = 1700;

types.setTypeParser(NUMERIC_OID, (v: string) => parseFloat(v));
