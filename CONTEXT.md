# Contexte de développement

Ce document permet de reprendre rapidement le développement de Vidéor dans une
nouvelle session, sans devoir reconstruire l'historique du projet.

## Situation actuelle

- **Version :** `0.2.1`
- **Statut :** MVP fonctionnel
- **Plateforme ciblée :** Linux desktop uniquement
- **Dépôt :** <https://github.com/nouhailler/videor2>
- **Branche principale :** `main`
- **Format projet :** fichier JSON avec l'extension `.videor`
- **Moteur d'export :** FFmpeg installé sur le système
- **Dernière release :** `0.2.1`, correctif de lecture de l'aperçu vidéo
- **État de `main` :** améliorations non publiées de l'audio, de la validation
  des projets, des paramètres et des confirmations
- **Prochaine priorité :** tests automatisés de l'interface Electron

Vidéor permet de créer un montage simple à partir d'une suite de photos et
d'une piste audio. L'objectif est de couvrir les besoins essentiels sans
reproduire la complexité d'une timeline professionnelle comme celle de
Kdenlive.

## Fonctionnalités implémentées

### Projet

- création d'un nouveau projet ;
- ouverture et import d'un projet `.videor` ;
- validation stricte et normalisation des projets version 1 ;
- sauvegarde manuelle et automatique ;
- export d'une copie du fichier projet ;
- restauration de la dernière sauvegarde automatique au démarrage ;
- confirmation configurable avant le remplacement ou la suppression de médias.

### Photos

- import multiple avec le sélecteur de fichiers ;
- glisser-déposer depuis le bureau ;
- génération d'aperçus JPEG normalisés avec FFmpeg ;
- mise en cache des aperçus selon le chemin, la taille et la date du fichier ;
- chargement sécurisé des médias locaux via le protocole `videor-media://` ;
- signalement des fichiers illisibles sans bloquer le reste de l'import ;
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
- poursuite de l'aperçu après la fin d'une piste audio courte ;
- ajout de silence à l'export pour conserver toute la durée du diaporama ;
- navigation vers un instant précis ;
- aperçu plein écran ;
- représentation visuelle de la forme d'onde.

### Paramètres

- durée par défaut des nouvelles photos ;
- format et résolution d'export par défaut ;
- activation ou désactivation des confirmations d'actions destructrices ;
- persistance locale des préférences.

### Onboarding et aide

- introduction en quatre étapes au premier lancement ;
- visite guidée des projets, de la médiathèque, de l'aperçu, de la timeline,
  de l'inspecteur et de l'export ;
- centre d'aide couvrant Projet, Photos, Vidéo, Audio, Aperçu, Timeline,
  Inspecteur, Export et Paramètres ;
- conseil contextuel accessible depuis chaque zone principale ;
- démonstrations animées sans mutation du projet utilisateur ;
- relance manuelle de l'introduction et de la visite depuis le centre d'aide.

### Découpe vidéo

- import d'une vidéo MP4, MOV, MKV, WebM, AVI ou M4V ;
- lecture de la durée, des dimensions et de la présence d'audio avec FFprobe ;
- définition simple d'un nouveau début ou d'une nouvelle fin ;
- suppression de plusieurs plages internes en marquant leur début et leur fin ;
- aperçu qui saute automatiquement les plages supprimées ;
- export MP4 ou WebM des seules portions conservées ;
- montage non destructif : le fichier source n'est jamais modifié.

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

electron/projectValidation.cjs
  Validation et normalisation du format de projet version 1.

electron/slideshowExport.cjs
  Construction testable des commandes FFmpeg pour les diaporamas.

electron/videoExport.cjs
  Construction testable des commandes FFmpeg pour les vidéos découpées.

electron/mediaProtocol.cjs
  Types MIME et analyse des requêtes HTTP Range.

src/App.tsx
  Modèle du projet, état React, lecture, timeline et interface.

