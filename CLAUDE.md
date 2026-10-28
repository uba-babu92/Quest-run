# Quest Run — résumé du projet

À lire en premier. Ce fichier résume ce qui a été décidé.

## Comment travailler avec Bazil
- Réponses **en français**, courtes, directes. Paragraphes de 3 lignes max, listes, info clé en gras.
- **Toujours demander son accord** avant de coder ou modifier. Ne commencer que quand il écrit **« lance »**.
- Il s'éparpille : une décision à la fois, questions directes.

## L'idée
- **Strava + Pokémon Go** : chaque sortie running devient une quête vers un vrai lieu de sa ville.
- But : garder le **côté fun** du sport, et découvrir son quartier.
- Pour l'instant, une appli **pour lui seul** (page web installée sur son téléphone).

## Le plan, étape par étape (on ne passe à la suivante que si la précédente marche)
1. **V1 pour Bazil** : il la teste 2 semaines. Est-ce qu'il court plus / avec plus d'envie ?
2. **5 à 10 potes** : lien envoyé sans relancer. Signal = qui l'ouvre encore la 2e semaine.
3. **TikTok + liste d'attente** : vidéos « statue cachée », compter les inscrits.
4. **Club de course** : sortie « chasse aux statues ».

## La V1 (validée le 26/10)
- Objectif (27/10) : **jours de course cochés L→D** + une distance par sortie (par défaut **lun/mer/ven, 7 km**).
- **Tirage au hasard** à chaque nouvelle semaine, accueil refait ou « rejouer » (27/10 ; avant, mêmes lieux pour une même semaine et une même maison).
- Chaque semaine (lundi), **une quête par jour coché**, affichée avec son jour ; celle du jour est mise en avant. Une quête ratée reste **rattrapable** sans perte de points. Lieu choisi à ~distance/2 pour un aller-retour.
- Carte : tuiles **OpenStreetMap** sans clé (CARTO demande une clé depuis 2026). **Plan clair même en mode sombre** (28/10, choix de Bazil ; avant, carte inversée qui faisait « satellite »).
- Lieux depuis **OpenStreetMap** (API Overpass, gratuite), mis en mémoire sur le téléphone.
- **Lieu normal** (mairie, église, parc, musée, point de vue, château) : point exact. **Trésor caché** (statue, fontaine, croix, borne… `p.rarity === 'rare'`) : **zone de 100 m + indice**, bouton « chaud/froid ».
- **Rareté des cartes = effort** (27/10, `tierOf`) : km A/R + D+ (100 m ≈ 1 km ; vélo ÷ 3). Commune < 6 km (100 ★), Rare 6-12 (250), **Épique** 12-20 (500, bleu), **Légendaire** > 20 (1 000, or). Trésor caché = +1 cran. Gardée sur la quête (`q.tier`) et la carte (`c.rarity`). Les anciennes cartes gardent leur rareté.
- **Progression** (27/10, `adapt`, `S.prog`) : départ selon le niveau (course/marche 3 / 5 / 8 km, plafond 8 / 12 / 20-25 km). +10 % toutes les 3 sorties réussies (sortie facile = allure < moyenne −3 % et peu de pauses → compte double ; sortie dure = allure +15 % ou > 25 % de pause → ne compte pas), max une hausse tous les 4 jours. **Abandon** (sortie ≥ 300 m terminée sans le lieu) → −15 % (−25 % au 2e de suite) + bouton « 🎯 Une plus proche · gratuit » sur la quête. 2 semaines sans sortie → −10 % (`comeback`). Message « On ajuste ta prochaine quête pour que tu la plies 💪 ».
- **Semaine variée** (`weekFactors`) : courte → normale → longue (×0,8 → ×1,25), la longue en fin de semaine. Haut de liste : « Nouvelles dans X j » (pas de compte à rebours par mission, choix de Bazil : pas de pression « Uber Eats »).
- **Apparition légendaire** (27/10, `maybeLegend`) : le week-end, après 6 sorties réussies, 1 par semaine max, **48 h**, distance = plus longue sortie +10 % (entre ×1,25 et ×1,6 la distance du moment). Écran « APPARITION LÉGENDAIRE ! », quête dorée en haut « ⏳ encore X h », hors bonus de semaine, pas de changement de mission. Ratée : « Elle reviendra ✨ », rien de perdu.
- Plaques commémoratives et fontaines à boire exclues.
- Validation par **GPS** : rayon **50 m** (100 m pour un parc/bâtiment) depuis le 27/10 (avant 35/80 m, Bazil devait être « pile dessus »), `radiusOf()`. La **photo** devient l'image de la carte (facultative).
- **Bonus +500** quand toutes les quêtes de la semaine sont faites (écran « QUEST CLEAR! »).
- Bouton **« Je ne trouve pas »** : introuvable / disparu / inaccessible → lieu retiré, nouvelle quête, aucun point perdu.
- Niveaux (27/10) : **12 paliers avec un titre** (Promeneur 0 → Curieux 300 → Coureur du quartier 800 → Éclaireur 1 500 → Pisteur 2 500 → Explorateur 4 000 → Aventurier 6 000 → Chasseur de trésors 8 500 → Gardien de la ville 12 000 → Légende du quartier 16 000 → Maître des cartes 21 000 → Mythe urbain 27 000). Écran arcade à chaque niveau.
- **23 trophées** (cartes, rares, km cumulés, sortie de 10 km, semaines complètes, série, lève-tôt, noctambule, touche-à-tout, vélo, marche) avec animation, rangés dans le Profil (`TROPHIES`).
- **Sport** choisi sur l'écran prêt : course / marche / vélo (itinéraire piéton ou vélo, vitesse en km/h à vélo). Le sport est gardé sur la sortie et sur la carte. Mêmes points pour tous les sports (à revoir si le vélo est trop facile).
- **Pas dans la V1** : boss, mythologie, boosters, comptes, classement entre amis (étape 2).

