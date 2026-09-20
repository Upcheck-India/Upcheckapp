// Empty state (segments breathe apart and back) and Harvest done (parts assemble, sparks burst).
const fs = require('fs'); const L = require('./lottie-lib');
const stat = L.stat;
const path = require('path');
const OUT = path.join(__dirname, '../../frontend/assets/lottie');

const BRAND = [[0, '#02C1E3'], [1, '#007CBC']], SOFT = [[0, '#C2F2FB'], [1, '#9FDDF0']];
const BLUE = '#0D84D6', GREEN = '#27A855', MUTED = '#A3B5BF', CYAN = '#00CDE8';
const subs = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'subpaths.json')));
const PARTS = [subs[0] + ' ' + subs[2], subs[4], subs[5], subs[6], subs[3], subs[1]];
const CENT = [[179, 217], [209, 319], [248, 360], [339, 362], [384, 283], [391, 188]]; // part centres
const MC = [256, 257];
const TR = () => ({ ty: 'tr', p: stat([0, 0]), a: stat([0, 0]), s: stat([100, 100]), r: stat(0), o: stat(100) });
const reindex = (ls) => ls.map((l, k) => ({ ...l, ind: k + 1 }));
const gf = (stops) => L.gfill(stops, [98, 103], [414, 410], true);
const out = (k, d) => { const dx = CENT[k][0] - MC[0], dy = CENT[k][1] - MC[1], n = Math.hypot(dx, dy); return [(dx / n) * d, (dy / n) * d]; };
const save = (f, nm, op, layers) => { f = path.join(OUT, f); fs.writeFileSync(f, JSON.stringify(L.comp(nm, op, reindex(layers)))); console.log(f, fs.statSync(f).size); };
// Mark part k as its own layer; scale S% about the mark centre, drawn at `at`.
const part = (k, S, at, extra = {}, fillItem = gf(BRAND), op = 60) => L.layer(0, 'part' + k, [...L.svgToShapes(PARTS[k]), fillItem], {
  a: stat([...MC, 0]), s: stat([S, S, 100]), p: stat([...at, 0]), ...extra,
}, op);

// ── EMPTY — A: "Breathing parts" (soft-blue mark whose segments drift apart and back) ──
{
  const OP = 120, S = 78, C = [256, 256];
  const layers = PARTS.map((_, k) => {
    const [ox, oy] = out(k, 9);
    const o = (f) => [C[0] + ox * f, C[1] + oy * f, 0];
    return part(k, S, C, { p: L.anim([[0, o(0), L.EASE], [60, o(1), L.EASE], [OP, o(0)]]) }, gf(SOFT), OP);
  });
  save('empty.json', 'Upcheck - Empty', OP, layers);
}

// ── HARVEST — A: "Assemble" (parts fly in and snap together, burst of dots) ──
{
  const OP = 54, S = 72, C = [256, 256];
  const layers = [];
  PARTS.forEach((_, k) => {
    const [ox, oy] = out(k, 120), t = k * 3;
    layers.push(part(k, S, C, {
      p: L.anim([[0, [C[0] + ox, C[1] + oy, 0]], [t, [C[0] + ox, C[1] + oy, 0], L.SNAPPY], [t + 14, [...C, 0]]]),
      r: L.anim([[0, k % 2 ? 20 : -20], [t, k % 2 ? 20 : -20, L.SNAPPY], [t + 14, 0]]),
      o: L.anim([[0, 0], [t, 0], [t + 5, 100]]),
      s: L.anim([[0, [S, S, 100]], [30, [S, S, 100], L.EASE], [34, [S * 1.06, S * 1.06, 100], L.EASE], [40, [S, S, 100]]]),
    }, gf(BRAND), OP));
  });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2, r0 = 150, r1 = 205, col = k % 2 ? CYAN : BLUE;
    const pt = (r) => [256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 0];
    layers.push(L.layer(0, 'spark' + k, [{ ty: 'el', d: 1, p: stat([0, 0]), s: stat([16, 16]) }, L.fill(col)], {
      p: L.anim([[0, pt(r0)], [30, pt(r0), L.GENTLE], [46, pt(r1)]]),
      s: L.anim([[0, [100, 100, 100]], [30, [100, 100, 100], L.EASE], [46, [30, 30, 100]]]),
      o: L.anim([[0, 0], [30, 0], [32, 100], [40, 100, L.EASE], [46, 0]]),
    }, OP));
  }
  save('harvest-done.json', 'Upcheck - Harvest done', OP, layers);
}
