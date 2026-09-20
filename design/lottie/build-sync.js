// Offline-sync animation: open ring turns, arrow rises (same ring language as Saved).
const fs = require('fs'); const L = require('./lottie-lib');
const stat = L.stat;
const path = require('path');
const OUT = path.join(__dirname, '../../frontend/assets/lottie');

const BRAND = [[0, '#02C1E3'], [1, '#007CBC']], BLUE = '#0D84D6', GREEN = '#27A855', MUTED = '#A3B5BF';
const subs = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'subpaths.json')));
const PARTS = [subs[0] + ' ' + subs[2], subs[4], subs[5], subs[6], subs[3], subs[1]]; // head(+eye), seg1..4, tail
const MC = [256, 257, 0]; // mark centre
const C = [256, 256];
const el = (r) => ({ ty: 'el', d: 1, p: stat(C), s: stat([r * 2, r * 2]) });
const trim = (s, e, o = stat(0)) => ({ ty: 'tm', s, e, o, m: 1 });
const around = (p) => ({ a: stat([...p, 0]), p: stat([...p, 0]) });
const polyline = (pts) => ({ ty: 'sh', ks: stat({ i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]), v: pts, c: false }) });
const reindex = (ls) => ls.map((l, k) => ({ ...l, ind: k + 1 }));
const brandFill = () => L.gfill(BRAND, [98, 103], [414, 410], true);

// ── sync.json — loop 60f: open ring turns, arrow rises twice per loop ─────
{
  const OP = 60;
  const arrow = (t0) => ({
    ...L.layer(0, 'arrow', [polyline([[206, 262], [256, 212], [306, 262]]), polyline([[256, 214], [256, 318]]), L.stroke(BLUE, 24)], {
      ...around(C),
      p: L.anim([[t0, [256, 270, 0], L.EASE], [t0 + 30, [256, 242, 0]]]),
      o: L.anim([[t0, 0], [t0 + 8, 100], [t0 + 22, 100, L.EASE], [t0 + 30, 0]]),
    }, OP), ip: Math.max(0, t0), op: Math.min(OP, t0 + 30),
  });
  const layers = [
    arrow(0), arrow(30),
    L.layer(0, 'ring', [el(150), trim(stat(0), stat(80)), L.stroke(BLUE, 22)], { ...around(C), r: L.anim([[0, 0, L.LIN], [OP, 360]]) }, OP),
    L.layer(0, 'track', [el(150), L.stroke(BLUE, 22, 14)], around(C), OP),
  ];
  fs.writeFileSync(path.join(OUT, 'sync.json'), JSON.stringify(L.comp('Upcheck - Sync', OP, reindex(layers))));
}

console.log('sync.json', fs.statSync(path.join(OUT, 'sync.json')).size, 'bytes');
