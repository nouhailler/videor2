# Vidéor

Vidéor est un éditeur de diaporamas vidéo simple pour Linux. Il assemble des
photos sur une piste audio et exporte le résultat en MP4/H.264 ou WebM/VP9.

## Prérequis

- Linux
- Node.js 20 ou plus récent
- FFmpeg et FFprobe disponibles dans le `PATH`

## Développement

```bash
npm install
npm run dev
```

## Lancer le build local

```bash
npm run build
npm start
```

## Générer les paquets Linux

```bash
npm run package:linux
```

Les fichiers AppImage et DEB sont produits dans `dist/`.

## Fonctions disponibles

- création, ouverture, import et export de projets `.videor`
- sauvegarde automatique
- import multiple et glisser-déposer de photos
- réorganisation, durée, rotation, recadrage et suppression
- import/remplacement d'une piste audio et réglage du volume
- lecture, pause, navigation et aperçu plein écran
- timeline simplifiée avec forme d'onde
- export MP4/H.264 ou WebM/VP9 en 720p, 1080p ou 4K
