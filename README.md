# Fortnite Challenge Hub

Application de gestion de defis Fortnite pour streameurs Twitch.
Dashboard en temps reel, overlay OBS, bot Twitch, channel points.

---

## Fonctionnalites

- **Dashboard streamer** : creer, editer, activer, completer des defis
- **Overlay OBS** : affichage en temps reel du defi en cours + timer
- **Bot Twitch** : commandes `!defi`, `!score`, `!skip` dans le chat
- **Channel Points** : les viewers declenchent un defi aleatoire
- **Vote chat** : `!vote <numero>` pour voter pour le prochain defi
- **Roue aleatoire** : tirer un defi au hasard depuis le dashboard
- **Historique** : consulter les sessions passees et les scores

---

## Prerequis

Tu as besoin de ces outils installes sur ton ordinateur :

### 1. Node.js (version 20 ou plus)
- Telecharge depuis : https://nodejs.org/
- Choisis "LTS" (la version recommandee)
- Installe normalement (clique Suivant partout)
- Pour verifier : ouvre un terminal et tape `node --version`

### 2. pnpm (gestionnaire de paquets)
- Dans ton terminal, tape : `npm install -g pnpm`
- Pour verifier : `pnpm --version`

> **C'est quoi un terminal ?**
> Sur Windows : clique droit sur le bureau > "Ouvrir dans le terminal"
> Sur Mac : cherche "Terminal" dans Spotlight (Cmd+Espace)

---

## Installation

### Etape 1 : Telecharger le projet

Si tu as Git installe :
```bash
git clone <url-du-repo> fortnite-challenge-hub
cd fortnite-challenge-hub
```

Sinon, telecharge le ZIP depuis GitHub, decompresse-le, et ouvre le dossier dans un terminal.

### Etape 2 : Installer les dependances

Dans le terminal, depuis le dossier du projet :
```bash
pnpm install
```

Attends que tout soit telecharge (ca peut prendre 1-2 minutes).

### Etape 3 : Configurer l'application

1. Dans le dossier du projet, trouve le fichier `.env.example`
2. Copie-le et renomme la copie `.env` (sans le .example)
3. Ouvre `.env` avec un editeur de texte (Notepad, VSCode, etc.)
4. Remplis les valeurs (voir la section "Configuration Twitch" ci-dessous)

> Le fichier `.env` contient tes infos privees (cles Twitch).
> Ne le partage jamais et ne le mets pas sur GitHub.

### Etape 4 : Lancer l'application

```bash
pnpm dev
```

Trois fenetres de terminal vont demarrer. L'application est prete quand tu vois :
```
Server running on http://localhost:3001
```

Ouvre ton navigateur et va sur **http://localhost:5173** pour le dashboard.

---

## Configuration Twitch (optionnel mais recommande)

Sans Twitch, l'app fonctionne quand meme en mode standalone.
Avec Twitch, tu as le bot et les channel points.

### 1. Creer une application Twitch

1. Va sur https://dev.twitch.tv/console (connecte-toi avec ton compte Twitch)
2. Clique sur **"Register Your Application"**
3. Remplis :
   - **Name** : `Fortnite Challenge Hub`
   - **OAuth Redirect URLs** : `http://localhost:3001/auth/callback`
   - **Category** : `Chat Bot`
4. Clique **Create**
5. Clique sur **Manage** a cote de ton application

### 2. Copier les cles

1. Copie le **Client ID** et colle-le dans `.env` apres `TWITCH_CLIENT_ID=`
2. Clique sur **New Secret**, copie le secret, colle-le apres `TWITCH_CLIENT_SECRET=`
3. Mets ton nom de chaine apres `TWITCH_CHANNEL=` (en minuscules)

### 3. Autoriser l'application

Lance l'application (`pnpm dev`), puis dans ton navigateur va sur :
```
http://localhost:3001/auth/twitch
```

Ca va t'ouvrir une page Twitch pour autoriser l'app. Accepte, et tu seras redirige.
Les tokens sont sauvegardes automatiquement, tu n'as pas a refaire ca a chaque fois.

---

## Integration OBS

L'overlay est une page web que tu ajoutes comme source dans OBS.

### Ajouter l'overlay dans OBS

1. Dans OBS, dans ta scene, clique sur **+** sous "Sources"
2. Choisis **"Navigateur"** (ou "Browser Source")
3. Remplis :
   - **URL** (si Railway) : `https://ton-app.up.railway.app/overlay`
   - **URL** (si local) : `http://localhost:5174`
   - **Largeur** : `400`
   - **Hauteur** : `200`
4. Clique OK

L'overlay s'affiche automatiquement quand un defi est actif.
Il disparait quand aucun defi n'est en cours.

### Options de l'overlay (parametres URL)

Tu peux personnaliser l'overlay avec des parametres dans l'URL :

| Parametre | Valeurs | Defaut | Description |
|-----------|---------|--------|-------------|
| `position` | `top-left`, `top-right`, `bottom-left`, `bottom-right` | `top-right` | Position a l'ecran |
| `theme` | `dark`, `light` | `dark` | Theme de couleurs |
| `scale` | `0.5` a `2` | `1` | Taille de l'overlay |

Exemples (Railway) :
- `https://ton-app.up.railway.app/overlay?position=bottom-right&theme=dark`
- `https://ton-app.up.railway.app/overlay?position=top-left&scale=1.5`

Exemples (local) :
- `http://localhost:5174?position=bottom-right&theme=dark`

---

## Commandes Twitch (dans le chat)

