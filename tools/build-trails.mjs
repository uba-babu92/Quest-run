// Robot des parcours de runners (28/10) : depuis OpenStreetMap, garde les chemins où l'on aime courir :
// sentiers balisés (GR, PR, parcours sportifs, coulées vertes : relations route=hiking/foot/running/fitness_trail),
// berges de Seine et chemins de halage, allées des parcs et des bois, promenades.
// Un chemin compte s'il fait partie d'un parcours balisé, s'il porte un nom de promenade, ou s'il passe au moins
// aux trois quarts dans les zones vertes (data/green/, robot des zones vertes, à lancer avant).
// Sortie par case de 0,1° : data/trails/<case>.json = { s, w, b (grille ~55 m : 1 = sur un parcours), l (lignes) }.
// Usage : node tools/build-trails.mjs
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const STEP = 0.1, DLAT = 0.0005, DLNG = 0.00075, NR = Math.round(STEP / DLAT), NC = Math.round(STEP / DLNG);
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function publish(msg) {
  if (!process.env.GITHUB_ACTIONS) return;
  try {
    execSync('git add data/trails', { stdio: 'inherit' });
    execSync('git diff --cached --quiet || (git commit -q -m "' + msg + '" && git pull -q --rebase origin main && git push -q origin HEAD:main)', { stdio: 'inherit', shell: '/bin/bash' });
  } catch (e) { console.log('  enregistrement raté, on continue'); }
}
const query = (s, w, n, e) => `[out:json][timeout:180][bbox:${s},${w},${n},${e}];(
relation["route"~"^(hiking|foot|running|fitness_trail|walking)$"];
way["highway"~"^(path|footway|track|cycleway|pedestrian|bridleway)$"]["footway"!~"^(sidewalk|crossing|traffic_island)$"]["access"!~"^(private|no)$"];
);out geom qt;`;
async function overpass(q) {
  if (process.env.TRAILS_MOCK) return JSON.parse(fs.readFileSync(process.env.TRAILS_MOCK, 'utf8')); // tests hors ligne
  for (let round = 0; round < 2; round++) {
    for (const url of SERVERS) {
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'QuestRun/1.0 (github.com/uba-babu92/Quest-run)' }, signal: AbortSignal.timeout(200000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json(); if (!Array.isArray(j.elements)) throw new Error('réponse invalide');
        return j.elements;
      } catch (e) { console.log(`  ${new URL(url).host} : ${e.message}`); }
    }
    await sleep(5000);
  }
  return null;
}
// zones vertes déjà calculées (toutes les cases chargées, pour les chemins qui dépassent d'une case)
const green = {};
function greenAt(lat, lng) {
  const k = `${Math.floor(lat / STEP + 1e-9)}_${Math.floor(lng / STEP + 1e-9)}`;
  if (!(k in green)) { try { const g = JSON.parse(fs.readFileSync(`data/green/${k}.json`, 'utf8')); green[k] = { s: g.s, w: g.w, u: Buffer.from(g.b, 'base64') }; } catch (e) { green[k] = null; } }
  const t = green[k]; if (!t) return 0;
  const r = Math.floor((lat - t.s) / DLAT), c = Math.floor((lng - t.w) / DLNG), x = r * NC + c;
  return r < 0 || c < 0 || r >= NR || c >= NC ? 0 : (t.u[x >> 3] >> (x & 7)) & 1;
}
const NICE_NAME = /promenade|coul[ée]e verte|chemin de halage|halage|berge|quai|all[ée]e|sentier|bord de seine|parcours|for[êe]t|bois/i;
const len = l => { let d = 0; for (let i = 1; i < l.length; i++) d += Math.hypot((l[i][0] - l[i - 1][0]) * 111320, (l[i][1] - l[i - 1][1]) * 73000); return d; };
// garde un point tous les ~25 m, arrondi à 5 décimales (≈ 1 m)
function thin(l) {
  const out = [l[0]]; let acc = 0;
  for (let i = 1; i < l.length; i++) { acc += Math.hypot((l[i][0] - l[i - 1][0]) * 111320, (l[i][1] - l[i - 1][1]) * 73000); if (acc >= 25 || i === l.length - 1) { out.push(l[i]); acc = 0; } }
  return out.map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]);
}