src/GuidanceUI.tsx
  Composants de l'onboarding, de la visite, de l'aide et des démonstrations.

src/guidance.ts
  Contenus structurés, rubriques d'aide et persistance du premier lancement.

src/styles.css
  Mise en page desktop et design system sombre.

src/videoEditing.ts
  Calcul des plages conservées et conversion entre temps source et temps monté.

electron/*.test.ts et src/*.test.ts
  Tests Vitest des projets, protocoles médias, exports et règles de découpe.

build/icon.png
  Icône source 1024 × 1024 utilisée par la fenêtre.

build/icons/
  Déclinaisons PNG Linux de 16 à 1024 pixels installées par le paquet.

build/deb-after-*.sh
  Rafraîchissement des caches d'icônes et de lanceurs Debian.

test/
  Jeu de 30 photos JPEG Nikon 3648 × 2736 utilisé pour les tests d'import.

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
  video: VideoSource | null;
  updatedAt?: string;
};
```

Les fichiers `.videor` référencent les médias par leur chemin absolu. Ils ne
contiennent pas encore les médias eux-mêmes. Un projet peut donc perdre ses
liens si les fichiers sont déplacés.

Le champ interne optionnel `previewPath` est recalculé lors de l'import ou de
l'ouverture d'un projet. Les aperçus sont stockés dans le dossier de données
utilisateur d'Electron et ne remplacent pas les médias d'origine.

Une vidéo est représentée par son chemin source, ses métadonnées, une borne de
début, une borne de fin et une liste de plages internes supprimées. Ces repères
sont enregistrés dans le projet ; le média original reste intact.

La validation impose deux modes exclusifs :

- `photos` peut contenir un diaporama avec une piste `audio` externe ;
- `video` contient une source unique et utilise uniquement son audio intégré.

Un projet mélangeant les deux modes, une version inconnue, un type de média non
pris en charge ou des valeurs hors limites est refusé.

## Données locales

- la sauvegarde automatique est écrite dans
  `app.getPath("userData")/autosave.videor` ;
- les aperçus JPEG sont mis en cache sous
  `app.getPath("userData")/previews/` ;
- les préférences sont stockées dans `localStorage` avec la clé
  `videor-settings` ;
- la fin du premier onboarding est stockée avec la clé
  `videor-onboarding-complete` ;
- les projets utilisateur conservent des chemins absolus vers leurs médias.

Le bouton **Nouveau** remet à zéro le chemin de sauvegarde courant. **Ouvrir**
et **Enregistrer** travaillent ensuite sur ce chemin, tandis que **Importer**
et **Projet** manipulent une copie sans l'adopter comme projet courant.

## Commandes utiles

```bash
npm install
npm run dev
npm run build
npm start
npm test
npm run package:deb
npm run package:linux
```

Prérequis système :

```bash
node --version
npm --version
ffmpeg -version
ffprobe -version
```

L'accélération matérielle est désactivée sous Linux pour éviter les plantages
du processus GPU observés avec certains pilotes VA-API ou environnements
virtuels. Electron utilise donc un rendu logiciel stable.

Le test `electron/slideshowExport.integration.test.ts` lance réellement FFmpeg
et FFprobe dans un dossier temporaire. Un environnement restreint peut
nécessiter l'autorisation de créer ces sous-processus.

Le smoke test de l'aide peut être lancé dans un profil vierge avec :

```bash
VIDEOR_SMOKE_GUIDANCE=1 npm start -- --user-data-dir=/tmp/videor-guidance-smoke
```

Il parcourt l'onboarding, la visite guidée, ouvre le centre d'aide et lance une
démonstration. Le résultat attendu est écrit sous
`VIDEOR_GUIDANCE_SMOKE_RESULT` dans la console Electron.

## Vérifications recommandées

Après une modification :

1. exécuter `npm run build` ;
2. exécuter `npm test` ;
3. lancer `npm run dev` ;
4. importer les 30 photos du dossier `test/` ;
5. vérifier que les 30 cartes, clips et aperçus sont chargés ;
6. tester lecture, déplacement, rotation et recadrage ;
7. tester une piste audio plus courte que le diaporama ;
8. exporter un MP4 court avec audio ;
9. vérifier la durée et les pistes avec `ffprobe` ;
10. charger une vidéo, créer une coupe interne et vérifier son export.

Pour une release Linux :

1. mettre à jour la version dans `package.json` ;
2. mettre à jour `CHANGELOG.md` ;
3. exécuter `npm run package:linux` ;
4. récupérer et tester le `.deb` dans `release/` ;
5. créer le tag Git correspondant ;
6. joindre les artefacts à la release GitHub.

La release `0.2.1` corrige le bouton Play du mode découpe vidéo.
Son artefact principal est `release/Videor-0.2.1-amd64.deb`.

Les changements présents sur `main` après le tag `v0.2.1` sont décrits dans la
section `Non publié` de `CHANGELOG.md`. Ils ne font pas partie de la release
`0.2.1` tant qu'une nouvelle version n'a pas été créée.

Validation de l'artefact publié `0.2.1` :

- les 9 tests Vitest de la release passent ;
- le build TypeScript/Vite passe ;
- le paquet déclare bien la version Debian `0.2.1` ;
- le lanceur desktop et les scripts `postinst`/`postrm` sont valides ;
- les 8 tailles d'icône sont incluses ;
- l'application packagée démarre avec le rendu logiciel Linux ;
- SHA-256 : `e32d1d20a6792aef12f5a9cb2ccad034e5a6844674722d05f1608a1aed86dd30`.

## Limites connues

- les médias ne sont pas intégrés au fichier projet ;
- la forme d'onde affichée est décorative, pas calculée depuis le signal audio ;
- aucune transition n'est encore appliquée entre les photos ;
- aucun effet Ken Burns n'est disponible ;
- l'enregistrement de narration n'est pas implémenté ;
- 20 tests couvrent désormais les calculs de découpe, le protocole média, la
  validation des projets et la génération/export FFmpeg ; l'interface Electron
  ne dispose pas encore de tests automatisés complets. Les contenus et la
  persistance de l'aide sont couverts par `src/guidance.test.ts` ;
- FFmpeg doit être installé séparément sur la machine.

## Prochaines priorités

1. automatiser un test d'import avec les photos du dossier `test/` ;
2. tester l'interface de création, ouverture et restauration des projets ;
3. automatiser un export vidéo avec plusieurs plages supprimées ;
4. calculer une vraie forme d'onde audio ;
5. ajouter des transitions simples et un effet Ken Burns configurable ;
6. rendre les projets portables avec copie des médias.

## Chantier publié : chargement des médias

Le correctif postérieur à `0.1.0` répond aux échecs d'affichage rencontrés avec
des photos locales volumineuses :

- Electron expose désormais les médias autorisés via `videor-media://` plutôt
  que par des URL `file://` directes ;
- FFmpeg génère un aperçu JPEG limité à 1920 × 1080 pour chaque photo ;
- les aperçus sont réutilisés tant que le fichier source ne change pas ;
- les projets existants sont réhydratés avec leurs aperçus à l'ouverture ;
- une photo illisible est ignorée avec un message utilisateur ;
- un écran de récupération s'affiche en cas d'erreur React fatale ;
- des diagnostics du processus d'affichage facilitent les prochains tests.

Le build TypeScript/Vite passe. Un smoke test Electron dans un profil vierge a
chargé les 30 photos du dossier `test/`, créé 30 cartes et 30 clips, sans aucun
aperçu en échec. Les fonctions de validation et de construction des commandes
FFmpeg ont depuis été extraites et couvertes par Vitest. L'import complet des
30 photos reste à automatiser.

## Intégration desktop Linux

Le paquet Debian installe un lanceur dans
`/usr/share/applications/videor.desktop`. Celui-ci référence l'icône par son
nom de thème, `videor`, et non par un chemin propre à une machine.

Le premier paquet `0.1.0` ne fournissait que la taille 1024 × 1024. Certains
environnements de bureau ne l'affichaient donc pas. Le packaging utilise
désormais les tailles 16, 32, 48, 64, 128, 256, 512 et 1024 pixels sous
`/usr/share/icons/hicolor/<taille>/apps/videor.png`. Les scripts Debian
rafraîchissent également `hicolor` et la base des fichiers desktop après une
installation, une mise à jour ou une suppression.

## Chantier publié : découpe vidéo

Le projet peut maintenant fonctionner dans deux modes exclusifs :

- un diaporama composé de photos et d'une piste audio externe ;
- une vidéo source unique avec sa piste audio intégrée.

Dans le mode vidéo, l'utilisateur place la tête de lecture puis choisit
`Commencer ici`, `Terminer ici` ou marque les deux extrémités d'une plage à
supprimer. `src/videoEditing.ts` normalise et fusionne les coupes, calcule les
segments conservés et convertit les positions entre la source et le montage.

L'export FFmpeg applique `trim` et `atrim` à chaque segment conservé, remet les
horodatages à zéro, concatène les segments puis encode le résultat dans le
format demandé. Les projets existants sans champ `video` restent compatibles.

Validation réalisée avec une source synthétique de 12 secondes contenant de
l'audio : conservation des plages 1–5 s et 8–11 s, export final mesuré à
7 secondes en 1280 × 720 avec les pistes vidéo et audio présentes. Le smoke
test Electron confirme également la création de la carte média, du lecteur et
de la timeline vidéo après import.

## Correctif publié : lecture de l'aperçu vidéo

Le premier paquet `0.2.0` pouvait analyser une vidéo et générer sa vignette,
mais le bouton Play ne lançait pas la lecture. Le protocole
`videor-media://` renvoyait les fichiers sans type MIME explicite et sans gérer
les requêtes partielles d'octets utilisées par Chromium.

Le protocole fournit maintenant `Content-Type`, `Content-Length`,
`Accept-Ranges` et `Content-Range`, avec une réponse `206` pour les plages
demandées. Un smoke test Electron charge une vidéo MP4, clique sur Play et
confirme que le temps de lecture avance, avec `readyState=4` et sans erreur
média.

## Conventions

- interface et documentation utilisateur en français ;
- code et identifiants techniques en anglais ;
- changements limités au besoin traité ;
- mise à jour de `CHANGELOG.md` pour chaque évolution visible ;
- aucune dépendance système implicite en dehors de FFmpeg/FFprobe.

## Diagnostic rapide

### Le renderer ne démarre pas

1. exécuter `npm run build` pour détecter une erreur TypeScript ;
2. vérifier la console Electron et les messages `render-process-gone` ;
3. distinguer les avertissements `libva` non bloquants des erreurs Chromium ;
4. tester avec un dossier de données utilisateur vierge si la sauvegarde
   automatique semble corrompue.

### Un média ne se charge pas

1. vérifier que le chemin enregistré existe encore ;
2. vérifier son extension dans `electron/mediaProtocol.cjs` et dans le handler
   de sélection correspondant ;
3. lancer FFmpeg ou FFprobe directement sur le fichier ;
4. supprimer uniquement le cache d'aperçu concerné si la source a changé de
   manière inhabituelle.

### Un export échoue

1. récupérer les dernières lignes de `stderr` FFmpeg ;
2. vérifier la présence de `libx264`, `libvpx-vp9`, `aac` et `libopus` ;
3. inspecter les arguments produits par `slideshowExport.cjs` ou
   `videoExport.cjs` ;
4. ajouter un test de construction des arguments puis, si nécessaire, un test
   d'intégration avec une source synthétique.
