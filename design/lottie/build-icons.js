// Status icons: Lucide geometry (24-unit grid, 2-unit round strokes) animated to act out each status.
const fs = require('fs'); const svgpath = require('svgpath'); const L = require('./lottie-lib');
const stat = L.stat, anim = L.anim, E = L.EASE, LIN = L.LIN, G = L.GENTLE, SN = L.SNAPPY;
const variants = require('../../frontend/assets/logo-variants/index.json');
const K = 16, SW = 2; // 24-unit icon drawn at 384px in the 512 canvas; Lucide stroke width

// ── Lucide element → Lottie shape items (icon units) ──
function pathShapes(d) {
  const segs = svgpath(d).abs().unshort().unarc().segments;
  const subs = []; let cur = null, pt = [0, 0], start = [0, 0];
  const push = (p, inT = [0, 0]) => { cur.v.push(p); cur.i.push(inT); cur.o.push([0, 0]); pt = p; };
  for (const s of segs) {
    const c = s[0];
    if (c === 'M') { cur = { v: [], i: [], o: [], c: false }; subs.push(cur); push([s[1], s[2]]); start = pt; }
    else if (c === 'L') push([s[1], s[2]]);
    else if (c === 'H') push([s[1], pt[1]]);
    else if (c === 'V') push([pt[0], s[1]]);
    else if (c === 'C') { cur.o[cur.o.length - 1] = [s[1] - pt[0], s[2] - pt[1]]; push([s[5], s[6]], [s[3] - s[5], s[4] - s[6]]); }
    else if (c === 'Q') { const q = [s[1], s[2]], e = [s[3], s[4]];
      cur.o[cur.o.length - 1] = [(2 / 3) * (q[0] - pt[0]), (2 / 3) * (q[1] - pt[1])]; push(e, [(2 / 3) * (q[0] - e[0]), (2 / 3) * (q[1] - e[1])]); }
    else if (c === 'Z') {
      cur.c = true; const n = cur.v.length;
      if (n > 1 && Math.hypot(cur.v[0][0] - cur.v[n - 1][0], cur.v[0][1] - cur.v[n - 1][1]) < 1e-3) { cur.i[0] = cur.i[n - 1]; cur.v.pop(); cur.i.pop(); cur.o.pop(); }
      pt = start;
    }
  }
  return subs.map((s) => ({ ty: 'sh', ks: stat({ i: s.i, o: s.o, v: s.v, c: s.c }) }));
}
const pts = (p) => { const a = p.trim().split(/[\s,]+/).map(Number), out = []; for (let k = 0; k < a.length; k += 2) out.push([a[k], a[k + 1]]); return out; };
const poly = (P, closed = false) => ({ ty: 'sh', ks: stat({ i: P.map(() => [0, 0]), o: P.map(() => [0, 0]), v: P, c: closed }) });
function elShapes(tag, attrs) {
  const n = (k) => parseFloat(attrs[k] || 0);
  if (tag === 'path') return pathShapes(attrs.d);
  if (tag === 'circle') return [{ ty: 'el', d: 1, p: stat([n('cx'), n('cy')]), s: stat([n('r') * 2, n('r') * 2]) }];
  if (tag === 'rect') return [{ ty: 'rc', d: 1, p: stat([n('x') + n('width') / 2, n('y') + n('height') / 2]), s: stat([n('width'), n('height')]), r: stat(n('rx')) }];
  if (tag === 'line') return [poly([[n('x1'), n('y1')], [n('x2'), n('y2')]])];
  if (tag === 'polyline') return [poly(pts(attrs.points))];
  throw new Error('unsupported ' + tag);
}
function lucide(name) {
  const svg = fs.readFileSync(`${require('path').dirname(require.resolve('lucide-static/package.json'))}/icons/${name}.svg`, 'utf8');
  return [...svg.matchAll(/<(path|circle|rect|line|polyline)\s([^>]*?)\/?>/g)].map(([, tag, a]) => {
    const attrs = Object.fromEntries([...a.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    return { shapes: elShapes(tag, attrs), filled: attrs.fill === 'currentColor' };
  });
}

// ── colour: status gradient pulled toward its lighter end so it reads on light AND dark ──
const hexToRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const mix = (a, b, t) => '#' + hexToRgb(a).map((v, k) => Math.round(v + (hexToRgb(b)[k] - v) * t).toString(16).padStart(2, '0')).join('');

// ── layers ──
const TR = (ks = {}) => ({ ty: 'tr', p: stat([0, 0]), a: stat([0, 0]), s: stat([100, 100]), r: stat(0), o: stat(100), ...ks });
// A layer drawing `items` (icon units). `pivot` = icon-unit point that rotation/scale act about.
function icoLayer(nm, items, { col, pivot = [12, 12], ks = {}, fill = false, fillOpacity = 100, trim = null } = {}, op) {
  const paint = fill ? [L.fill(col, fillOpacity)] : [{ ...L.stroke(col, SW) }];
  const tm = trim ? [{ ty: 'tm', s: stat(0), e: trim, o: stat(0), m: 1 }] : [];
  const P = [256 + (pivot[0] - 12) * K, 256 + (pivot[1] - 12) * K, 0];
  return L.layer(0, nm, [...items, ...tm, ...paint], {
    a: stat([...pivot, 0]), p: stat(P), s: stat([K * 100, K * 100, 100]), ...ks,
  }, op);
}
const reindex = (ls) => ls.map((l, k) => ({ ...l, ind: k + 1 }));
const sh = (els, idx) => idx.flatMap((k) => els[k].shapes);
const S = (v) => [K * 100 * v, K * 100 * v, 100]; // uniform scale helper around the pivot
const shake = (t0, amp, n, step = 3) => { const k = [[0, 0]]; if (t0) k.push([t0, 0, E]); for (let j = 1; j <= n; j++) k.push([t0 + j * step, (j % 2 ? -1 : 1) * amp * (1 - (j - 1) / n), E]); k.push([t0 + (n + 1) * step, 0]); return k; };

const B = {};
// feeding-overdue: alarm clock rings — body rattles, bells shiver, then rests.
B.overdue = (col) => { const op = 54, e = lucide('alarm-clock');
  return [op, [icoLayer('clock', sh(e, [0, 1, 2, 3, 4, 5]), { col, pivot: [12, 13], ks: { r: anim(shake(0, 9, 6)) } }, op)]]; };
// feeding-overdue: an empty feed bowl rattles, then pellets drop in one by one.
B['feeding-overdue'] = (col) => { const op = 66, e = lucide('soup');
  const pellet = (x, land, t0) => { const y = (u) => [256 + (x - 12) * K, 256 + (u - 12) * K, 0];
    return icoLayer('pellet', [{ ty: 'el', d: 1, p: stat([x, 3]), s: stat([2.6, 2.6]) }], { col, fill: true, pivot: [x, 3], ks: {
      p: anim([[0, y(3)], [t0, y(3), L.EIN], [t0 + 10, y(land), E], [t0 + 13, y(land - 0.5), E], [t0 + 16, y(land)]]),
      o: anim([[0, 0], [t0, 0], [t0 + 2, 100], [56, 100, E], [62, 0]]) } }, op); };
  return [op, [pellet(10, 9.6, 18), pellet(14, 9.6, 26), pellet(12, 8.2, 34),
    icoLayer('bowl', sh(e, [0, 1]), { col, pivot: [12, 21], ks: { r: anim(shake(0, 6, 5)) } }, op)]]; };
// critical: warning triangle, two sharp shakes about its base; the "!" dot blinks.
B.critical = (col) => { const op = 40, e = lucide('triangle-alert');
  return [op, [
    icoLayer('bang', sh(e, [1, 2]), { col, pivot: [12, 21], ks: { r: anim(shake(0, 7, 4)) } }, op),
    icoLayer('triangle', sh(e, [0]), { col, pivot: [12, 21], ks: { r: anim(shake(0, 7, 4)) } }, op),
  ]]; };
// disease-risk: a virus — body pulses, spikes turn slowly.
B['disease-risk'] = (col) => { const op = 120;
  const spikes = [], knobs = [];
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
    spikes.push(poly([[12 + c * 5.2, 12 + s * 5.2], [12 + c * 8.2, 12 + s * 8.2]]));
    knobs.push({ ty: 'el', d: 1, p: stat([12 + c * 9.4, 12 + s * 9.4]), s: stat([2.6, 2.6]) }); }
  const pulse = anim([[0, S(1), E], [30, S(1.06), E], [60, S(1), E], [90, S(1.06), E], [op, S(1)]]);
  return [op, [
    icoLayer('knobs', knobs, { col, fill: true, ks: { r: anim([[0, 0, LIN], [op, 90]]), s: pulse } }, op),
    icoLayer('spikes', spikes, { col, ks: { r: anim([[0, 0, LIN], [op, 90]]), s: pulse } }, op),
    icoLayer('dots', [{ ty: 'el', d: 1, p: stat([10.4, 11]), s: stat([1.8, 1.8]) }, { ty: 'el', d: 1, p: stat([13.4, 13.2]), s: stat([1.4, 1.4]) }], { col, fill: true, ks: { r: anim([[0, 0, LIN], [op, -60]]) } }, op),
    icoLayer('body', [{ ty: 'el', d: 1, p: stat([12, 12]), s: stat([10.4, 10.4]) }], { col, ks: { s: pulse } }, op),
  ]]; };
// water-quality: a drop whose water line sloshes and sinks, then recovers.
B['water-quality'] = (col) => { const op = 90, e = lucide('droplet');
  const wave = (y, ph) => { const P = [], I = [], O = [], x0 = 8, x1 = 16, n = 4, dx = (x1 - x0) / n;
    for (let j = 0; j <= n; j++) { const x = x0 + j * dx, yy = y + 0.7 * Math.sin(j * Math.PI / 2 + ph), dy = 0.7 * (Math.PI / 2 / dx) * Math.cos(j * Math.PI / 2 + ph);
      P.push([x, yy]); I.push([-dx / 3, -dy * dx / 3]); O.push([dx / 3, dy * dx / 3]); }
    I[0] = [0, 0]; O[n] = [0, 0]; return { i: I, o: O, v: P, c: false }; };
  const keys = [[0, wave(14, 0), E], [22, wave(15.2, Math.PI), E], [45, wave(16.4, 0), E], [68, wave(15.2, Math.PI), E], [op, wave(14, 0)]];
  return [op, [
    icoLayer('level', [{ ty: 'sh', ks: anim(keys) }], { col }, op),
    icoLayer('drop', sh(e, [0]), { col, pivot: [12, 22], ks: { r: anim([[0, 0, E], [22, -4, E], [45, 3, E], [68, -2, E], [op, 0]]) } }, op),
  ]]; };
// stale-data: hourglass — sand runs out, it flips (seamless: flipped == start).
B['stale-data'] = (col) => { const op = 90, e = lucide('hourglass');
  const rot = anim([[0, 0], [62, 0, E], [80, 180], [80.01, 0], [op, 0]]);
  const top = { ty: 'sh', ks: stat({ i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[8.6, 6.8], [15.4, 6.8], [12, 10.4]], c: true }) };
  const bot = { ty: 'sh', ks: stat({ i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[12, 16.4], [16.2, 20.3], [7.8, 20.3]], c: true }) };
  return [op, [
    icoLayer('glass', sh(e, [0, 1, 2, 3]), { col, ks: { r: rot } }, op),
    icoLayer('sandTop', [top], { col, fill: true, fillOpacity: 70, pivot: [12, 10.4], ks: { s: anim([[0, S(1), LIN], [60, S(0)], [80, S(0)], [80.01, S(1)], [op, S(1)]]), o: anim([[0, 100], [80, 100], [80.01, 100]]) } }, op),
    icoLayer('sandBot', [bot], { col, fill: true, fillOpacity: 70, pivot: [12, 20.3], ks: { s: anim([[0, S(0), LIN], [60, S(1)], [80, S(1)], [80.01, S(0)], [op, S(0)]]), o: anim([[0, 100], [60, 100, E], [64, 0], [80, 0], [80.01, 100]]) } }, op),
    icoLayer('stream', [poly([[12, 10.6], [12, 19.6]])], { col, ks: { o: anim([[0, 0], [2, 60], [58, 60], [60, 0]]) } }, op),
  ]]; };
