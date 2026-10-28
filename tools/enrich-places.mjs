// Robot des histoires vérifiables (29/10) : pour chaque lieu nommé des cases data/places/,
// cherche ce qu'on peut raconter SUR LE LIEU LUI-MÊME et lui donne une note :
//   st 3 = il a son propre article Wikipédia
//   st 2 = on a des faits sur l'objet (artiste, date, matière, personne représentée, monument historique…)
//   st 1 = juste un nom et un type
// Les quêtes de l'appli tirent d'abord les lieux notés 3, puis 2.
// Sources : tags OpenStreetMap, Wikidata (créateur, date, matériau, sujet, protection…), Wikipédia.
// Usage : node tools/enrich-places.mjs
import fs from 'node:fs';

const UA = { 'User-Agent': 'QuestRun/1.0 (github.com/uba-babu92/Quest-run)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries = 3) {
  for (let k = 0; k < tries; k++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.status === 429) { await sleep(5000 * (k + 1)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { if (k === tries - 1) return null; await sleep(1500 * (k + 1)); }
  }
  return null;
}

// même règle que l'appli pour dire qu'un article parle bien de ce lieu
const STOP = new Set('le la les l de du des d et a au aux en sur sous un une parc jardin jardins square eglise chapelle musee statue fontaine monument mairie hotel ville place rue avenue allee sculpture fresque buste memorial'.split(' '));
const words = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w));
function sameName(name, title) {
  const a = words(name), b = new Set(words(title));
  if (!a.length) return false;
  const hit = a.filter(w => b.has(w)).length;
  return hit / a.length >= 0.6 && a.some(w => b.has(w) && w.length >= 4);
}

// Wikidata, par paquets de 50
const wdCache = new Map();
async function wdLoad(ids) {
  const need = [...new Set(ids.filter(id => /^Q\d+$/.test(id) && !wdCache.has(id)))];
  for (let i = 0; i < need.length; i += 50) {
    const part = need.slice(i, i + 50);
    const j = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${part.join('|')}&props=labels|claims|sitelinks&languages=fr|en&sitefilter=frwiki&format=json`);
    for (const id of part) wdCache.set(id, j?.entities?.[id] || null);
    await sleep(300);
  }
}
const label = e => e?.labels?.fr?.value || e?.labels?.en?.value || null;
const frwiki = e => e?.sitelinks?.frwiki?.title || null;
const claimIds = (e, p) => (e?.claims?.[p] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimTime = (e, p) => { const v = e?.claims?.[p]?.[0]?.mainsnak?.datavalue?.value?.time; const m = v && /^[+-](\d{1,4})/.exec(v); return m ? m[1] : null; };
const ref = id => { const e = wdCache.get(id); const l = label(e); return l ? (frwiki(e) ? [l, frwiki(e)] : [l]) : null; };

const files = fs.readdirSync('data/places').filter(f => /^\d+_\d+\.json$/.test(f));
let n3 = 0, n2 = 0, n1 = 0;
for (const f of files) {
  const path = 'data/places/' + f;
  const els = JSON.parse(fs.readFileSync(path, 'utf8'));
  const named = els.filter(e => e.tags?.name);
  console.log(`${f} : ${named.length} lieux nommés`);
  // 1) les éléments Wikidata du lieu, puis ceux qu'il cite (artiste, sujet, matière…)
  const own = named.map(e => e.tags.wikidata).filter(Boolean);
  const side = named.flatMap(e => [e.tags['artist:wikidata'], e.tags['subject:wikidata'], e.tags['name:etymology:wikidata']]).filter(Boolean).flatMap(x => x.split(';'));
  await wdLoad(own.concat(side));
  const second = [];
  for (const id of own) { const e = wdCache.get(id); for (const p of ['P170', 'P84', 'P186', 'P180', 'P1435', 'P138', 'P547']) second.push(...claimIds(e, p)); }
  await wdLoad(second);
  // 2) chaque lieu
  for (const e of named) {
    const t = e.tags, it = t.wikidata ? wdCache.get(t.wikidata) : null, fx = {};
    let sw = null;
    if (t.wikipedia) sw = t.wikipedia;
    else if (frwiki(it)) sw = 'fr:' + frwiki(it);
    else {
      // un article Wikipédia tout près avec le même nom
      const g = await getJSON(`https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${e.lat}|${e.lon}&gsradius=250&gslimit=15&format=json`);
      const hit = (g?.query?.geosearch || []).find(x => sameName(t.name, x.title));
      if (hit) sw = 'fr:' + hit.title;
      await sleep(120);
    }
    const by = (t['artist:wikidata'] && ref(t['artist:wikidata'].split(';')[0])) || claimIds(it, 'P170').map(ref).find(Boolean) || (t.artist_name ? [t.artist_name] : null);
    if (by) fx.by = by;
    const arch = claimIds(it, 'P84').map(ref).find(Boolean) || (t.architect ? [t.architect] : null);
    if (arch) fx.arch = arch;
    const date = claimTime(it, 'P571') || (t.start_date ? String(t.start_date).slice(0, 10) : null);
    if (date) fx.date = date;
    const mat = claimIds(it, 'P186').map(id => label(wdCache.get(id))).filter(Boolean);
    if (mat.length) fx.mat = mat.slice(0, 3).join(', '); else if (t.material) fx.mat = t.material;
    const dep = [t['subject:wikidata'] && ref(t['subject:wikidata'].split(';')[0]), ...claimIds(it, 'P180').map(ref), ...claimIds(it, 'P547').map(ref)].filter(Boolean);
    if (dep.length) fx.dep = dep.slice(0, 2); else if (t.subject) fx.dep = [[t.subject]];
    const named_ = (t['name:etymology:wikidata'] && ref(t['name:etymology:wikidata'].split(';')[0])) || claimIds(it, 'P138').map(ref).find(Boolean);
    if (named_) fx.named = named_;
    const her = claimIds(it, 'P1435').map(id => label(wdCache.get(id))).find(Boolean) || (t['ref:mhs'] || t.heritage ? 'monument historique' : null);
    if (her) fx.her = her;
    if (t.inscription) fx.insc = String(t.inscription).slice(0, 220);
    // note
    const linked = ['by', 'arch', 'named'].some(k => fx[k] && fx[k][1]) || (fx.dep || []).some(d => d[1]);
    const st = sw ? 3 : (linked || fx.her || (fx.date && (fx.mat || fx.by)) || (fx.by && fx.insc)) ? 2 : 1;
    e.st = st; if (sw) e.sw = sw;
    if (Object.keys(fx).length) e.fx = fx; else delete e.fx;
    if (st === 3) n3++; else if (st === 2) n2++; else n1++;
  }
  fs.writeFileSync(path, JSON.stringify(els));
}
console.log(`Terminé : ${n3} avec article, ${n2} avec des faits, ${n1} sans histoire vérifiable`);
