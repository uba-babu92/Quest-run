// Relais Quest Run → Mistral, via l'IA de Cloudflare (Workers AI). Aucune clé à gérer.
// Il faut une liaison « Workers AI » nommée AI (Settings → Bindings).
// N'accepte que les demandes venant de l'appli.
const ALLOWED = ['https://uba-babu92.github.io'];

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
function town(lat, lng) {
  let best = 'la ville', bd = 1e9;
  for (const [n, a, b] of TOWNS) { const d = (a - lat) ** 2 + ((b - lng) * 0.66) ** 2; if (d < bd) { bd = d; best = n; } }
  return bd < 0.003 ? best : 'la ville';
}

const SYSTEM = `Tu écris la fiche d'un lieu pour Quest Run, un jeu de course à pied qui fait découvrir l'histoire d'une ville.
On te donne le nom et le type du lieu, puis des EXTRAITS D'ARTICLES WIKIPÉDIA sur des lieux proches.
Règles absolues :
- Utilise UNIQUEMENT les faits écrits dans les extraits. Aucune connaissance extérieure. Aucune date, aucun nom, aucun chiffre qui n'y figure pas.
- Si un extrait parle du lieu lui-même, raconte son histoire en 3 ou 4 phrases.
- Sinon, si les extraits racontent l'histoire de la rue, du quartier ou d'un bâtiment voisin, raconte cette histoire en 2 ou 3 phrases, en le disant clairement (par exemple : « Tu es dans le quartier de… »).
- Si les extraits ne permettent rien d'intéressant et de sûr, réponds exactement : AUCUNE
- Français, tutoiement, ton vivant, 450 caractères maximum. Réponds uniquement par le texte.`;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const ok = ALLOWED.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !ok) return new Response('Interdit', { status: 403, headers: cors });
    let b;
    try { b = await req.json(); } catch (e) { return new Response('JSON invalide', { status: 400, headers: cors }); }
    const clip = (v, n) => typeof v === 'string' ? v.replace(/[\n\r]/g, ' ').slice(0, n) : '';
    const name = clip(b.name, 120), kind = clip(b.kind, 60), artist = clip(b.artist, 80), date = clip(b.date, 30), insc = clip(b.insc, 120);
    const lat = +b.lat, lng = +b.lng;
    if (!name || !isFinite(lat) || !isFinite(lng)) return new Response('Lieu incomplet', { status: 400, headers: cors });
    const sources = (Array.isArray(b.sources) ? b.sources : []).slice(0, 3)
      .map(x => ({ title: clip(x && x.title, 120), text: clip(x && x.text, 900) })).filter(x => x.title && x.text);
    if (!sources.length) return new Response(JSON.stringify({ text: '' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    const user = `Lieu : « ${name} », ${kind || 'lieu'}, près de ${town(lat, lng)}${artist ? `, artiste : ${artist}` : ''}${date ? `, date : ${date}` : ''}${insc ? `, inscription : « ${insc} »` : ''}

Extraits Wikipédia :
${sources.map((x, i) => `[${i + 1}] ${x.title} : ${x.text}`).join('\n\n')}`;
    if (!env.AI) return new Response('Liaison Workers AI manquante (nom : AI)', { status: 500, headers: cors });
    let out;
    try {
      out = await env.AI.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], max_tokens: 260, temperature: 0.2 });
    } catch (e) { return new Response('IA indisponible : ' + e.message, { status: 502, headers: cors }); }
    let text = String(out?.response || '').trim().replace(/^["«\s]+|["»\s]+$/g, '').slice(0, 500);
    if (/^AUCUNE\b/i.test(text) || text.length < 20) text = '';
    return new Response(JSON.stringify({ text }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
