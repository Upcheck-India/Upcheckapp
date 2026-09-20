// Universal save confirmation: ring draws itself (from 12 o'clock, clockwise), tick draws, one ripple.
const fs = require('fs'); const L = require('./lottie-lib');
const path = require('path');
const OUT = path.join(__dirname, '../../frontend/assets/lottie');

const OP = 30, C = [256, 256], GREEN = '#27A855';
const el = (r) => ({ ty: 'el', d: 1, p: L.stat(C), s: L.stat([r * 2, r * 2]) });
const trim = (e) => ({ ty: 'tm', s: L.stat(0), e, o: L.stat(0), m: 1 });
const around = (p) => ({ a: L.stat([...p, 0]), p: L.stat([...p, 0]) });
const tickPts = [[196, 256], [238, 298], [316, 214]];
const layers = [
  L.layer(1, 'tick', [
    { ty: 'sh', ks: L.stat({ i: tickPts.map(() => [0, 0]), o: tickPts.map(() => [0, 0]), v: tickPts, c: false }) },
    trim(L.anim([[0, 0], [9, 0, L.SNAPPY], [20, 100]])),
    L.stroke(GREEN, 26),
  ], around(C), OP),
  L.layer(2, 'ring', [el(128), trim(L.anim([[0, 0, L.GENTLE], [14, 100]])), L.stroke(GREEN, 22)], {
    ...around(C),
    s: L.anim([[0, [100, 100, 100]], [13, [100, 100, 100], L.EASE], [17, [104, 104, 100], L.EASE], [22, [100, 100, 100]]]),
  }, OP),
  L.layer(3, 'ripple', [el(128), L.stroke(GREEN, 8)], {
    ...around(C),
    s: L.anim([[0, [100, 100, 100]], [13, [100, 100, 100], L.GENTLE], [29, [140, 140, 100]]]),
    o: L.anim([[0, 0], [13, 0], [15, 50, L.EASE], [29, 0]]),
  }, OP),
];
fs.writeFileSync(path.join(OUT, 'saved.json'), JSON.stringify(L.comp('Upcheck — Saved', OP, layers)));
console.log(path.join(OUT, 'saved.json'), fs.statSync(path.join(OUT, 'saved.json')).size, 'bytes');
