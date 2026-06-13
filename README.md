<div align="center">

# Vidéor

### Créer un diaporama photo ou découper une vidéo, simplement.

Application de bureau Linux pour assembler des photos avec une piste audio,
prévisualiser le résultat et l'exporter en MP4 ou WebM.

[![Linux](https://img.shields.io/badge/Linux-Desktop-FCC624?logo=linux&logoColor=black)](#prérequis)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-7-007808?logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)

</div>

<p align="center">
  <img src="build/icon.png" alt="Icône Vidéor" width="150">
</p>

![Aperçu de l'interface Vidéor](stitch/espace_de_travail_coh_rent/screen.png)

> [!NOTE]
> Vidéor est un MVP destiné aux ordinateurs Linux. FFmpeg et FFprobe doivent
> être installés sur la machine, y compris avec le paquet Debian ou l'AppImage.

> [!IMPORTANT]
> Cette documentation décrit l'état actuel de la branche `main`. La dernière
> release publiée est `0.2.1` ; les paramètres, les confirmations, la validation
> renforcée des projets et le correctif des pistes audio courtes sont encore
> classés dans les changements non publiés.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Prérequis](#prérequis)
- [Premiers pas](#premiers-pas)
- [Développement](#développement)
- [Architecture](#architecture)
- [Format des projets](#format-des-projets)
- [Dépannage](#dépannage)
- [Limites et feuille de route](#limites-actuelles)

## Fonctionnalités

Vidéor propose deux modes de montage exclusifs :

- **Diaporama** : photos ordonnées, durée individuelle, rotation, recadrage,
  positionnement et piste audio externe ;
- **Découpe vidéo** : une vidéo source, raccourcissement du début ou de la fin,
  et suppression de plusieurs plages internes.

| Domaine | Fonctionnalités |
| --- | --- |
| Projet | Nouveau projet, ouverture, import, copie, validation et sauvegarde automatique |
| Photos | Import multiple, glisser-déposer, réorganisation, durée, rotation et recadrage |
| Audio | Import, remplacement, volume, lecture synchronisée et silence automatique en fin de piste |
| Vidéo | Import MP4, MOV, MKV, WebM, AVI ou M4V et découpe non destructive |
| Aperçu | Lecture, pause, navigation temporelle et plein écran |
| Export | MP4/H.264/AAC ou WebM/VP9/Opus en 720p, 1080p ou 4K |
| Paramètres | Durée des photos, valeurs d'export par défaut et confirmations configurables |
| Aide | Onboarding au premier lancement, visite guidée, conseils et démos contextuelles |

Les formats source pris en charge sont :

- images : JPEG, PNG, WebP et BMP ;
- audio : MP3, WAV, OGG, M4A, AAC et FLAC ;
- vidéo : MP4, MOV, MKV, WebM, AVI et M4V.

## Installation

### Paquet Debian

Téléchargez le fichier `.deb` depuis les
[releases GitHub](https://github.com/nouhailler/videor2/releases), puis :

```bash
sudo apt install ./Videor-0.2.1-amd64.deb
sudo apt install ffmpeg
```

L'application est ensuite disponible dans le menu du bureau ou avec :

```bash
videor
```

### AppImage

Si une AppImage est fournie avec la release, après téléchargement :

```bash
chmod +x Videor-0.2.1-x64.AppImage
./Videor-0.2.1-x64.AppImage
```

FFmpeg reste nécessaire :

```bash
sudo apt install ffmpeg
```

### Depuis les sources

```bash
git clone https://github.com/nouhailler/videor2.git
cd videor2
npm install
npm run dev
```

## Prérequis

| Outil | Version recommandée | Vérification |
| --- | --- | --- |
| Linux | Distribution récente 64 bits | `uname -a` |
| Node.js | 20 ou plus récent, pour le développement | `node --version` |
| npm | Fourni avec Node.js | `npm --version` |
| FFmpeg | Avec H.264, AAC, VP9 et Opus | `ffmpeg -version` |
| FFprobe | Fourni avec FFmpeg | `ffprobe -version` |

Sur Debian ou Ubuntu :

```bash
sudo apt update
sudo apt install ffmpeg
```

## Premiers pas

### Créer un diaporama

1. Cliquez sur **Ajouter des photos** ou déposez les images dans la fenêtre.
2. Réorganisez les clips dans la timeline par glisser-déposer.
3. Sélectionnez une photo pour régler sa durée, sa rotation et son cadrage.
4. Ouvrez l'onglet **Audio** pour ajouter une piste et régler son volume.
5. Utilisez les commandes sous l'aperçu pour vérifier le montage.
6. Cliquez sur **Exporter la vidéo**, choisissez le format et la résolution.

Si la piste audio est plus courte que le diaporama, l'aperçu continue et
l'export ajoute du silence jusqu'à la dernière photo. Si elle est plus longue,
la sortie s'arrête à la fin du diaporama.

### Découper une vidéo

1. Ouvrez l'onglet **Vidéo**, puis cliquez sur **Charger une vidéo**.
2. Déplacez la tête de lecture à l'endroit souhaité.
3. Utilisez **Commencer ici** ou **Terminer ici** pour raccourcir la vidéo.
4. Pour retirer une plage interne, marquez son début puis sa fin.
5. Vérifiez les coupes dans la timeline et exportez le résultat.

La découpe est non destructive : le fichier source n'est jamais modifié.
Charger une vidéo remplace le diaporama courant après confirmation.

### Enregistrer et restaurer un projet

- **Enregistrer** écrit le projet dans un fichier `.videor`.
- **Projet** exporte une copie du fichier projet sans changer son emplacement.
- Les modifications sont sauvegardées automatiquement après un court délai.
- Au prochain démarrage, la dernière sauvegarde automatique est restaurée.

Un fichier `.videor` contient les réglages et les chemins absolus des médias,
mais pas les médias eux-mêmes. Conservez donc les photos, l'audio et la vidéo à
leur emplacement d'origine.

### Paramètres

Le bouton en forme d'engrenage permet de définir :

- la durée appliquée aux nouvelles photos ;
- le format d'export par défaut ;
- la résolution d'export par défaut ;
- l'affichage des confirmations avant une suppression ou un remplacement.

Ces préférences sont conservées localement sur la machine.

### Aide intégrée

Au premier démarrage, Vidéor affiche une introduction en quatre étapes, suivie
d'une visite guidée des principales zones de l'interface.

L'aide reste ensuite accessible avec le bouton `?` de la barre supérieure :

- le centre d'aide explique chaque écran et chaque mode ;
- les boutons **Conseil** ouvrent directement la rubrique correspondant à la
  zone affichée ;
- chaque rubrique propose une démonstration animée qui ne modifie pas le projet ;
- l'introduction et la visite guidée peuvent être relancées à tout moment ;
- la touche `Échap` ferme la visite, le centre d'aide ou une démonstration.

## Développement

### Commandes

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance Vite et Electron avec rechargement à chaud |
| `npm run build` | Vérifie TypeScript et génère `dist/` |
| `npm start` | Lance Electron avec le build présent dans `dist/` |
| `npm test` | Exécute les tests Vitest, dont l'intégration FFmpeg |
| `npm run package:deb` | Produit uniquement le paquet Debian |
| `npm run package:linux` | Produit l'AppImage et le paquet Debian |

Validation recommandée avant un commit :

```bash
npm test
npm run build
```

Le test d'intégration lance réellement FFmpeg et FFprobe. Ces deux commandes
doivent donc être accessibles dans `PATH`.

### Créer les paquets Linux

```bash
npm run package:linux
```

Les artefacts sont générés dans `release/` :

```text
release/
├── Videor-0.2.1-x64.AppImage
└── Videor-0.2.1-amd64.deb
```

## Architecture

```text
videor/
├── electron/
│   ├── main.cjs                    # Fenêtre, IPC, fichiers et processus FFmpeg
│   ├── preload.cjs                 # API limitée exposée au renderer
│   ├── mediaProtocol.cjs           # Lecture locale et requêtes HTTP Range
│   ├── projectValidation.cjs       # Validation des projets .videor
│   ├── slideshowExport.cjs         # Export FFmpeg des diaporamas
│   └── videoExport.cjs             # Export FFmpeg des vidéos découpées
├── src/
│   ├── App.tsx                     # Interface et état de l'éditeur
│   ├── GuidanceUI.tsx              # Onboarding, visite, aide et démonstrations
│   ├── guidance.ts                 # Contenus et persistance de l'aide
│   ├── videoEditing.ts             # Calculs de découpe et conversion du temps
│   ├── main.tsx                    # Point d'entrée React
│   ├── styles.css                  # Mise en page et composants visuels
│   └── videor.d.ts                 # Types de l'API Electron
├── build/                          # Icônes et scripts Debian
├── test/                           # Photos utilisées pour les tests manuels
├── stitch/                         # Prototype et références graphiques
├── CHANGELOG.md
├── CONTEXT.md
└── package.json
```

Le renderer Electron utilise `contextIsolation`, sans accès direct à Node.js.
Les opérations système passent par l'API limitée de `preload.cjs`.

## Format des projets

Les projets sont des documents JSON portant l'extension `.videor` :

```json
{
  "format": "videor-project",
  "version": 1,
  "name": "Mon projet",
  "photos": [],
  "audio": null,
  "video": null
}
```

À l'ouverture et à l'enregistrement, Vidéor contrôle notamment :

- la version et la structure du document ;
- les extensions des médias ;
- les durées, volumes, rotations et positions ;
- la cohérence entre le mode diaporama et le mode vidéo ;
- les bornes et la durée minimale des coupes.

Un fichier corrompu, incompatible ou mélangeant les deux modes est refusé avec
un message explicite.

## Dépannage

### `ffmpeg` ou `ffprobe` introuvable

```bash
sudo apt install ffmpeg
ffmpeg -version
ffprobe -version
```

### Une photo, une piste audio ou une vidéo ne se charge plus

Le projet référence le chemin d'origine. Replacez le média à cet emplacement ou
réimportez-le dans le projet.

### Message `libva error`

Cette erreur apparaît avec certains pilotes ou environnements virtualisés.
Vidéor désactive l'accélération matérielle sous Linux et utilise le rendu
logiciel ; le message n'est généralement pas bloquant.

### L'export échoue

Vérifiez que FFmpeg fournit les encodeurs nécessaires :

```bash
ffmpeg -encoders | grep -E 'libx264|libvpx-vp9|aac|libopus'
```

Vérifiez également que les médias du projet existent encore et sont lisibles.

## Limites actuelles

- les médias ne sont pas intégrés aux fichiers projet ;
- la forme d'onde audio est décorative ;
- aucune transition ou animation Ken Burns n'est disponible ;
- l'enregistrement de narration n'est pas implémenté ;
- FFmpeg doit être installé séparément ;
- l'interface Electron ne dispose pas encore d'une couverture automatisée
  complète.

## Feuille de route

- [x] Diaporama photo avec piste audio
- [x] Découpe non destructive d'une vidéo
- [x] Export MP4 et WebM
- [x] Validation des projets et test d'intégration FFmpeg
- [ ] Tests automatisés complets de l'interface Electron
- [ ] Transitions entre les photos
- [ ] Effet de mouvement Ken Burns
- [ ] Forme d'onde calculée depuis le signal audio
- [ ] Enregistrement d'une narration
- [ ] Projets portables avec médias embarqués

## Documentation du projet

- [`CHANGELOG.md`](CHANGELOG.md) : évolutions publiées et non publiées ;
- [`CONTEXT.md`](CONTEXT.md) : architecture, contraintes et procédure de
  validation destinée aux mainteneurs.

Le projet est déclaré sous licence MIT dans `package.json`.
