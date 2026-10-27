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
- Chaque semaine (lundi), **une quête par jour coché**, affichée avec son jour ; celle du jour est mise en avant. Une quête ratée reste **rattrapable** sans perte de points. Lieu choisi à ~distance/2 pour un aller-retour.
- Carte : tuiles **OpenStreetMap** sans clé (CARTO demande une clé depuis 2026) ; mode sombre = carte inversée en CSS.
- Lieux depuis **OpenStreetMap** (API Overpass, gratuite), mis en mémoire sur le téléphone.
- **Commune** (mairie, église, parc, musée, point de vue, château) : point exact, **100 pts**.
- **Rare** (statue, fresque, fontaine, croix, borne…) : **zone de 100 m + indice**, bouton « chaud/froid », **250 pts**.
- Plaques commémoratives et fontaines à boire exclues.
- Validation par **GPS** (35 m, 80 m pour un parc/bâtiment). La **photo** devient l'image de la carte (facultative).
- **Bonus +500** quand toutes les quêtes de la semaine sont faites (écran « QUEST CLEAR! »).
- Bouton **« Je ne trouve pas »** : introuvable / disparu / inaccessible → lieu retiré, nouvelle quête, aucun point perdu.
- Niveaux (27/10) : **12 paliers avec un titre** (Promeneur 0 → Curieux 300 → Coureur du quartier 800 → Éclaireur 1 500 → Pisteur 2 500 → Explorateur 4 000 → Aventurier 6 000 → Chasseur de trésors 8 500 → Gardien de la ville 12 000 → Légende du quartier 16 000 → Maître des cartes 21 000 → Mythe urbain 27 000). Écran arcade à chaque niveau.
- **23 trophées** (cartes, rares, km cumulés, sortie de 10 km, semaines complètes, série, lève-tôt, noctambule, touche-à-tout, vélo, marche) avec animation, rangés dans le Profil (`TROPHIES`).
- **Sport** choisi sur l'écran prêt : course / marche / vélo (itinéraire piéton ou vélo, vitesse en km/h à vélo). Le sport est gardé sur la sortie et sur la carte. Mêmes points pour tous les sports (à revoir si le vélo est trop facile).
- **Pas dans la V1** : boss, mythologie, boutique, boosters, légendaires, comptes.

## Design (validé le 26/10)
- **Recette Duolingo** : écrans du quotidien propres et sportifs, moments de victoire **arcade** à fond.
- **Violet électrique** `#7B2FF7` (marque, boutons, quêtes) + **or** `#FFB800` (points, victoires).
- **Sombre par défaut** (27/10, choix de Bazil ; avant : clair). **Interrupteur « Mode sombre »** dans les Paramètres (plus de mode Auto).
- Écrans de victoire toujours **noirs**, police pixel « Press Start 2P », confettis, carte qui se retourne.
- Cartes : **argent** = commune, **violet** = rare, **or** = légendaire (plus tard).

