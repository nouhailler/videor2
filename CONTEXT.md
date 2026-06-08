# Contexte de développement

Ce document permet de reprendre rapidement le développement de Vidéor dans une
nouvelle session, sans devoir reconstruire l'historique du projet.

## Situation actuelle

- **Version :** `0.1.0`
- **Statut :** MVP fonctionnel
- **Plateforme ciblée :** Linux desktop uniquement
- **Dépôt :** <https://github.com/nouhailler/videor2>
- **Branche principale :** `main`
- **Format projet :** fichier JSON avec l'extension `.videor`
- **Moteur d'export :** FFmpeg installé sur le système

Vidéor permet de créer un montage simple à partir d'une suite de photos et
d'une piste audio. L'objectif est de couvrir les besoins essentiels sans
reproduire la complexité d'une timeline professionnelle comme celle de
Kdenlive.

## Fonctionnalités implémentées

### Projet

- création d'un nouveau projet ;
- ouverture et import d'un projet `.videor` ;
- sauvegarde manuelle et automatique ;
- export d'une copie du fichier projet ;
- restauration de la dernière sauvegarde automatique au démarrage.

### Photos

- import multiple avec le sélecteur de fichiers ;
- glisser-déposer depuis le bureau ;
- réorganisation dans la timeline ;
- réglage individuel de la durée ;
- rotation à gauche ou à droite ;
- recadrage simple avec modes `Remplir` et `Ajuster` ;
- positionnement horizontal et vertical ;
- suppression.

### Audio et lecture

- import ou remplacement d'une piste audio ;
- réglage du volume ;
- lecture et pause synchronisées avec les photos ;
- navigation vers un instant précis ;
- aperçu plein écran ;
- représentation visuelle de la forme d'onde.

### Export

- MP4 avec H.264 et AAC ;
- WebM avec VP9 et Opus ;
- résolutions 720p, 1080p et 4K ;
- progression et annulation de l'encodage ;
- prise en compte de la rotation et du recadrage des photos.

## Architecture

```text
electron/main.cjs
  Processus principal Electron.
  Gère les fenêtres, boîtes de dialogue, projets et processus FFmpeg.

electron/preload.cjs
  Pont IPC minimal exposé dans window.videor.

src/App.tsx
  Modèle du projet, état React, lecture, timeline et interface.

src/styles.css
  Mise en page desktop et design system sombre.

build/icon.png
  Icône Linux utilisée par la fenêtre et les paquets.

stitch/
  Prototype initial, captures et DESIGN.md de référence.
```

Le renderer n'a pas accès directement à Node.js :

- `contextIsolation` est activé ;
- `nodeIntegration` est désactivé ;
- les opérations système passent par les handlers IPC du processus principal.

## Modèle de données

Le type principal est défini dans `src/App.tsx`.

```ts
type Project = {
  format: "videor-project";
  version: 1;
  name: string;
  photos: Photo[];
  audio: AudioTrack | null;
  updatedAt?: string;
};
```

Les fichiers `.videor` référencent les médias par leur chemin absolu. Ils ne
contiennent pas encore les médias eux-mêmes. Un projet peut donc perdre ses
liens si les fichiers sont déplacés.

## Commandes utiles

```bash
npm install
npm run dev
npm run build
npm start
npm run package:linux
```

Prérequis système :

```bash
node --version
npm --version
ffmpeg -version
ffprobe -version
```

Les messages VA-API tels que `libva error` sont généralement liés à
l'accélération matérielle du GPU et ne bloquent pas Electron.

## Vérifications recommandées

Après une modification :

1. exécuter `npm run build` ;
2. lancer `npm run dev` ;
3. importer plusieurs photos de formats et orientations différents ;
4. tester lecture, déplacement, rotation et recadrage ;
5. exporter un MP4 court avec audio ;
6. vérifier le résultat avec `ffprobe`.

Pour une release Linux :

1. mettre à jour la version dans `package.json` ;
2. mettre à jour `CHANGELOG.md` ;
3. exécuter `npm run package:linux` ;
4. récupérer et tester le `.deb` dans `release/` ;
5. créer le tag Git correspondant ;
6. joindre les artefacts à la release GitHub.

## Limites connues

- les médias ne sont pas intégrés au fichier projet ;
- la forme d'onde affichée est décorative, pas calculée depuis le signal audio ;
- aucune transition n'est encore appliquée entre les photos ;
- aucun effet Ken Burns n'est disponible ;
- l'enregistrement de narration n'est pas implémenté ;
- les tests automatisés restent à écrire ;
- FFmpeg doit être installé séparément sur la machine.

## Prochaines priorités

1. calculer une vraie forme d'onde audio ;
2. ajouter des transitions simples ;
3. gérer un effet Ken Burns configurable ;
4. rendre les projets portables avec copie des médias ;
5. ajouter des tests du modèle projet et de la commande FFmpeg ;
6. améliorer les messages d'erreur lorsque des médias sont introuvables.

## Conventions

- interface et documentation utilisateur en français ;
- code et identifiants techniques en anglais ;
- changements limités au besoin traité ;
- mise à jour de `CHANGELOG.md` pour chaque évolution visible ;
- aucune dépendance système implicite en dehors de FFmpeg/FFprobe.
