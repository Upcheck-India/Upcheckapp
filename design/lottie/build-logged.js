const fs = require('fs'); const L = require('./lottie-lib');
const path = require('path');
const OUT = path.join(__dirname, '../../frontend/assets/lottie');

const OP = 36, C = [256, 256], GREEN = '#27A855';
const BRAND = [[0, '#02C1E3'], [1, '#007CBC']];
const el = (r) => ({ ty: 'el', p: L.stat(C), s: L.stat([r * 2, r * 2]) });
const trim = (e) => ({ ty: 'tm', s: L.stat(0), e, o: L.stat(0), m: 1 });
const around = (p) => ({ a: L.stat([...p, 0]), p: L.stat([...p, 0]) }); // scale/rotate about p

// Drop: teardrop, tip up, bulb centred at (256,112); falls 124px so the bulb lands on the centre.
const drop = L.svgToShapes('M 256 52 C 256 52, 223 94, 223 118 C 223 136.2, 237.8 151, 256 151 C 274.2 151, 289 136.2, 289 118 C 289 94, 256 52, 256 52 Z');
const layers = [
  // top → bottom
  L.layer(1, 'tick', [
    ...[[196, 256], [238, 298], [316, 214]].reduce((a, v, k, arr) => k ? a : [{ ty: 'sh', ks: L.stat({ i: arr.map(() => [0, 0]), o: arr.map(() => [0, 0]), v: arr, c: false }) }], []),
    trim(L.anim([[0, 0], [17, 0, L.SNAPPY], [29, 100]])),
    L.stroke(GREEN, 26),
  ], {}, OP),
  L.layer(2, 'drop', [...drop, L.gfill(BRAND, [256, 52], [256, 151])], {
    a: L.stat([256, 118, 0]),
    p: L.anim([[0, [256, 118, 0], L.EIN], [11, [256, 226, 0]]]),
    s: L.anim([[0, [100, 100, 100], L.EIN], [11, [88, 118, 100]]]),
    o: L.anim([[0, 0], [3, 100], [10, 100], [12, 0]]),
  }, OP),
  L.layer(3, 'ring', [el(128), L.stroke(GREEN, 22)], {
    ...around(C),
    s: L.anim([[0, [20, 20, 100]], [11, [20, 20, 100], L.GENTLE], [21, [104, 104, 100], L.EASE], [26, [100, 100, 100]]]),
    o: L.anim([[0, 0], [11, 0], [14, 100]]),
  }, OP),
  L.layer(4, 'ripple', [el(128), L.stroke(GREEN, 8)], {
    ...around(C),
    s: L.anim([[0, [30, 30, 100]], [12, [30, 30, 100], L.GENTLE], [32, [145, 145, 100]]]),
    o: L.anim([[0, 0], [11, 0], [14, 55, L.EASE], [32, 0]]),
  }, OP),
];
fs.writeFileSync(path.join(OUT, 'logged.json'), JSON.stringify(L.comp('Upcheck — Logged', OP, layers)));
console.log(path.join(OUT, 'logged.json'), fs.statSync(path.join(OUT, 'logged.json')).size, 'bytes');