## Robot des lieux (27/10)
- Les serveurs Overpass ne répondaient pas depuis le téléphone de Bazil → les lieux sont **préparés à l'avance**.
- `data/areas.json` : zones à couvrir (pour l'instant **Boulogne-Billancourt, 10 km**). Seul le centre-ville y figure, jamais l'adresse de Bazil.
- `tools/build-places.mjs` + `.github/workflows/places.yml` : le robot GitHub télécharge les lieux, les range en **cases de 0,1°** (`data/places/488_22.json`…, sommaire dans `index.json`). Il tourne à chaque modif de `areas.json` et **chaque lundi**.
- L'appli lit les cases autour du joueur ; si une case manque, elle tente Overpass en secours.
- Plan : étape 2 = Île-de-France, étape 3 = France entière (même système, plus de cases).

## Fiche Wikipédia + mode course (27/10)
- **Image verrouillée** sur chaque quête (floue, noir et blanc, cadenas). Débloquée quand on trouve le lieu.
- **Histoire** : tag OSM `wikipedia`/`wikidata`, sinon recherche Wikipédia autour du point (`geosearch`, 400 m) avec un nom qui correspond. Résumé + image mis en cache (`S.wiki`). Sans article : infos OSM (artiste, date, inscription).
- **Mode course** (« 🏃 J'y vais ! ») : chrono, km, allure actuelle (≈250 derniers m) et moyenne, tracé, « Plus que X km », voix à chaque km, pause, écran gardé allumé (Wake Lock). Arrivée détectée toute seule → photo → victoire → « Retour maison » → résumé.
- **Limite iPhone** : pas de GPS écran éteint pour une page web. La course reprend au retour (sauvegardée dans `questrun.run`).
- La **course est collée à la carte** : km, temps, allure, tracé au dos (fiche). Historique dans le Profil.
- Mode test : bouton « ▶ Simuler » dans l'écran de course (25 m/s, chrono accéléré ≈ 4:40/km).

## Lieux vérifiables + IA sourcée (27/10, demande de Bazil)
- **Seulement des lieux nommés** ; graffitis et installations exclus (souvent effacés). `PARSE_V` force un nouveau tri ; les quêtes à faire sur un lieu retiré sont remplacées.
- L'IA ne doit **jamais inventer** : l'appli envoie au relais les **extraits Wikipédia des articles proches** (geosearch 600 m, 3 max). Consigne : n'utiliser que ces extraits ; sinon raconter le quartier ; sinon répondre AUCUNE → « Pas d'histoire connue ».
- Affichage : « 📚 D'après Wikipédia (titres cliquables), résumé par IA ». Version des consignes : `AI_V` (les anciens textes non sourcés sont ignorés).
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

## Dénivelé (27/10, demande de Bazil : « 7 km jusqu'à Meudon, c'est beaucoup plus dur »)
- Altitudes via **Open-Meteo** (`api.open-meteo.com/v1/elevation`, gratuit, sans clé), gardées sur les lieux (`p.ele`, `S.homeEle`).
- **Quêtes choisies en distance « effort »** : km A/R + **100 m de D+ ≈ 1 km**. D+ estimé d'une quête = |altitude lieu − maison| × 1,2.
- Badge sur chaque quête : 🟢 Plat (< 40 m), 🟠 Vallonné (< 120 m), 🔴 Ça grimpe.
- Écran prêt : D+ / D− réels de l'itinéraire. Pendant : D+ en direct (altitude GPS lissée, seuil 4 m). Fin : D+ recalculé sur la trace (altitudes), affiché dans le résumé, la fiche, les sorties et les stats.
- Trophées ajoutés : ⛰️ Grimpeur (100 m D+ en une sortie), 🏔️ Montagnard (1 000 m D+ au total) → 23 trophées.

## Pièces + changer de mission + chargement (27/10, choix de Bazil)
- **🪙 Pièces** = monnaie à dépenser, à part des ★ (les ★ = expérience/niveau, ne baissent jamais). 30 au départ, +10 par lieu, +30 par semaine complète.
- **« 🔄 Changer de mission »** sur une quête : **gratuit 1 fois par semaine**, puis **10 🪙**. Choix parmi **3 propositions** à la même distance (même rareté en priorité).
- Fin de l'accueil : **chargement « Recherche des trésors dans ton quartier… »** (~7 s, étapes cochées avec les vrais chiffres : lieux trouvés, trésors cachés), puis « TES 3 QUÊTES SONT PRÊTES ! ».
- **Boutique** (toucher 🪙 en haut, ou Profil → Boutique) : packs 100 / 550 / 1 200 🪙 à 0,99 / 4,99 / 9,99 €, **pas de vrai paiement** : « Bientôt disponible » + compteur de tentatives (`S.shopTaps`, visible en mode dév) = test de porte pour l'étape 2-3. Vrai paiement (Stripe / achats Apple) à l'étape 3.
- **+5 🪙 par jour** d'ouverture (`dailyBonus`). Mode dév : bouton +100 🪙.

## Profil / Paramètres / Trophées (27/10, choix de Bazil)
- **Profil** = niveau + titre, Ma semaine, **Mes stats** (lieux, rares, semaines complètes, sorties, km, temps de sport, allure course, vitesse vélo, plus longue sortie), ligne **Trophées** (3 derniers + « Voir tout › », page à part), dernières sorties.
- **Paramètres** : roue ⚙️ en haut à droite du Profil. Mode sombre, sport par défaut, voix, lieux, mode développeur, tout effacer.
- **Accueil** : 1er écran « Tu fais plutôt… » course / vélo / marche-rando (distance proposée 7 / 20 / 5 km).
- Écran de course : gros bouton violet **« 📍 J'y suis »** en bas à droite (« 🏠 Je suis rentré » au retour).

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