fs.mkdirSync('data/trails', { recursive: true });
const areas = JSON.parse(fs.readFileSync('data/areas.json', 'utf8'));
const tiles = new Map();
for (const a of areas) {
  const dLat = a.km / 111.32, dLng = a.km / (111.32 * Math.cos(a.lat * Math.PI / 180));
  for (let i = Math.floor((a.lat - dLat) / STEP); i <= Math.floor((a.lat + dLat) / STEP); i++)
    for (let j = Math.floor((a.lng - dLng) / STEP); j <= Math.floor((a.lng + dLng) / STEP); j++) tiles.set(`${i}_${j}`, [i, j]);
}
let old = { tiles: {} };
try { old = JSON.parse(fs.readFileSync('data/trails/index.json', 'utf8')); } catch (e) {}
const index = { updated: new Date().toISOString(), step: STEP, dlat: DLAT, dlng: DLNG, nr: NR, nc: NC, tiles: { ...old.tiles } };
console.log(`${tiles.size} case(s) de parcours`);
for (const [k, [i, j]] of tiles) {
  const s = i * STEP, w = j * STEP;
  console.log(`Case ${k}`);
  const els = await overpass(query(s.toFixed(1), w.toFixed(1), ((i + 1) * STEP).toFixed(1), ((j + 1) * STEP).toFixed(1)));
  if (!els) { console.log('  sautée'); continue; }
  const marked = new Set();
  for (const el of els) if (el.type === 'relation') for (const m of el.members || []) if (m.type === 'way') marked.add(m.ref);
  const lines = [];
  for (const el of els) {
    if (el.type !== 'way' || !el.geometry) continue;
    const l = el.geometry.map(g => [g.lat, g.lon]); if (l.length < 2) continue;
    const L = len(l); if (L < 60) continue;
    let ok = marked.has(el.id) || NICE_NAME.test(el.tags?.name || '');
    if (!ok) { const g = l.filter(([a, b]) => greenAt(a, b)).length / l.length; ok = g >= 0.75 && L >= 120; }
    if (ok) lines.push(thin(l));
  }
  // seulement ce qui est dans la case (avec 1 point de marge pour recoller les bords)
  const inTile = ([a, b]) => a >= s - 0.002 && a <= s + STEP + 0.002 && b >= w - 0.003 && b <= w + STEP + 0.003;
  const kept = lines.map(l => l.filter(inTile)).filter(l => l.length >= 2);
  const grid = new Uint8Array(NR * NC);
  for (const l of kept) for (let x = 1; x < l.length; x++) {
    const [a0, b0] = l[x - 1], [a1, b1] = l[x], n = Math.max(1, Math.ceil(Math.hypot((a1 - a0) * 111320, (b1 - b0) * 73000) / 20));
    for (let t = 0; t <= n; t++) { const r = Math.floor((a0 + (a1 - a0) * t / n - s) / DLAT), c = Math.floor((b0 + (b1 - b0) * t / n - w) / DLNG); if (r >= 0 && c >= 0 && r < NR && c < NC) grid[r * NC + c] = 1; }
  }
  const bytes = new Uint8Array(Math.ceil(grid.length / 8)); grid.forEach((v, x) => { if (v) bytes[x >> 3] |= 1 << (x & 7); });
  fs.writeFileSync(`data/trails/${k}.json`, JSON.stringify({ s: +s.toFixed(1), w: +w.toFixed(1), b: Buffer.from(bytes).toString('base64'), l: kept }));
  index.tiles[k] = kept.length;
  fs.writeFileSync('data/trails/index.json', JSON.stringify(index, null, 1));
  console.log(`  ${kept.length} chemins de runners (${Math.round(kept.reduce((a, l) => a + len(l), 0) / 1000)} km)`);
  publish(`Parcours de runners : case ${k}`);
  await sleep(2000);
}
console.log('Terminé');
