// Minimal Lottie (bodymovin 5.x) builders — shape layers only.
const EASE = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };            // ease-in-out
const LIN = { x1: 0.167, y1: 0.167, x2: 0.833, y2: 0.833 };
const GENTLE = { x1: 0.22, y1: 1, x2: 0.36, y2: 1 };           // gentle-out
const SNAPPY = { x1: 0.16, y1: 1, x2: 0.3, y2: 1 };            // snappy-out
const EIN = { x1: 0.42, y1: 0, x2: 1, y2: 1 };                 // ease-in

// keys: [[frame, value(number|array), easing?], ...] — easing applies to the segment AFTER the key.
function anim(keys) {
  if (keys.length === 1) return { a: 0, k: keys[0][1] };
  return {
    a: 1,
    k: keys.map(([t, v, e], idx) => {
      const s = Array.isArray(v) ? v : [v];
      if (idx === keys.length - 1) return { t, s };
      const ez = e || LIN, n = s.length;
      return { t, s, o: { x: Array(n).fill(ez.x1), y: Array(n).fill(ez.y1) }, i: { x: Array(n).fill(ez.x2), y: Array(n).fill(ez.y2) } };
    }),
  };
}
const stat = (v) => ({ a: 0, k: v });

// SVG path (M/L/C/Z, absolute, potrace-style repeated pairs) -> lottie shape paths.
function svgToShapes(d) {
  const tok = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const subs = []; let cur = null, cmd = null, i = 0;
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/^[MLCZ]$/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M') { cur = { v: [], i: [], o: [] }; subs.push(cur); const x = num(), y = num(); cur.v.push([x, y]); cur.i.push([0, 0]); cur.o.push([0, 0]); cmd = 'L'; }
    else if (cmd === 'L') { const x = num(), y = num(); cur.v.push([x, y]); cur.i.push([0, 0]); cur.o.push([0, 0]); }
    else if (cmd === 'C') {
      const c1 = [num(), num()], c2 = [num(), num()], p = [num(), num()];
      const prev = cur.v[cur.v.length - 1];
      cur.o[cur.o.length - 1] = [c1[0] - prev[0], c1[1] - prev[1]];
      cur.v.push(p); cur.i.push([c2[0] - p[0], c2[1] - p[1]]); cur.o.push([0, 0]);
    } else if (cmd === 'Z') { cmd = null; }
  }
  return subs.map((s) => {
    const n = s.v.length, a = s.v[0], b = s.v[n - 1];
    if (n > 1 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) { // closing point duplicates the start
      s.i[0] = s.i[n - 1]; s.v.pop(); s.i.pop(); s.o.pop();
    }
    return { ty: 'sh', ks: stat({ i: s.i, o: s.o, v: s.v, c: true }) };
  });
}
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
const fill = (h, o = 100) => ({ ty: 'fl', c: stat([...hex(h), 1]), o: stat(o), r: 1 });
const gfill = (stops, s, e, evenodd) => ({
  ty: 'gf', o: stat(100), r: evenodd ? 2 : 1, t: 1, s: stat(s), e: stat(e),
  g: { p: stops.length, k: stat(stops.flatMap(([off, h]) => [off, ...hex(h)])) },
});
const stroke = (h, w, o = 100) => ({ ty: 'st', c: stat([...hex(h), 1]), o: stat(o), w: stat(w), lc: 2, lj: 2 }); // round cap + join
const tr = () => ({ ty: 'tr', p: stat([0, 0]), a: stat([0, 0]), s: stat([100, 100]), r: stat(0), o: stat(100) });

// A shape layer; ks overrides {o,p,a,s,r}; items are shape items (paths + fills/strokes).
function layer(ind, nm, items, ks = {}, op) {
  return {
    ddd: 0, ind, ty: 4, nm, sr: 1, ao: 0, ip: 0, op, st: 0, bm: 0,
    ks: { o: ks.o || stat(100), r: ks.r || stat(0), p: ks.p || stat([0, 0, 0]), a: ks.a || stat([0, 0, 0]), s: ks.s || stat([100, 100, 100]) },
    shapes: [{ ty: 'gr', nm, it: [...items, tr()] }],
  };
}
function comp(nm, op, layers, fr = 30, w = 512, h = 512) {
  // lottie: first layer in the array renders on top.
  return { v: '5.7.4', fr, ip: 0, op, w, h, nm, ddd: 0, assets: [], layers };
}
module.exports = { anim, stat, svgToShapes, fill, gfill, stroke, layer, comp, EASE, LIN, GENTLE, SNAPPY, EIN };
