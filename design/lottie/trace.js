// Trace the Upcheck mark: alpha -> black/white bitmap -> potrace -> one subpath per part.
const fs = require('fs'); const { PNG } = require('pngjs'); const potrace = require('potrace');
const src = PNG.sync.read(fs.readFileSync(require('path').join(__dirname, '../../frontend/assets/logo-variants/healthy/mark.png')));
const out = new PNG({ width: src.width, height: src.height });
for (let i = 0; i < src.data.length; i += 4) {
  const on = src.data[i + 3] > 128;
  out.data[i] = out.data[i + 1] = out.data[i + 2] = on ? 0 : 255; out.data[i + 3] = 255;
}
fs.writeFileSync('mask.png', PNG.sync.write(out));
potrace.trace('mask.png', { turdSize: 20, optTolerance: 0.2, alphaMax: 1, threshold: 128 }, (err, svg) => {
  if (err) throw err;
  fs.writeFileSync('traced.svg', svg);
  const d = svg.match(/ d="([^"]+)"/)[1];
  const subs = d.split(/(?=M)/).map(s => s.trim()).filter(Boolean);
  subs.forEach((s, i) => {
    const nums = s.match(/-?\d+(\.\d+)?/g).map(Number);
    const xs = nums.filter((_, k) => k % 2 === 0), ys = nums.filter((_, k) => k % 2 === 1);
    console.log(i, 'bbox', Math.min(...xs).toFixed(0), Math.min(...ys).toFixed(0), Math.max(...xs).toFixed(0), Math.max(...ys).toFixed(0), 'len', s.length);
  });
  fs.writeFileSync(require('path').join(__dirname, 'subpaths.json'), JSON.stringify(subs));
});