// insight: lightbulb — rays flash on in sequence, glass fills with a soft glow.
B.insight = (col) => { const op = 60, e = lucide('lightbulb');
  const rays = [-150, -120, -90, -60, -30].map((deg, k) => { const a = (deg * Math.PI) / 180;
    return icoLayer('ray' + k, [poly([[12 + Math.cos(a) * 9, 8 + Math.sin(a) * 9], [12 + Math.cos(a) * 11, 8 + Math.sin(a) * 11]])], {
      col, pivot: [12, 8], ks: { o: anim([[0, 0], [4 + k * 3, 0, E], [10 + k * 3, 100], [44, 100, E], [52, 0]]) } }, op); });
  return [op, [...rays,
    icoLayer('bulb', sh(e, [0, 1, 2]), { col }, op),
    icoLayer('glow', [{ ty: 'el', d: 1, p: stat([12, 8.4]), s: stat([10.4, 10.4]) }], { col, fill: true, fillOpacity: 100, ks: { o: anim([[0, 0], [6, 0, E], [18, 22], [44, 22, E], [52, 0]]) } }, op),
  ]]; };
// update-available: download arrow drops into the tray, tray dips.
B['update-available'] = (col) => { const op = 48, e = lucide('download');
  const y = (u) => [256, 256 + u * K, 0];
  return [op, [
    icoLayer('arrow', sh(e, [1, 2]), { col, ks: { p: anim([[0, y(-6), SN], [16, y(0)], [30, y(0), E], [40, y(1.5)]]), o: anim([[0, 0], [6, 100], [32, 100, E], [40, 0]]) } }, op),
    icoLayer('tray', sh(e, [0]), { col, ks: { p: anim([[0, y(0)], [15, y(0), E], [19, y(0.8), E], [26, y(0)]]) } }, op),
  ]]; };