| Commande | Qui peut l'utiliser | Description |
|----------|---------------------|-------------|
| `!defi` | Tout le monde | Affiche le defi en cours |
| `!score` | Tout le monde | Affiche le score de la session |
| `!prochains` | Tout le monde | Affiche les 3 prochains defis |
| `!vote <numero>` | Tout le monde | Voter pour un defi dans la liste |
| `!skip` | Streamer seulement | Passer le defi en cours |
| `!ok` | Streamer seulement | Valider le defi en cours comme complete |
| `!fail` | Streamer seulement | Marquer le defi comme echoue |

> Les commandes du streamer ne fonctionnent que si le message vient de
> ton propre compte Twitch (celui renseigne dans TWITCH_CHANNEL).

---

## Personnaliser les defis

### Depuis le dashboard
Va dans l'onglet **"Defis"** et utilise le formulaire pour :
- Ajouter un defi avec titre, description, points, timer et difficulte
- Modifier un defi existant en cliquant sur l'icone crayon
- Supprimer un defi en cliquant sur la corbeille
- Reordonner les defis par glisser-deposer

### Importer/Exporter
Tu peux exporter tous tes defis en JSON et les reimporter sur une autre machine.
Boutons disponibles en haut de la page "Defis".

### Categories disponibles
- **Elimination** : tuer des ennemis
- **Placement** : se classer haut dans la partie
- **Loadout** : contraintes d'equipement
- **Chaos** : defis fous et challenge du public
- **Custom** : tout le reste

---

## Deployer sur Railway (recommande — sans rien installer)

Railway est une plateforme cloud gratuite. L'app tourne 24h/24 sur leurs serveurs,
tu n'as pas besoin de laisser ton PC allume.

### Etape 1 : Creer un compte Railway

Va sur https://railway.app et cree un compte gratuit (tu peux te connecter avec GitHub).

### Etape 2 : Creer ton application Twitch avec la bonne URL

> **Important** : avant de deployer, tu dois connaitre l'URL finale de ton app.
> Railway genere une URL du style `https://ton-app.up.railway.app`.
> Tu peux la personnaliser dans Railway (Settings > Domains) avant de la mettre dans Twitch.

1. Va sur https://dev.twitch.tv/console
2. Clique sur **"Register Your Application"**
3. Remplis :
   - **Name** : `Fortnite Challenge Hub`
   - **OAuth Redirect URLs** : `https://ton-app.up.railway.app/auth/callback`
     (remplace `ton-app.up.railway.app` par ton URL Railway)
   - **Category** : `Chat Bot`
4. Clique **Create**, puis **Manage**
5. Note le **Client ID** et genere un **New Secret**

### Etape 3 : Deployer

1. Dans Railway, clique **"New Project"** > **"Deploy from GitHub repo"**
2. Connecte ton compte GitHub et selectionne ce depot
3. Railway detecte automatiquement le projet et lance le build

### Etape 4 : Configurer les variables d'environnement

Dans Railway, va dans ton service > onglet **Variables** et ajoute :

| Variable | Valeur | Obligatoire |
|----------|--------|-------------|
| `TWITCH_CLIENT_ID` | Ton Client ID Twitch | Oui |
| `TWITCH_CLIENT_SECRET` | Ton Secret Twitch | Oui |
| `TWITCH_CHANNEL` | Ton pseudo Twitch (minuscules) | Oui |
| `BOT_ENABLED` | `true` | Recommande |
| `CHANNEL_POINTS_ENABLED` | `true` ou `false` | Optionnel |
| `BOT_PREFIX` | `!` | Optionnel |

> `PORT` et `RAILWAY_PUBLIC_DOMAIN` sont injectes automatiquement par Railway.
> Tu n'as pas a les renseigner.

### Etape 5 : Autoriser Twitch

Une fois deploye, ouvre dans ton navigateur :
```
https://ton-app.up.railway.app/auth/twitch
```

Autorise l'application, et le bot se connecte automatiquement.

### Utiliser depuis Railway

| Quoi | URL |
|------|-----|
| Dashboard streamer | `https://ton-app.up.railway.app` |
| Overlay OBS | `https://ton-app.up.railway.app/overlay` |
| Autoriser Twitch | `https://ton-app.up.railway.app/auth/twitch` |

> **Note** : sur Railway free tier, les donnees (defis, historique) sont conservees
> tant que le service n'est pas redeploye depuis zero. Pour persister les donnees
> entre redeploiements, passe sur un plan payant et configure un volume sur `/app/data`.

---

## FAQ

**Q : L'overlay ne s'affiche pas dans OBS**
R : Verifie que l'application est bien lancee (`pnpm dev`) et que l'URL est `http://localhost:5174`.

**Q : Le bot ne repond pas dans le chat**
R : Verifie que `TWITCH_CHANNEL` est en minuscules et que tu as fait l'autorisation Twitch (`/auth/twitch`).

**Q : La base de donnees est corrompue**
R : Supprime le fichier `server/data/challenge-hub.db` et relance. Attention, tu perds l'historique.

**Q : Je veux remettre les defis par defaut**
R : Dans l'onglet "Defis" du dashboard, utilise le bouton "Reinitialiser les defis".

**Q : Le port 3001 ou 5173 est deja utilise**
R : Change `PORT=3001` dans `.env` et mets a jour l'URL OBS en consequence.

---

## Structure du projet (pour les developpeurs)

```
fortnite-challenge-hub/
├── apps/
│   ├── web/          # Dashboard React (port 5173)
│   └── overlay/      # Overlay OBS React (port 5174)
├── server/           # API Fastify + WebSocket + Bot Twitch (port 3001)
├── packages/
│   └── shared/       # Types TypeScript partages
├── .env              # Ta configuration (a creer depuis .env.example)
└── README.md         # Ce fichier
```

Les types WebSocket et les interfaces partagees entre le serveur et les apps
se trouvent dans `packages/shared/src/index.ts`.
