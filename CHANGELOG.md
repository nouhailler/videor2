# Journal des modifications

Toutes les évolutions notables de Vidéor sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet utilise le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- import d'une vidéo MP4, MOV, MKV, WebM, AVI ou M4V ;
- coupe non destructive du début et de la fin d'une vidéo ;
- suppression de plusieurs plages internes en deux repères ;
- aperçu vidéo synchronisé avec les portions conservées ;
- export MP4 ou WebM reconstruisant automatiquement les segments conservés ;
- tests Vitest des calculs de plages et de conversion temporelle ;
- protocole sécurisé `videor-media://` pour charger les médias locaux ;
- génération et mise en cache d'aperçus JPEG avec FFmpeg ;
- jeu de 30 photos haute résolution dans `test/` pour valider les imports ;
- écran de récupération en cas d'erreur fatale de l'interface ;
- icônes Linux aux tailles standard de 16 à 1024 pixels.

### Modifié

- format projet étendu avec une vidéo source et ses repères de coupe ;
- médiathèque, timeline et inspecteur adaptés au mode vidéo ;
- préparation des aperçus lors de l'import et de l'ouverture d'un projet ;
- poursuite d'un import lorsque certains fichiers sont illisibles ;
- diagnostics Electron pour les erreurs du processus d'affichage ;
- paquet Debian avec lanceur desktop explicite et rafraîchissement du cache
  d'icônes lors de l'installation et de la suppression.

### Prévu

- tests unitaires du modèle projet, de la timeline et des commandes FFmpeg ;
- test automatisé d'import utilisant les photos du dossier `test/` ;
- transitions simples entre les photos ;
- effet de mouvement Ken Burns ;
- forme d'onde calculée depuis le fichier audio ;
- projets portables avec médias embarqués ;
- tests automatisés.

## [0.1.0] - 2026-06-08

### Ajouté

- première version MVP de l'application Linux ;
- création, ouverture, import et export de projets `.videor` ;
- sauvegarde automatique et restauration au démarrage ;
- import multiple et glisser-déposer des photos ;
- timeline avec réorganisation et durée individuelle des photos ;
- rotation et recadrage simple ;
- import, remplacement et réglage du volume de la piste audio ;
- lecture synchronisée, navigation temporelle et aperçu plein écran ;
- export MP4/H.264 et WebM/VP9 en 720p, 1080p et 4K ;
- suivi de progression et annulation d'un export ;
- interface sombre inspirée du prototype Stitch ;
- icône Linux et configuration des paquets AppImage et DEB ;
- documentation de démarrage et contexte de développement.

[Non publié]: https://github.com/nouhailler/videor2/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nouhailler/videor2/releases/tag/v0.1.0