// healthy: shield, tick draws itself, shield gives one soft pop.
B.healthy = (col) => { const op = 60, e = lucide('heart-pulse');
  const beat = anim([[0, S(1)], [8, S(1), E], [12, S(1.06), E], [16, S(1), E], [20, S(1.05), E], [26, S(1)], [op, S(1)]]);
  const ecg = { ty: 'tm', s: anim([[0, 0], [14, 0, E], [40, 100], [op, 100]]), e: anim([[0, 0, E], [26, 100], [op, 100]]), o: stat(0), m: 1 };
  return [op, [
    L.layer(0, 'ecg', [...sh(e, [1]), ecg, L.stroke(col, SW)], { a: stat([12, 12, 0]), p: stat([256, 256, 0]), s: stat(S(1)) }, op),
    icoLayer('ecgGhost', sh(e, [1]), { col, ks: { o: stat(25) } }, op),
    icoLayer('heart', sh(e, [0]), { col, pivot: [12, 12], ks: { s: beat } }, op),
  ]]; };
// harvest: calendar — the date gets ticked, page lifts slightly.
B.harvest = (col) => { const op = 72, e = lucide('calendar-days');
  const dots = [4, 5, 6, 7, 8].map((k, j) => icoLayer('day' + j, sh(e, [k]), { col, ks: { o: anim([[0, 25], [4 + j * 5, 25, E], [8 + j * 5, 100], [56, 100, E], [64, 25], [op, 25]]) } }, op));
  const t = 32, target = icoLayer('target', sh(e, [9]), { col, ks: { o: anim([[0, 25], [t, 25], [t + 1, 0], [63, 0], [64, 25]]) } }, op);
  const ring = icoLayer('ring', [{ ty: 'el', d: 1, p: stat([16, 18]), s: stat([3.4, 3.4]) }], { col, fill: true, pivot: [16, 18], ks: {
    s: anim([[0, S(0)], [t, S(0), L.GENTLE], [t + 8, S(1.25), E], [t + 14, S(1)], [56, S(1), E], [64, S(0)], [op, S(0)]]) } }, op);
  return [op, [ring, target, ...dots, icoLayer('calendar', sh(e, [0, 1, 2, 3]), { col }, op)]]; };