## Design (validé le 26/10)
- **Recette Duolingo** : écrans du quotidien propres et sportifs, moments de victoire **arcade** à fond.
- **Violet électrique** `#7B2FF7` (marque, boutons, quêtes) + **or** `#FFB800` (points, victoires).
- **Sombre par défaut** (27/10, choix de Bazil ; avant : clair). **Interrupteur « Mode sombre »** dans les Paramètres (plus de mode Auto).
- Écrans de victoire toujours **noirs**, police pixel « Press Start 2P », confettis, carte qui se retourne.
- Cartes : **argent** = commune, **violet** = rare, **or** = légendaire (plus tard).

## Refonte « quête RPG » (28/10, décidée avec Bazil)
- **L'essence de l'appli = la quête**, façon RPG (effet World of Warcraft), mais **ultra simple** : on doit comprendre en 3 secondes.
- **Le vieux sage** (façon Duolingo, mais un vieux sage) donne les quêtes. Bazil dessine des esquisses du personnage à animer ; en attendant, avatar provisoire.
- **Ton des quêtes : Zelda Minish Cap** (phrases courtes, rumeurs, malice). Exemple : « Hé, toi ! Oui, toi, le coureur ! J'ai entendu dire qu'un vieux château cachait une carte… Va jeter un œil et dis-moi si tu trouves quelque chose ! » **Parler de carte, jamais de coffre.** Textes d'avant-sortie écrits à la main par type de lieu (`QUEST_LINES`), affichés lettre par lettre dans une bulle.
- **À l'arrivée, le sage raconte la vraie histoire** du lieu (Wikipédia ; l'IA la réécrit dans sa voix, sources Wikipédia seulement).
- Pas d'ennemi, pas de chapitres pour l'instant (univers « Oubli » / voyage dans le temps jugés trop compliqués).
- **Partage de carte** en PNG format story (photo, rareté, nom, run, date, 2-3 lignes d'histoire, **logo seul**, pas de lien ni QR). Seulement les cartes débloquées.
- **Quête entre amis** : « 👥 Partager la quête » → lien ; l'ami reçoit la même quête (sinon accueil puis quête). Sans serveur : pas de suivi en direct (étape 2). Limite iPhone : le lien s'ouvre dans Safari, pas dans l'appli installée.
- **Vitrine** (pas de boutique d'achat de cartes) : cartes les plus rares, effets holographiques « dingues » sur les Légendaires, taux de chance affichés, **cartes Mythiques** à 4 dates par an (72 h) : week-end du 1er mai, Journée mondiale de la course (1er mercredi de juin), 3e week-end de septembre (pic mondial de course + Journées du patrimoine), 11 novembre. Sources : bilans Strava (pic mi-septembre, jours fériés).
- **Booster physique** : « 📦 Reçois tes cartes en vrai » = « Bientôt disponible » + compteur (test de porte). Plus tard : pack 9/18 cartes (photo, run, date, description) via imprimeur (Gelato API ; spécialistes holo QP Market Network, Aura Print, UPrinting : minimums de commande).
- **Rétention** (inspiré Duolingo, Pokémon Go, Strava, Wordle) : série 🔥 (jours de sortie prévus tenus), cadeau du jour (coffre sur 7 jours), défi du mois + badge, bilan de la semaine à partager, **notifs perso uniquement** (1/jour max, heure habituelle, pause après 3 ignorées ; via le relais Cloudflare).
- **Fait (v40, 28/10)** : sage provisoire 🧙 (`sageBox`, `typeText`), `QUEST_LINES` par type (`questKind`), titre de quête dans la liste + « ! » jaune tant que la quête n'est pas ouverte (`q.seen`), histoire racontée par le sage (`AI_V` 4, voix du sage dans `STORY_RULES`), `shareCard` (PNG 1080×1920 via canvas, menu de partage iPhone), `shareQuest` (lien `#q=` base64, prénom demandé une fois `S.name`), `addFriendQuest` (quête `q.friend`, 7 jours, hors bonus de semaine, lieu gardé au rechargement `keepQuestPlaces`).
- **DA + typo** : séance avec Bazil le 29/10 à 10 h (rappel Google Agenda). Typo : **une seule police**, plus de police pixel (« ne va pas avec le flat design »). Bazil trouve l'appli « trop basique, trop codée par Claude ».

## Robot des lieux (27/10)
- Les serveurs Overpass ne répondaient pas depuis le téléphone de Bazil → les lieux sont **préparés à l'avance**.
- `data/areas.json` : zones à couvrir (pour l'instant **Boulogne-Billancourt, 10 km**). Seul le centre-ville y figure, jamais l'adresse de Bazil.
- `tools/build-places.mjs` + `.github/workflows/places.yml` : le robot GitHub télécharge les lieux, les range en **cases de 0,1°** (`data/places/488_22.json`…, sommaire dans `index.json`). Il tourne à chaque modif de `areas.json` et **chaque lundi**.
- L'appli lit les cases autour du joueur ; si une case manque, elle tente Overpass en secours.
- Plan : étape 2 = Île-de-France, étape 3 = France entière (même système, plus de cases).

## Fiche Wikipédia + mode course (27/10)
- **Photo du lieu** (27/10) : Wikipédia, sinon tag OSM `image`, sinon la photo **Wikimedia Commons** la plus proche (60 m, 150 m pour un parc ; nom correspondant en priorité). Affichée sur la carte et, si tu as mis ta propre photo, au verso (fiche) « 📷 Le lieu en photo ».
- **Carte qui se retourne** (27/10) : dans la fiche, glisser la carte → rotation 3D **dans le sens du doigt** (28/10). **Toucher = photo du côté visible en plein écran** (`zoomImg`, toucher ou glisser vers le bas pour fermer). Recto = ta photo (sinon la photo du lieu), verso = la photo du lieu (sinon les infos de la découverte). Amorce de rotation + « 👆 Glisse pour retourner la carte » à l'ouverture. La grille Collection montre le recto.
- **Favoris** (27/10) : bouton ♡ dans la fiche (`c.fav`), ♥ sur la carte, filtre **Toutes / ♥ Favoris** dans la Collection, favoris en premier.
- **Image verrouillée** sur chaque quête (floue, noir et blanc, cadenas). Débloquée quand on trouve le lieu.
- **Histoire** : tag OSM `wikipedia`/`wikidata`, sinon recherche Wikipédia autour du point (`geosearch`, 400 m) avec un nom qui correspond. Résumé + image mis en cache (`S.wiki`). Sans article : infos OSM (artiste, date, inscription).
- **Mode course** (« 🏃 J'y vais ! ») : chrono, km, allure actuelle (≈250 derniers m) et moyenne, tracé, « Plus que X km », voix à chaque km, pause, écran gardé allumé (Wake Lock). Arrivée détectée toute seule → photo → victoire → « Retour maison » → résumé.
- **Limite iPhone** : pas de GPS écran éteint pour une page web. La course reprend au retour (sauvegardée dans `questrun.run`). **Trou comblé** (27/10) : si l'ancienne et la nouvelle position sont sur l'itinéraire (< 80 m), la distance et le tracé suivent l'itinéraire entre les deux (`fillGap`).
- La **course est collée à la carte** : km, temps, allure, tracé au dos (fiche). Historique dans le Profil.
- Mode test : bouton « ▶ Simuler » retiré le 28/10 (code gardé, `#rsim` toujours caché).

## Lieux vérifiables + IA sourcée (27/10, demande de Bazil)
- **Seulement des lieux nommés** ; graffitis et installations exclus (souvent effacés). `PARSE_V` force un nouveau tri ; les quêtes à faire sur un lieu retiré sont remplacées.
- L'IA ne doit **jamais inventer** : l'appli envoie au relais les **extraits Wikipédia des articles proches** (geosearch 600 m, 3 max). Consigne : n'utiliser que ces extraits ; sinon raconter le quartier ; sinon répondre AUCUNE → « Pas d'histoire connue ».
- Affichage : « 📚 D'après Wikipédia (titres cliquables), résumé par IA ». Version des consignes : `AI_V` (3 depuis le 27/10 : les anciens textes sont réécrits).
- **Consignes dans l'appli** (`STORY_RULES`, envoyées au relais) : faits **précis** (noms, rois, dates, événements, chiffres) tirés des extraits, 3-4 phrases, pas de phrase vague. Extraits de 1 500 caractères. Changer les consignes = modifier `index.html`, plus besoin de recoller le code Cloudflare.
- L'histoire s'affiche **directement sous la carte** à l'écran de victoire.

## Histoires à la demande (27/10, choix de Bazil)
- **Pas de génération en masse.** Quand on ouvre la fiche d'une carte sans Wikipédia, l'appli demande 2-3 phrases à Mistral **une seule fois**, puis les garde (`S.wiki[id].ai`).
- Passage par un **relais Cloudflare Worker** (`tools/worker.js`) qui utilise **Workers AI** (`@cf/mistralai/mistral-small-3.1-24b-instruct`, quota gratuit quotidien) via une liaison nommée **AI** : aucune clé à gérer. N'accepte que l'origine `https://uba-babu92.github.io`.
- La 1re clé Mistral a été exposée dans une capture le 27/10 puis supprimée par Bazil. Plus de clé Mistral utilisée.
- Adresse du relais : https://questrun-histoires.v5nhskv7zy.workers.dev (constante `STORY_API` dans `index.html`).

## Robot des histoires (27/10, désactivé)
- Pour les lieux **nommés sans Wikipédia**, `tools/build-stories.mjs` (workflow `stories.yml`, chaque lundi) demande à **Mistral** (`mistral-small-latest`, offre gratuite) 2-3 phrases, par lots de 12.
- Clé dans le **secret GitHub `MISTRAL_API_KEY`** — jamais dans le code (dépôt public).
- Consigne : pas de date/nom/fait inventé ; sinon décrire le type de lieu et l'ambiance. L'appli affiche « ✨ Texte généré par IA ».
- Résultat : `data/stories/<case>.json` (`{ "n123": "texte" }`). L'appli l'affiche si Wikipédia n'a rien.

## Mode course façon Strava (27/10, choix de Bazil)
- **Écran « prêt »** : carte plein écran, itinéraire à pied violet jusqu'au lieu (`routing.openstreetmap.de/routed-foot`, sans clé ; sinon ligne droite en pointillés), distance aller et aller-retour, état du GPS, gros bouton rond violet **Démarrer**.
- **Pendant** : carte en grand (itinéraire violet, tracé réel or), encadré en bas temps / allure / distance, **temps par km** en barres, « Plus que X km » mesuré **le long du chemin**. Pause → Reprendre / Terminer.
- **Retour** : nouvel itinéraire vers la maison qui évite si possible le chemin de l'aller (boucle).
- Pas retenu : pause en jaune, titre + ressenti à la fin.
- Limite HTML : GPS coupé écran verrouillé / autre appli. Passage à une vraie appli (Capacitor, Mac + compte Apple) prévu à l'étape 2-3, ou plus tôt si l'écran allumé gêne.

## Navigation + sentiers (27/10, après une sortie où Bazil s'est perdu et est tombé sur des travaux)
- Itinéraire via **BRouter** (`brouter.de`, gratuit, sans clé) profil **hiking-mountain** (course/marche, préfère sentiers, parcs, rues calmes) ou **trekking** (vélo), 2 variantes demandées ; secours OSRM, puis ligne droite. Moteur affiché sur l'écran prêt en mode dév. BRouter fournit aussi les altitudes (D+ sans Open-Meteo).
- Pas de GPX partagés utilisables (Strava, Komoot, AllTrails fermés).
- **Recalcul auto** si on est à plus de 40 m du chemin pendant 15 s (max 1 fois / 30 s) + bouton **↻**. Les travaux ne sont connus d'aucune carte.
- **Navigation** : carte zoomée (niveau 17) qui suit, **flèche** orientée (boussole GPS ou sens du déplacement), **bandeau** « Dans 120 m · tourne à gauche » (virages calculés sur le tracé, > 30°), **voix** (27/10) : au départ « Tout droit sur 400 m, puis tourne à gauche », « Dans 150 mètres, tourne à droite », « Tourne à droite. » au virage, « Continue tout droit sur… » après ; bouton **🗺️ vue d'ensemble / 🧭 recentrer** (déplacer la carte coupe le suivi). La carte ne tourne pas (limite HTML), c'est la flèche qui tourne.

## Dénivelé (27/10, demande de Bazil : « 7 km jusqu'à Meudon, c'est beaucoup plus dur »)
- Altitudes via **Open-Meteo** (`api.open-meteo.com/v1/elevation`, gratuit, sans clé), gardées sur les lieux (`p.ele`, `S.homeEle`).
- **Quêtes choisies en distance « effort »** : km A/R + **100 m de D+ ≈ 1 km**. D+ estimé d'une quête = |altitude lieu − maison| × 1,2.
- Sur chaque quête, petit texte discret avec la flèche « ↗ 41 m · Vallonné » : Plat (< 40 m), Vallonné (< 120 m), Ça grimpe : texte en couleur (vert / orange / rouge), sans fond ni pastille (27/10).
- Écran prêt : D+ / D− réels de l'itinéraire. Pendant : D+ en direct (altitude GPS lissée, seuil 4 m). Fin : D+ recalculé sur la trace (altitudes), affiché dans le résumé, la fiche, les sorties et les stats.
- Trophées ajoutés : ⛰️ Grimpeur (100 m D+ en une sortie), 🏔️ Montagnard (1 000 m D+ au total) → 23 trophées.

## Pièces + changer de mission + chargement (27/10, choix de Bazil)
- **🪙 Pièces** = monnaie à dépenser, à part des ★ (les ★ = expérience/niveau, ne baissent jamais). 30 au départ, +10 par lieu, +30 par semaine complète.
- **« 🔄 Changer de mission »** sur une quête : **gratuit 1 fois par semaine**, puis **10 🪙**. Choix parmi **3 propositions** à la même distance (même rareté en priorité).
- Fin de l'accueil : **chargement « Recherche des trésors dans ton quartier… »** (~7 s, étapes cochées avec les vrais chiffres : lieux trouvés, trésors cachés), puis « TES 3 QUÊTES SONT PRÊTES ! ».
- **Boutique** (toucher 🪙 en haut, ou Profil → Boutique) : packs 100 / 550 / 1 200 🪙 à 0,99 / 4,99 / 9,99 €, **pas de vrai paiement** : « Bientôt disponible » + compteur de tentatives (`S.shopTaps`, visible en mode dév) = test de porte pour l'étape 2-3. Vrai paiement (Stripe / achats Apple) à l'étape 3.
- **+5 🪙 par jour** d'ouverture (`dailyBonus`). Mode dév : bouton +100 🪙.

## Profil / Paramètres / Trophées (27/10, choix de Bazil)
- **Profil** = niveau + titre, ligne **Ma semaine** (« 3 sorties · 7 km · Modifier › »), **Mes stats** (lieux, rares, semaines complètes, sorties, km, temps de sport, allure course, vitesse vélo, plus longue sortie), ligne **Trophées** (3 derniers + « Voir tout › », page à part), dernières sorties.
- **Paramètres** : roue ⚙️ en haut à droite du Profil. Mes préférences ›, mode sombre, voix, lieux, mode développeur, tout effacer.
- **Mes préférences** (28/10, `renderPref`, page `pref`) : jours + distance (brouillon, rien ne change avant de payer) → **« Appliquer · 20 🪙 »** (`PREF_COST`) avec confirmation, nouvelles quêtes (les faites sont gardées). Pas assez de 🪙 → lien Boutique. Sport par défaut : gratuit. Progression auto et accueil : gratuits.
- **Accueil** : 1er écran « Tu fais plutôt… » course / vélo / marche-rando (distance proposée 7 / 20 / 5 km).
- **Niveau** (27/10) juste après le sport : Débutant / Intermédiaire / Confirmé → distance de départ (`KM_LVL`) : course et marche 3/5/8 km, vélo 10/15/20 km (puis progression). Curseur : 1-30 km (course, marche), 1-20 km (vélo, limite de la zone de 10 km). Dans `S.skill` et `S.quiz.niveau`. Repères : course 3-5 / 6-10 / 10-20 km, rando 3-5 / 6-12 / 15-25 km, vélo 10-20 / 25-50 / 60-100 km. Vélo au-delà de 20 km : pas prioritaire (Bazil ne roule pas).
- **Questions adaptées au sport** (27/10, `quizFor(sport)`) : textes « courir / marcher / sortir le vélo », « balade » pour la marche (frein « Je ne trouve pas le temps » au lieu de « je lâche »).
- **3 questions sur les freins des coureurs** (27/10, `QUIZ`), juste après le sport : ce qui freine (motivation / ennui / où aller / je lâche), même parcours ?, objectif tenu ? Chaque réponse affiche ~2 s une phrase « Quest Run résout ça ». Réponses dans `S.quiz` et dans les métriques (`onboarding_answers`). Étapes de l'accueil : 0 bienvenue, 1 sport, 2 niveau, 3-5 questions, 6 semaine, 7 départ, 8 **« Quest Run, c'est quoi ? »** (🎮 quête / 📚 quartier / 🏆 carte la plus rare), 9 chargement.
- **Fiche d'une quête** (28/10) : plus de boutons « Itinéraire » ni « J'y suis » (seulement « J'y vais ! », changer de mission, je ne trouve pas) ; en mode test : « ✅ J'y suis (test) ».
- **Écran prêt** (28/10) : plus de chiffres ni de « Simuler » ; distance A/R + D+ + GPS en petit sous le nom du lieu ; en bas seulement Course/Marche/Vélo + Démarrer.
- Écran de course : **HUD compact pendant la sortie** (28/10, `#run.compact`) : chiffres seuls, puis une ligne ⏸ / **« 📍 J'y suis »** (« 🏠 Rentré » au retour) / 🔊 ; sans titre ni barres des km (visibles au résumé). La carte prend ~75 % de l'écran. L'écran prêt garde le grand bouton Démarrer.

## Métriques d'usage (27/10)
- Module autonome **`Metrics`** dans `index.html` (bloc « MÉTRIQUES », à retirer avec les lignes `track(...)`). Clé `localStorage` **`questrun_metrics`**, rien n'est envoyé sur internet.
- Données : first_seen, last_seen, sessions, session_durations (s, chrono coupé en arrière-plan, sauvé sur `pagehide`), runs, deaths_by_level, levels_completed, day1_returns, days_active, consent.
- Correspondance avec le jeu : partie = **sortie** (`goRun`) ; « mort » = **sortie terminée sans lieu** (`finishRun`) ou **« Je ne trouve pas »** (`report`), rangée par **niveau du joueur** ; niveau réussi = **lieu trouvé** (`award`).
- Retour J1 = day1_returns / jours actifs passés (hors aujourd'hui).
- **Stats visibles seulement en mode développeur** (Paramètres). **Appui long 3 s sur le logo** de l'écran Quêtes = **export JSON** (partage iPhone ou téléchargement), sans montrer les stats aux testeurs.
- Message d'info une fois (« Ce jeu enregistre anonymement… », bouton OK). Rien n'est compté avant OK. « Tout effacer » ne supprime pas les métriques.

## Mode développeur (27/10)
- Paramètres → « 🔒 Mode développeur » → mot de passe (connu de Bazil ; seule son empreinte SHA-256 est dans le code, le dépôt est public).
- Contient : **mode test** (« J'y suis » sans GPS), rejouer la semaine, revoir l'accueil, verrouiller.

## Fichiers
- `index.html` : toute l'appli (HTML + CSS + JS, aucune compilation).
- `manifest.webmanifest`, `icon*.png`, `icon.svg` : installation sur l'écran d'accueil.
- `sw.js` : fonctionne sans réseau une fois ouverte.
- Données : `localStorage` (clé `questrun.v1`), photos dans IndexedDB. Tout reste sur le téléphone.

## Mise en ligne
GitHub Pages, branche `main`, dossier racine → https://uba-babu92.github.io/Quest-run/ (dépôt public depuis le 27/10)
Le HTTPS est obligatoire pour le GPS et l'appareil photo.

## Idées en attente
- **Avatar** sur le profil (Bazil, 27/10) : après la V1.
- **Échange de cartes entre joueurs** (Bazil, 27/10) : besoin de comptes + serveur → étape 2-3. Conseil : ne pas échanger la carte d'un lieu (preuve qu'on y a couru), plutôt des cartes bonus/doublons.
- **« Partager ma carte »** en image pour story Instagram/TikTok (pub gratuite, étape 3).
- **Motivation façon Duolingo** (Bazil, 27/10) : à préciser avec lui (série, rappels, messages…).
