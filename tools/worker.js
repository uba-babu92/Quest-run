// Relais Quest Run → Mistral, via l'IA de Cloudflare (Workers AI). Aucune clé à gérer.
// Il faut une liaison « Workers AI » nommée AI (Settings → Bindings).
// Notifications : un espace KV lié sous le nom PUSH + un déclencheur Cron « 0 * * * * » (voir en bas).
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
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!ok) return new Response('Interdit', { status: 403, headers: cors });
    const path = new URL(req.url).pathname;
    if (path.startsWith('/push/')) return pushRoute(req, env, path, cors);
    if (path === '/mail') return mailRoute(req, env, cors);
    if (req.method !== 'POST') return new Response('Interdit', { status: 403, headers: cors });
    let b;
    try { b = await req.json(); } catch (e) { return new Response('JSON invalide', { status: 400, headers: cors }); }
    const clip = (v, n) => typeof v === 'string' ? v.replace(/[\n\r]/g, ' ').slice(0, n) : '';
    const name = clip(b.name, 120), kind = clip(b.kind, 60), artist = clip(b.artist, 80), date = clip(b.date, 30), insc = clip(b.insc, 120);
    const lat = +b.lat, lng = +b.lng;
    if (!name || !isFinite(lat) || !isFinite(lng)) return new Response('Lieu incomplet', { status: 400, headers: cors });
    const sources = (Array.isArray(b.sources) ? b.sources : []).slice(0, 3)
      .map(x => ({ title: clip(x && x.title, 120), text: clip(x && x.text, 1500) })).filter(x => x.title && x.text);
    if (!sources.length) return new Response(JSON.stringify({ text: '' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    const user = `Lieu : « ${name} », ${kind || 'lieu'}, près de ${town(lat, lng)}${artist ? `, artiste : ${artist}` : ''}${date ? `, date : ${date}` : ''}${insc ? `, inscription : « ${insc} »` : ''}

Extraits Wikipédia :
${sources.map((x, i) => `[${i + 1}] ${x.title} : ${x.text}`).join('\n\n')}`;
    // consignes envoyées par l'appli (pour les changer sans revenir ici), sinon celles par défaut
    const rules = typeof b.rules === 'string' && b.rules.length > 50 ? b.rules.slice(0, 2500) : SYSTEM;
    if (!env.AI) return new Response('Liaison Workers AI manquante (nom : AI)', { status: 500, headers: cors });
    let out;
    try {
      out = await env.AI.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
        messages: [{ role: 'system', content: rules }, { role: 'user', content: user }], max_tokens: 380, temperature: 0.2 });
    } catch (e) { return new Response('IA indisponible : ' + e.message, { status: 502, headers: cors }); }
    let text = String(out?.response || '').trim().replace(/^["«\s]+|["»\s]+$/g, '').slice(0, 700);
    if (/^AUCUNE\b/i.test(text) || text.length < 20) text = '';
    return new Response(JSON.stringify({ text }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
  // toutes les heures (déclencheur Cron « 0 * * * * ») : envoie les notifs prévues
  async scheduled(event, env, ctx) { ctx.waitUntil(sendDue(env)); }
};

/* =====================================================================
   NOTIFICATIONS PERSO (28/10)
   Il faut : un espace KV lié sous le nom PUSH + un déclencheur Cron toutes les heures.
   Les clés de sécurité (VAPID) sont créées toutes seules au premier appel et rangées dans PUSH.
   L'appli envoie son planning (1 notif par jour max) ; ici on envoie quand l'heure arrive.
   ===================================================================== */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0), o = new Uint8Array(n); let i = 0; for (const y of a) { o.set(y, i); i += y.length; } return o; };
