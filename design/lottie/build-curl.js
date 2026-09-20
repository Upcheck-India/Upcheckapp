const fs = require('fs'); const L = require('./lottie-lib');
const path = require('path');
const OUT = path.join(__dirname, '../../frontend/assets/lottie');

const s = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'subpaths.json')));
const BRAND = [[0, '#02C1E3'], [1, '#007CBC']];
const parts = [['head', s[0] + ' ' + s[2], 0], ['seg1', s[4], 5], ['seg2', s[5], 10], ['seg3', s[6], 15], ['seg4', s[3], 20], ['tail', s[1], 25]];
const OP = 48, LO = 40, HI = 100;
const layers = parts.map(([nm, d, st], k) => {
  const keys = st === 0
    ? [[0, LO, L.EASE], [8, HI, L.EASE], [20, LO], [OP, LO]]
    : [[0, LO], [st, LO, L.EASE], [st + 8, HI, L.EASE], [st + 20, LO], [OP, LO]];
  return L.layer(k + 1, nm, [...L.svgToShapes(d), L.gfill(BRAND, [98, 103], [414, 410], true)], { o: L.anim(keys) }, OP);
});
const out = L.comp('Upcheck — Curl loader', OP, layers);
fs.writeFileSync(path.join(OUT, 'curl-loader.json'), JSON.stringify(out));
console.log(path.join(OUT, 'curl-loader.json'), fs.statSync(path.join(OUT, 'curl-loader.json')).size, 'bytes');
