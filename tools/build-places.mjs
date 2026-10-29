// Robot des lieux : télécharge les lieux OpenStreetMap des zones de data/areas.json
// et les range par cases de 0,1° (environ 11 × 7 km) dans data/places/.
// L'appli ne télécharge que les cases autour du joueur.
// Usage : node tools/build-places.mjs
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Sur GitHub, on enregistre chaque case dès qu'elle est prête.
function publish(msg) {
  if (!process.env.GITHUB_ACTIONS) return;
  try {
    execSync('git add data/places', { stdio: 'inherit' });
    execSync('git diff --cached --quiet || (git commit -q -m "' + msg + '" && git pull -q --rebase origin main && git push -q origin HEAD:main)', { stdio: 'inherit', shell: '/bin/bash' });
  } catch (e) { console.log('  enregistrement raté, on continue'); }
}

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const KEEP = ['name', 'name:fr', 'lock_name', 'lock', 'waterway', 'bridge', 'man_made', 'highway', 'amenity', 'historic', 'tourism', 'leisure', 'memorial', 'artwork_type',
  'fountain', 'drinking_water', 'access', 'garden', 'garden:type', 'religion', 'building', 'artist_name',
  'wikipedia', 'wikidata', 'image', 'wikimedia_commons', 'start_date', 'inscription',
  'artist:wikidata', 'subject', 'subject:wikidata', 'name:etymology:wikidata', 'material', 'architect', 'ref:mhs', 'heritage'];
const STEP = 0.1;
const key = (lat, lng) => `${Math.floor(lat / STEP + 1e-9)}_${Math.floor(lng / STEP + 1e-9)}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function query(s, w, n, e) {
  return `[out:json][timeout:120][bbox:${s},${w},${n},${e}];(
nwr["amenity"="townhall"]["name"];
nwr["historic"~"^(monument|castle|manor|ruins)$"];
node["historic"="memorial"]["memorial"!~"plaque|stolperstein|blue_plaque"];
node["historic"~"^(wayside_cross|boundary_stone|milestone)$"];
node["tourism"="artwork"];
nwr["tourism"~"^(museum|viewpoint)$"];
node["amenity"="fountain"]["drinking_water"!="yes"];
way["leisure"~"^(park|garden)$"]["name"];
nwr["amenity"="place_of_worship"]["name"];
node["waterway"="lock_gate"]["name"];
way["lock"="yes"]["lock_name"];
way["bridge"]["highway"~"^(footway|pedestrian|path|cycleway)$"]["name"~"^(Passerelle|Pont)"];
way["man_made"="bridge"]["name"~"^Passerelle"];
);out center tags qt;`;
}

// 2 tours sur les 3 serveurs, 90 s max par essai. Renvoie null si tout échoue.
async function overpass(q) {
  for (let round = 0; round < 2; round++) {
    for (const url of SERVERS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(q),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'QuestRun/1.0 (github.com/uba-babu92/Quest-run)' },
          signal: AbortSignal.timeout(90000)
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!Array.isArray(j.elements)) throw new Error('réponse invalide');
        if (!j.elements.length && j.remark) throw new Error(j.remark);
        return j.elements;
      } catch (e) { console.log(`  ${new URL(url).host} : ${e.message}`); }
    }
    await sleep(5000);
  }
  return null;
}

function slim(el) {
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const tags = {};
  for (const k of KEEP) if (el.tags?.[k] != null) tags[k] = el.tags[k];
  if (!tags.name && tags.lock_name) tags.name = tags.lock_name; // écluses : le nom est souvent dans lock_name
  return { type: el.type, id: el.id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), tags };
}

fs.mkdirSync('data/places', { recursive: true });
const areas = JSON.parse(fs.readFileSync('data/areas.json', 'utf8'));
const tiles = new Map();
for (const a of areas) {
  const dLat = a.km / 111.32, dLng = a.km / (111.32 * Math.cos(a.lat * Math.PI / 180));
  for (let i = Math.floor((a.lat - dLat) / STEP); i <= Math.floor((a.lat + dLat) / STEP); i++)
    for (let j = Math.floor((a.lng - dLng) / STEP); j <= Math.floor((a.lng + dLng) / STEP); j++)
      tiles.set(`${i}_${j}`, [i, j]);
}
console.log(`${areas.length} zone(s), ${tiles.size} case(s) à télécharger`);

// on garde les cases déjà faites si une case échoue cette fois-ci
let old = { tiles: {} };
try { old = JSON.parse(fs.readFileSync('data/places/index.json', 'utf8')); } catch (e) {}
const index = { updated: new Date().toISOString(), step: STEP, tiles: { ...old.tiles } };
// le centre de chaque zone d'abord
const center = areas[0];
const order = [...tiles].sort((A, B) => {
  const d = ([i, j]) => Math.hypot((i + .5) * STEP - center.lat, ((j + .5) * STEP - center.lng) * Math.cos(center.lat * Math.PI / 180));
  return d(A[1]) - d(B[1]);
});
let total = 0, failed = 0;
for (const [k, [i, j]] of order) {
  const s = (i * STEP).toFixed(1), w = (j * STEP).toFixed(1), n = ((i + 1) * STEP).toFixed(1), e = ((j + 1) * STEP).toFixed(1);
  console.log(`Case ${k} (${s},${w} → ${n},${e})`);
  const raw = await overpass(query(s, w, n, e));
  if (!raw) { failed++; console.log('  sautée, on réessaiera au prochain passage'); continue; }
  const els = raw.map(slim).filter(Boolean).filter(x => key(x.lat, x.lon) === k);
  fs.writeFileSync(`data/places/${k}.json`, JSON.stringify(els));
  index.tiles[k] = els.length; total += els.length;
  fs.writeFileSync('data/places/index.json', JSON.stringify(index, null, 1));
  console.log(`  ${els.length} lieux`);
  publish(`Lieux : case ${k}`);
  await sleep(2000);
}
console.log(`Terminé : ${total} lieux, ${tiles.size - failed}/${tiles.size} cases réussies`);
