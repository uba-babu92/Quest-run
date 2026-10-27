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
- Niveaux : 1 000 pts par niveau.
- **Pas dans la V1** : boss, mythologie, boutique, boosters, légendaires, comptes.

## Design (validé le 26/10)
- **Recette Duolingo** : écrans du quotidien propres et sportifs, moments de victoire **arcade** à fond.
- **Violet électrique** `#7B2FF7` (marque, boutons, quêtes) + **or** `#FFB800` (points, victoires).
- Fond **clair** par défaut. Réglage **Clair / Sombre (noir) / Auto** dans le Profil.
- Écrans de victoire toujours **noirs**, police pixel « Press Start 2P », confettis, carte qui se retourne.
- Cartes : **argent** = commune, **violet** = rare, **or** = légendaire (plus tard).

## Fichiers
- `index.html` : toute l'appli (HTML + CSS + JS, aucune compilation).
- `manifest.webmanifest`, `icon*.png`, `icon.svg` : installation sur l'écran d'accueil.
- `sw.js` : fonctionne sans réseau une fois ouverte.
- Données : `localStorage` (clé `questrun.v1`), photos dans IndexedDB. Tout reste sur le téléphone.

## Mise en ligne
GitHub Pages, branche `main`, dossier racine → https://uba-babu92.github.io/Quest-run/ (dépôt public depuis le 27/10)
Le HTTPS est obligatoire pour le GPS et l'appareil photo.

## Idées en attente
- **Motivation façon Duolingo** (Bazil, 27/10) : à préciser avec lui (série, rappels, messages…).
