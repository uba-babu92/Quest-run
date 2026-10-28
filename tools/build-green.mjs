// Robot des zones vertes (28/10) : télécharge depuis OpenStreetMap les parcs, bois, jardins, l'eau (Seine,
// étangs, berges) et les rues piétonnes des zones de data/areas.json, et les range en cases de 0,1°
// sous forme de grille de petits carrés de ~55 m (1 = agréable pour courir, 0 = ville).
// L'appli s'en sert pour choisir des quêtes dont le trajet passe surtout dans le vert ou au bord de l'eau.
// Usage : node tools/build-green.mjs
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const STEP = 0.1, DLAT = 0.0005, DLNG = 0.00075;           // une case = 200 × 134 carrés d'environ 55 m
const NR = Math.round(STEP / DLAT), NC = Math.round(STEP / DLNG);
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function publish(msg) {
  if (!process.env.GITHUB_ACTIONS) return;
  try {
    execSync('git add data/green', { stdio: 'inherit' });
    execSync('git diff --cached --quiet || (git commit -q -m "' + msg + '" && git pull -q --rebase origin main && git push -q origin HEAD:main)', { stdio: 'inherit', shell: '/bin/bash' });
  } catch (e) { console.log('  enregistrement raté, on continue'); }
}

const query = (s, w, n, e) => `[out:json][timeout:180][bbox:${s},${w},${n},${e}];(
way["leisure"~"^(park|garden|nature_reserve|recreation_ground|common)$"];
relation["leisure"~"^(park|garden|nature_reserve)$"];
way["landuse"~"^(forest|grass|meadow|recreation_ground|village_green|allotments)$"];
relation["landuse"~"^(forest|meadow|recreation_ground)$"];
way["natural"~"^(wood|scrub|grassland|heath|water)$"];
relation["natural"~"^(wood|water)$"];
way["waterway"~"^(river|canal|riverbank)$"];
relation["waterway"="riverbank"];
way["highway"="pedestrian"];
);out geom qt;`;

async function overpass(q) {
  if (process.env.GREEN_MOCK) return JSON.parse(fs.readFileSync(process.env.GREEN_MOCK, 'utf8')); // tests hors ligne
  for (let round = 0; round < 2; round++) {
    for (const url of SERVERS) {
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'QuestRun/1.0 (github.com/uba-babu92/Quest-run)' }, signal: AbortSignal.timeout(200000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!Array.isArray(j.elements)) throw new Error('réponse invalide');
        return j.elements;
      } catch (e) { console.log(`  ${new URL(url).host} : ${e.message}`); }
    }
    await sleep(5000);
  }
  return null;
}

// recolle les morceaux d'un contour (relations OSM découpées en plusieurs chemins)
function rings(parts) {
  const out = [], left = parts.filter(p => p.length > 1).map(p => p.slice());
  const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
  while (left.length) {
    let ring = left.shift(), grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const p = left[i], end = ring[ring.length - 1];
        if (same(end, p[0])) ring = ring.concat(p.slice(1));
        else if (same(end, p[p.length - 1])) ring = ring.concat(p.slice(0, -1).reverse());
        else continue;
        left.splice(i, 1); grew = true; break;
      }
    }
    if (ring.length >= 4) out.push(ring);
  }
  return out;
}
const pts = g => (g || []).map(x => [x.lat, x.lon]);
function areaM2(r) { // aire approximative (formule du lacet en mètres)
  let a = 0; const k = 111320, c = Math.cos(r[0][0] * Math.PI / 180);
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][1] * k * c) * (r[i][0] * k) - (r[i][1] * k * c) * (r[j][0] * k);
  return Math.abs(a / 2);
}
function inside(r, lat, lng) {
  let ok = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [ai, bi] = r[i], [aj, bj] = r[j];
    if ((ai > lat) !== (aj > lat) && lng < (bj - bi) * (lat - ai) / (aj - ai) + bi) ok = !ok;
  }
  return ok;
}