// ready-to-sell: ₹ price tag swings on its hole and settles.
B['ready-to-sell'] = (col) => { const op = 72, e = lucide('tag'), r = lucide('indian-rupee');
  const swing = anim([[0, 0, E], [12, 12, E], [26, -8, E], [38, 5, E], [48, -2, E], [56, 0], [op, 0]]);
  const RS = 0.38, RC = [13.4, 13.4], la = 12 + (7.5 - RC[0]) / RS;
  const rupee = L.layer(0, 'rupee', [...sh(r, [0, 1, 2, 3, 4]), L.stroke(col, 1.7 / RS)], {
    a: stat([la, la, 0]), p: stat([256 + (7.5 - 12) * K, 256 + (7.5 - 12) * K, 0]), s: stat([K * 100 * RS, K * 100 * RS, 100]), r: swing }, op);
  return [op, [
    rupee,
    icoLayer('hole', sh(e, [1]), { col, fill: true, pivot: [7.5, 7.5], ks: { r: swing, s: stat([K * 200, K * 200, 100]) } }, op),
    icoLayer('tag', sh(e, [0]), { col, pivot: [7.5, 7.5], ks: { r: swing } }, op),
  ]]; };

const OUT = require('path').join(__dirname, '../../frontend/assets/lottie/status');
fs.mkdirSync(OUT, { recursive: true });
const all = { ...variants, overdue: { colors: ['#FFB020', '#E07A00'] } };
for (const [name, v] of Object.entries(all)) {
  const col = mix(v.colors[0], v.colors[1], 0.35);
  const [op, layers] = B[name](col);
  const f = require('path').join(OUT, `${name}.json`);
  fs.writeFileSync(f, JSON.stringify(L.comp(`Upcheck status - ${name}`, op, reindex(layers))));
  console.log(f.padEnd(34), fs.statSync(f).size, 'bytes', col);
}