const enc = t => new TextEncoder().encode(t);
async function hmac(key, data) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
async function vapidKeys(env) {
  let v = await env.PUSH.get('vapid', 'json');
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    v = { priv: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
    await env.PUSH.put('vapid', JSON.stringify(v));
  }
  return v;
}
async function vapidAuth(env, endpoint) {
  const v = await vapidKeys(env), aud = new URL(endpoint).origin;
  const head = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://uba-babu92.github.io/Quest-run/' })));
  const key = await crypto.subtle.importKey('jwk', v.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.pub}`;
}
// chiffrement du message (RFC 8291, aes128gcm)
async function encryptPush(sub, text) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const prkKey = await hmac(auth, shared);
  const ikm = await hmac(prkKey, cat(enc('WebPush: info\0'), ua, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, cat(enc(text), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), asPub, ct);
}
async function sendPush(env, sub, msg) {
  const body = await encryptPush(sub, JSON.stringify(msg));
  return fetch(sub.endpoint, { method: 'POST', body, headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '43200', Urgency: 'normal', Authorization: await vapidAuth(env, sub.endpoint) } });
}
async function subKey(endpoint) { return 'sub:' + b64u(await crypto.subtle.digest('SHA-256', enc(endpoint))).slice(0, 32); }
async function pushRoute(req, env, path, cors) {
  const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.PUSH) return json({ error: 'Espace KV manquant (nom : PUSH)' }, 500);
  if (path === '/push/key') return json({ key: (await vapidKeys(env)).pub });
  if (req.method !== 'POST') return json({ error: 'POST attendu' }, 405);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'JSON invalide' }, 400); }
  const sub = b && b.sub;
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return json({ error: 'abonnement invalide' }, 400);
  const key = await subKey(sub.endpoint);
  if (path === '/push/off') { await env.PUSH.delete(key); return json({ ok: true }); }
  if (path === '/push/test') { const r = await sendPush(env, sub, { title: 'Quest Run', body: 'Hé hé… Les notifications marchent ! Le vieux sage te fera signe 🧙' }); return json({ ok: r.ok, status: r.status }); }
  if (path === '/push/plan') {
    const plan = (Array.isArray(b.plan) ? b.plan : []).slice(0, 12).map(x => ({ t: +x.t, title: String(x.title || '').slice(0, 60), body: String(x.body || '').slice(0, 180) })).filter(x => x.t > Date.now() - 3600e3 && x.title);
    await env.PUSH.put(key, JSON.stringify({ sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, plan, ignored: 0, at: Date.now() }), { expirationTtl: 45 * 86400 });
    return json({ ok: true, n: plan.length });
  }
  return json({ error: 'inconnu' }, 404);
}
async function sendDue(env) {
  if (!env.PUSH) return;
  let cursor;
  do {
    const page = await env.PUSH.list({ prefix: 'sub:', cursor });
    for (const k of page.keys) {
      const rec = await env.PUSH.get(k.name, 'json'); if (!rec) continue;
      const now = Date.now(), due = rec.plan.filter(x => x.t <= now);
      if (!due.length) continue;
      rec.plan = rec.plan.filter(x => x.t > now);
      const last = due[due.length - 1];
      // pause après 3 notifs sans réponse (l'appli remet le compteur à 0 quand on l'ouvre)
      if (rec.ignored < 3 && now - last.t < 3 * 3600e3) {
        const r = await sendPush(env, rec.sub, { title: last.title, body: last.body });
        if (r.status === 404 || r.status === 410) { await env.PUSH.delete(k.name); continue; }
        rec.ignored++;
      }
      await env.PUSH.put(k.name, JSON.stringify(rec), { expirationTtl: 45 * 86400 });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
}

/* ---------- e-mails « Me prévenir » du booster (29/10) : rangés dans PUSH sous « mail:… » ---------- */
async function mailRoute(req, env, cors) {
  const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!env.PUSH) return json({ error: 'Espace KV manquant (nom : PUSH)' }, 500);
  if (req.method !== 'POST') return json({ error: 'POST attendu' }, 405);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'JSON invalide' }, 400); }
  const email = String(b && b.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'e-mail invalide' }, 400);
  if (b.news !== true) return json({ error: 'consentement manquant' }, 400);
  const key = 'mail:' + b64u(await crypto.subtle.digest('SHA-256', enc(email))).slice(0, 24);
  const old = await env.PUSH.get(key, 'json');
  await env.PUSH.put(key, JSON.stringify({ email, news: true, src: String(b.src || '').slice(0, 20), t: old ? old.t : new Date().toISOString() }));
  return json({ ok: true });
}
