// Robot des lieux : télécharge les lieux OpenStreetMap des zones de data/areas.json
// et les range par cases de 0,1° (environ 11 × 7 km) dans data/places/.
// L'appli ne télécharge que les cases autour du joueur.
// Usage : node tools/build-places.mjs
import fs from 'node:fs';

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const KEEP = ['name', 'name:fr', 'amenity', 'historic', 'tourism', 'leisure', 'memorial', 'artwork_type',
  'fountain', 'drinking_water', 'access', 'garden', 'garden:type', 'religion', 'building', 'artist_name'];
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
);out center tags qt;`;
}

async function overpass(q) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const url of SERVERS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(q),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'QuestRun/1.0 (github.com/uba-babu92/Quest-run)' },
          signal: AbortSignal.timeout(150000)
        });
        if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
        const j = await r.json();
        if (!Array.isArray(j.elements)) throw new Error(`${url} réponse invalide`);
        if (!j.elements.length && j.remark) throw new Error(`${url} ${j.remark}`);
        return j.elements;
      } catch (e) { last = e; console.log('  échec :', e.message); }
    }
    await sleep(5000 * (attempt + 1));
  }
  throw last;
}

function slim(el) {
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  const tags = {};
  for (const k of KEEP) if (el.tags?.[k] != null) tags[k] = el.tags[k];
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

const index = { updated: new Date().toISOString(), step: STEP, tiles: {} };
let total = 0;
for (const [k, [i, j]] of tiles) {
  const s = (i * STEP).toFixed(1), w = (j * STEP).toFixed(1), n = ((i + 1) * STEP).toFixed(1), e = ((j + 1) * STEP).toFixed(1);
  console.log(`Case ${k} (${s},${w} → ${n},${e})`);
  const els = (await overpass(query(s, w, n, e))).map(slim).filter(Boolean).filter(x => key(x.lat, x.lon) === k);
  fs.writeFileSync(`data/places/${k}.json`, JSON.stringify(els));
  index.tiles[k] = els.length; total += els.length;
  console.log(`  ${els.length} lieux`);
  await sleep(2000);
}
fs.writeFileSync('data/places/index.json', JSON.stringify(index, null, 1));
console.log(`Terminé : ${total} lieux dans ${tiles.size} cases`);
