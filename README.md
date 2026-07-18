# Fuel · tracker nutrition (recomposition)

Outil perso de recomposition corporelle. Tu entres tes pas et si tu as fait muscu, il calcule ce que tu dois manger, le résumé macros et nutriments, le déficit du jour, et garde un historique + des statistiques.

Deux pages : `index.html` (la journée) et `stats.html` (statistiques et données de base). Fichier partagé `data.js` (modèle + synchro).

## Le modèle

Glucides (g) = **base (215) + 7,5 / 1000 pas + 38 si muscu**
Dépense (maintenance) = **2200 + 40 / 1000 pas + 200 si muscu**
Déficit = dépense − apport (recomposition = déficit léger, ~5 à 7%).

Protéines (~170 g) et lipides (~60 g) quasi fixes. Le tampon glucides monte via les flocons (0 à 50 g jusqu'à 10k pas) puis la pomme de terre. Calé sur les valeurs exactes du programme (maintenance 2200/2600/2800, cibles 2100/2400/2550).

## Fonctions

- Slider pas 0 à 40 000, sélecteur muscu/repos, tout se recalcule en direct.
- Résumé macros + détail nutriments (oméga-3, fibres, créatine, protéines/kg).
- Déficit affiché en direct, régime recomposition assumé.
- Enregistrement de n'importe quelle date (aujourd'hui, la veille, etc.).
- Réglages perso éditables (poids, base glucides).
- Note du jour sauvegardée.
- Page stats : déficit moyen, cumulé, gras estimé perdu, pas moyen, suivi menu, graphiques apport vs dépense, plus toutes les données de base du programme.

## Mise en ligne (GitHub Pages)

Depuis le dossier :

```bash
git add .
git commit -m "Fuel tracker : journée + stats + synchro"
git push
```

Puis Settings → Pages → Source: main / root. Site sur `https://TON_USER.github.io/NOM_REPO/`.

## Synchro entre appareils (PC et téléphone)

Par défaut l'historique est stocké dans le navigateur (local). Pour le retrouver identique sur tous tes appareils, active la synchro GitHub. L'app lit et écrit un fichier `data/history.json` dans le repo.

Étapes (une seule fois) :

1. Crée un token : github.com/settings/tokens → **Fine-grained tokens** → Generate new token.
2. Repository access : **Only select repositories** → ton repo `fuel-`.
3. Permissions → Repository permissions → **Contents : Read and write**.
4. Génère, copie le token (`github_pat_...`).
5. Dans l'app, onglet Journée → Réglages perso → Synchro GitHub : remplis utilisateur, repo (`fuel-`), branche (`main`), colle le token → **Activer et synchroniser**.

Le token reste uniquement dans le navigateur de l'appareil, **jamais dans le repo**. Refais l'étape 5 sur chaque appareil (avec le même token ou un token par appareil). Si ton repo est public, `data/history.json` sera visible publiquement (ce ne sont que des chiffres de nutrition) ; passe le repo en privé si tu préfères.

## Ajuster le modèle

Tout est en haut de `data.js` (objet `M` et fonction `compute`). Change une valeur, recommit, repush.
