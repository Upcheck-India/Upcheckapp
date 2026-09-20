# Lottie generators

Scripts that write the app's Lottie animations into `frontend/assets/lottie/`.
Each file is plain bodymovin JSON, built from the Upcheck mark (traced from
`frontend/assets/logo-variants/healthy/mark.png`) or from Lucide icon geometry.

```
cd design/lottie
npm install
npm run build        # regenerates every file in frontend/assets/lottie/
```

| Script | Writes |
|---|---|
| `build-curl.js` | `curl-loader.json` — loading |
| `build-saved.js` | `saved.json` — save confirmation |
| `build-logged.js` | `logged.json` — water-log confirmation |
| `build-sync.js` | `sync.json` — offline sync |
| `build-states.js` | `empty.json`, `harvest-done.json` |
| `build-icons.js` | `status/*.json` — one per alert/status |

`trace.js` re-traces the mark into `subpaths.json`; run it only if the logo
changes. `lottie-lib.js` holds the small shape/keyframe builders.

Keyframe times are in composition frames (lottie-web does not offset shape-layer
keys by a layer's `st`). Preview a file with the official player
(`lottie-web`) before shipping it.