function rasterTile(i, j, els) {
  const s = i * STEP, w = j * STEP, grid = new Uint8Array(NR * NC);
  const set = (r, c) => { if (r >= 0 && r < NR && c >= 0 && c < NC) grid[r * NC + c] = 1; };
  const fillPoly = ring => {
    let a = Infinity, b = -Infinity, c0 = Infinity, c1 = -Infinity;
    for (const [la, lo] of ring) { a = Math.min(a, la); b = Math.max(b, la); c0 = Math.min(c0, lo); c1 = Math.max(c1, lo); }
    const r0 = Math.max(0, Math.floor((a - s) / DLAT)), r1 = Math.min(NR - 1, Math.floor((b - s) / DLAT));
    const k0 = Math.max(0, Math.floor((c0 - w) / DLNG)), k1 = Math.min(NC - 1, Math.floor((c1 - w) / DLNG));
    for (let r = r0; r <= r1; r++) for (let c = k0; c <= k1; c++) if (inside(ring, s + (r + .5) * DLAT, w + (c + .5) * DLNG)) set(r, c);
  };
  // ligne avec une marge de chaque côté (berges de la Seine, rues piétonnes)
  const strokeLine = (line, meters) => {
    const rad = Math.max(0, Math.round(meters / 55));
    for (let k = 1; k < line.length; k++) {
      const [la0, lo0] = line[k - 1], [la1, lo1] = line[k];
      const n = Math.max(1, Math.ceil(Math.hypot((la1 - la0) * 111320, (lo1 - lo0) * 73000) / 20));
      for (let t = 0; t <= n; t++) {
        const la = la0 + (la1 - la0) * t / n, lo = lo0 + (lo1 - lo0) * t / n;
        const r = Math.floor((la - s) / DLAT), c = Math.floor((lo - w) / DLNG);
        for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) if (dr * dr + dc * dc <= rad * rad) set(r + dr, c + dc);
      }
    }
  };
  for (const el of els) {
    const t = el.tags || {};
    const smallOk = !/^(grass|meadow|village_green|grassland)$/.test(t.landuse || t.natural || ''); // petits carrés d'herbe = ronds-points
    const isWater = t.natural === 'water' || t.waterway === 'riverbank' || t.water;
    if (t.highway === 'pedestrian') { if (el.geometry) strokeLine(pts(el.geometry), 15); continue; }
    if (t.waterway === 'river' || t.waterway === 'canal') { if (el.geometry) strokeLine(pts(el.geometry), t.waterway === 'river' ? 110 : 60); continue; }
    let rs = [];
    if (el.type === 'way' && el.geometry) { const p = pts(el.geometry); if (p.length >= 4) rs = [p]; }
    else if (el.type === 'relation') rs = rings((el.members || []).filter(m => m.type === 'way' && m.role !== 'inner').map(m => pts(m.geometry)));
    for (const r of rs) {
      const A = areaM2(r);
      if (!smallOk && A < 3000) continue;
      if (A < 400) continue;
      fillPoly(r);
      if (isWater) strokeLine(r, 50); // le bord de l'eau compte aussi
    }
  }
  return grid;
}

fs.mkdirSync('data/green', { recursive: true });
const areas = JSON.parse(fs.readFileSync('data/areas.json', 'utf8'));
const tiles = new Map();
for (const a of areas) {
  const dLat = a.km / 111.32, dLng = a.km / (111.32 * Math.cos(a.lat * Math.PI / 180));
  for (let i = Math.floor((a.lat - dLat) / STEP); i <= Math.floor((a.lat + dLat) / STEP); i++)
    for (let j = Math.floor((a.lng - dLng) / STEP); j <= Math.floor((a.lng + dLng) / STEP); j++) tiles.set(`${i}_${j}`, [i, j]);
}
let old = { tiles: {} };
try { old = JSON.parse(fs.readFileSync('data/green/index.json', 'utf8')); } catch (e) {}
const index = { updated: new Date().toISOString(), step: STEP, dlat: DLAT, dlng: DLNG, nr: NR, nc: NC, tiles: { ...old.tiles }, done: { ...(old.done || {}) } };
console.log(`${tiles.size} case(s) de zones vertes`);
for (const [k, [i, j]] of tiles) {
  const s = (i * STEP).toFixed(1), w = (j * STEP).toFixed(1), n = ((i + 1) * STEP).toFixed(1), e = ((j + 1) * STEP).toFixed(1);
  console.log(`Case ${k}`);
  // déjà faite il y a moins de 25 jours : on passe (le robot peut être coupé, il reprend où il en était)
  try { if (!process.env.FORCE && k in old.tiles && fs.existsSync(`data/green/${k}.json`) && Date.now() - fs.statSync(`data/green/${k}.json`).mtimeMs < 25 * 864e5 && old.done && old.done[k] && Date.now() - old.done[k] < 25 * 864e5) { console.log('  déjà faite, on passe'); continue; } } catch (e) {}
  const els = await overpass(query(s, w, n, e));
  if (!els) { console.log('  sautée'); continue; }
  const grid = rasterTile(i, j, els), share = grid.reduce((a, b) => a + b, 0) / grid.length;
  // bits compressés en base64 (1 bit par carré)
  const bytes = new Uint8Array(Math.ceil(grid.length / 8));
  grid.forEach((v, x) => { if (v) bytes[x >> 3] |= 1 << (x & 7); });
  fs.writeFileSync(`data/green/${k}.json`, JSON.stringify({ s: +s, w: +w, b: Buffer.from(bytes).toString('base64') }));
  (index.done = index.done || {})[k] = Date.now();
  index.tiles[k] = Math.round(share * 100);
  fs.writeFileSync('data/green/index.json', JSON.stringify(index, null, 1));
  console.log(`  ${els.length} zones, ${Math.round(share * 100)} % de la case agréable`);
  publish(`Zones vertes : case ${k}`);
  await sleep(2000);
}
console.log('Terminé');
