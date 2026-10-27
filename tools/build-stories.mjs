// Robot des histoires : écrit 2-3 phrases avec Mistral pour les lieux nommés
// qui n'ont pas d'article Wikipédia. Résultat : data/stories/<case>.json  { "n123": "texte" }
// La clé est dans le secret GitHub MISTRAL_API_KEY (jamais dans le code).
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const KEY = process.env.MISTRAL_API_KEY;
if (!KEY) { console.log('Pas de clé MISTRAL_API_KEY : rien à faire.'); process.exit(0); }
const MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';
const BATCH = 12;                 // lieux par demande
const MAX = +(process.env.MAX_PLACES || 3000); // plafond par passage
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Repères pour situer le lieu (approximatif : « près de »)
const TOWNS = [
  ['Boulogne-Billancourt', 48.8397, 2.2399], ['Paris 16e', 48.8603, 2.2620], ['Paris 15e', 48.8412, 2.3003],
  ['Saint-Cloud', 48.8440, 2.2190], ['Sèvres', 48.8238, 2.2117], ['Meudon', 48.8130, 2.2380],
  ['Issy-les-Moulineaux', 48.8245, 2.2700], ['Suresnes', 48.8711, 2.2290], ['Neuilly-sur-Seine', 48.8846, 2.2697],
  ['Garches', 48.8460, 2.1870], ["Ville-d'Avray", 48.8270, 2.1930], ['Chaville', 48.8080, 2.1880],
  ['Vanves', 48.8210, 2.2900], ['Malakoff', 48.8169, 2.2990], ['Clamart', 48.8000, 2.2660],
  ['Rueil-Malmaison', 48.8778, 2.1803], ['Puteaux', 48.8840, 2.2380], ['le bois de Boulogne', 48.8620, 2.2490],
  ['Paris 7e', 48.8560, 2.3120], ['Levallois-Perret', 48.8950, 2.2870], ['Paris 17e', 48.8870, 2.3070],
  ['Paris 14e', 48.8330, 2.3260], ['Châtillon', 48.8030, 2.2930]
];
function town(lat, lon) {
  let best = null, bd = 1e9;
  for (const [n, a, b] of TOWNS) { const d = (a - lat) ** 2 + ((b - lon) * 0.66) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
function kind(t) {
  return t.artwork_type ? `œuvre d'art (${t.artwork_type})` : t.memorial ? `mémorial (${t.memorial})` :
    t.historic ? `lieu historique (${t.historic})` : t.tourism ? t.tourism : t.leisure ? t.leisure :
    t.amenity === 'place_of_worship' ? `lieu de culte (${t.religion || '?'})` : t.amenity || 'lieu';
}

function publish(msg) {
  if (!process.env.GITHUB_ACTIONS) return;
  try {
    execSync('git add data/stories', { stdio: 'inherit' });
    execSync('git diff --cached --quiet || (git commit -q -m "' + msg + '" && git pull -q --rebase origin main && git push -q origin HEAD:main)', { stdio: 'inherit', shell: '/bin/bash' });
  } catch (e) { console.log('  enregistrement raté, on continue'); }
}

const SYSTEM = `Tu écris de petites fiches pour Quest Run, un jeu de course à pied qui fait découvrir les lieux d'une ville.
Pour chaque lieu, écris 2 ou 3 phrases en français (350 caractères maximum), vivantes, en tutoyant le joueur.
Règles strictes :
- N'invente JAMAIS de date, de nom de personne, d'architecte, de chiffre ou de fait historique dont tu n'es pas certain.
- Si tu ne connais pas ce lieu précis, décris ce qu'est ce type de lieu, ce qu'on peut y remarquer et l'ambiance du quartier, sans affirmer de fait précis.
- Pas de formule creuse du type « un lieu incontournable ».
Réponds uniquement en JSON : un objet dont les clés sont les identifiants donnés et les valeurs les textes.`;

async function ask(items) {
  const user = items.map(x => `${x.id} : « ${x.name} », ${x.kind}, près de ${x.town}${x.artist ? `, artiste : ${x.artist}` : ''}${x.date ? `, date connue : ${x.date}` : ''}${x.insc ? `, inscription : « ${x.insc} »` : ''}`).join('\n');
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model: MODEL, temperature: 0.3, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
        signal: AbortSignal.timeout(90000)
      });
      if (r.status === 429) { const w = 10000 * (attempt + 1); console.log(`  limite atteinte, pause ${w / 1000} s`); await sleep(w); continue; }
      if (r.status === 401) { console.log('Clé refusée par Mistral (401). Vérifie le secret MISTRAL_API_KEY.'); process.exit(1); }
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
      const j = await r.json();
      return JSON.parse(j.choices[0].message.content);
    } catch (e) { console.log('  erreur :', e.message); await sleep(5000 * (attempt + 1)); }
  }
  return {};
}

fs.mkdirSync('data/stories', { recursive: true });
const index = JSON.parse(fs.readFileSync('data/places/index.json', 'utf8'));
let done = 0;
for (const tile of Object.keys(index.tiles)) {
  const file = `data/stories/${tile}.json`;
  const stories = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const els = JSON.parse(fs.readFileSync(`data/places/${tile}.json`, 'utf8'));
  const todo = els.filter(e => {
    const t = e.tags || {}, name = t['name:fr'] || t.name;
    if (!name || t.wikipedia || t.wikidata) return false;
    if (t.memorial === 'plaque' || t.fountain === 'drinking' || t.access === 'private') return false;
    return !stories[e.type[0] + e.id];
  }).map(e => {
    const t = e.tags;
    return { id: e.type[0] + e.id, name: t['name:fr'] || t.name, kind: kind(t), town: town(e.lat, e.lon), artist: t.artist_name, date: t.start_date, insc: t.inscription && t.inscription.slice(0, 120) };
  });
  console.log(`Case ${tile} : ${todo.length} lieux à décrire`);
  for (let i = 0; i < todo.length && done < MAX; i += BATCH) {
    const part = todo.slice(i, i + BATCH);
    const res = await ask(part);
    for (const x of part) if (typeof res[x.id] === 'string' && res[x.id].length > 20) stories[x.id] = res[x.id].trim().slice(0, 450);
    done += part.length;
    fs.writeFileSync(file, JSON.stringify(stories));
    if ((i / BATCH) % 10 === 9) publish(`Histoires : case ${tile}`);
    await sleep(1200);
  }
  publish(`Histoires : case ${tile}`);
  if (done >= MAX) { console.log(`Plafond de ${MAX} lieux atteint, la suite au prochain passage.`); break; }
}
console.log(`Terminé : ${done} lieux traités`);
