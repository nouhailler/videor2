export type HelpTopicId =
  | "projects"
  | "photos"
  | "video"
  | "audio"
  | "preview"
  | "timeline"
  | "inspector"
  | "export"
  | "settings";

export type HelpTopic = {
  id: HelpTopicId;
  label: string;
  title: string;
  summary: string;
  steps: string[];
  tips: string[];
  demo: "projects" | "photos" | "video" | "audio" | "preview" | "timeline" | "inspector" | "export" | "settings";
};

export const onboardingSlides = [
  {
    eyebrow: "BIENVENUE",
    title: "Créez votre première vidéo simplement",
    description:
      "Vidéor rassemble les outils essentiels pour transformer des photos en vidéo ou découper une vidéo existante.",
    points: ["Interface guidée", "Montage non destructif", "Export MP4 ou WebM"]
  },
  {
    eyebrow: "DEUX MODES",
    title: "Choisissez un seul type de montage",
    description:
      "Le mode Diaporama utilise des photos et une piste audio externe. Le mode Vidéo travaille sur une vidéo source et son audio intégré.",
    points: ["Photos + audio", "Ou vidéo source", "Confirmation avant remplacement"]
  },
  {
    eyebrow: "VOTRE ESPACE",
    title: "De gauche à droite",
    description:
      "Importez dans la médiathèque, vérifiez dans l’aperçu, organisez dans la timeline et ajustez la sélection dans l’inspecteur.",
    points: ["Médiathèque", "Aperçu et timeline", "Inspecteur contextuel"]
  },
  {
    eyebrow: "SANS RISQUE",
    title: "Vos originaux restent intacts",
    description:
      "Les modifications sont enregistrées dans le projet. Vidéor ne modifie jamais directement vos photos, votre audio ou votre vidéo source.",
    points: ["Sauvegarde automatique", "Projets .videor", "Aide accessible à tout moment"]
  }
] as const;

export const tourSteps = [
  {
    target: "projects",
    title: "Projet et sauvegarde",
    text: "Créez, ouvrez et enregistrez vos projets depuis cette barre. Le point vert indique que les changements sont sauvegardés."
  },
  {
    target: "library",
    title: "Médiathèque",
    text: "Ajoutez vos photos, votre piste audio ou une vidéo source. Les onglets permettent de changer de mode."
  },
  {
    target: "preview",
    title: "Aperçu",
    text: "Lisez le montage, déplacez-vous dans le temps et passez en plein écran."
  },
  {
    target: "timeline",
    title: "Timeline",
    text: "Réorganisez les photos, visualisez leurs durées et repérez les coupes appliquées à une vidéo."
  },
  {
    target: "inspector",
    title: "Inspecteur",
    text: "Les réglages affichés dépendent du média sélectionné : durée, rotation, cadrage ou outils de découpe."
  },
  {
    target: "export",
    title: "Export final",
    text: "Choisissez MP4 ou WebM, puis 720p, 1080p ou 4K. Le projet reste modifiable après l’export."
  }
] as const;

export const helpTopics: HelpTopic[] = [
  {
    id: "projects",
    label: "Projet",
    title: "Gérer votre projet",
    summary: "Enregistrez les réglages du montage dans un fichier .videor.",
    steps: [
      "Utilisez Nouveau pour repartir d’un espace vide.",
      "Enregistrer adopte ou met à jour le fichier projet courant.",
      "Importer charge une copie sans adopter son emplacement.",
      "Projet exporte une copie indépendante du fichier .videor."
    ],
    tips: [
      "Les médias ne sont pas intégrés au fichier projet.",
      "Conservez les fichiers source à leur emplacement d’origine.",
      "Une sauvegarde automatique est restaurée au démarrage."
    ],
    demo: "projects"
  },
  {
    id: "photos",
    label: "Photos",
    title: "Créer un diaporama",
    summary: "Importez plusieurs images, puis organisez-les dans la timeline.",
    steps: [
      "Cliquez sur Ajouter des photos ou déposez les fichiers dans la fenêtre.",
      "Sélectionnez une vignette pour afficher ses réglages.",
      "Glissez les clips dans la timeline pour modifier leur ordre.",
      "Réglez la durée de chaque photo dans l’inspecteur."
    ],
    tips: [
      "JPEG, PNG, WebP et BMP sont pris en charge.",
      "Le mode photo peut utiliser une piste audio externe.",
      "Remplir recadre l’image ; Ajuster conserve toute l’image."
    ],
    demo: "photos"
  },
  {
    id: "video",
    label: "Vidéo",
    title: "Découper une vidéo",
    summary: "Définissez un début, une fin et les plages internes à retirer.",
    steps: [
      "Chargez une vidéo depuis l’onglet Vidéo.",
      "Placez la tête de lecture au début ou à la fin souhaitée.",
      "Utilisez Commencer ici ou Terminer ici.",
      "Marquez deux positions pour supprimer une plage interne."
    ],
    tips: [
      "La source n’est jamais modifiée.",
      "Les zones rouges de la timeline sont retirées à l’export.",
      "Une coupe peut être annulée individuellement dans l’inspecteur."
    ],
    demo: "video"
  },
  {
    id: "audio",
    label: "Audio",
    title: "Ajouter une piste audio",
    summary: "Ajoutez une ambiance sonore au diaporama et ajustez son volume.",
    steps: [
      "Ouvrez l’onglet Audio en mode diaporama.",
      "Importez un fichier audio pris en charge.",
      "Réglez le volume avec le curseur.",
      "Lancez l’aperçu pour vérifier la synchronisation."
    ],
    tips: [
      "Une piste courte est complétée par du silence.",
      "Une piste longue s’arrête à la fin du diaporama.",
      "L’audio externe n’est pas disponible en mode vidéo."
    ],
    demo: "audio"
  },
  {
    id: "preview",
    label: "Aperçu",
    title: "Prévisualiser le montage",
    summary: "Contrôlez la lecture et naviguez précisément dans le montage.",
    steps: [
      "Utilisez Lecture/Pause au centre des commandes.",
      "Les flèches déplacent la lecture de cinq secondes.",
      "Le curseur permet d’atteindre une position précise.",
      "Le bouton d’agrandissement active le plein écran."
    ],
    tips: [
      "L’aperçu saute automatiquement les coupes vidéo.",
      "Le compteur de gauche indique le temps monté, pas toujours le temps source.",
      "Sélectionner un clip place la lecture au début de cette photo."
    ],
    demo: "preview"
  },
  {
    id: "timeline",
    label: "Timeline",
    title: "Comprendre la timeline",
    summary: "La timeline représente l’ordre, la durée et la position de lecture.",
    steps: [
      "Chaque clip photo correspond à une image du diaporama.",
      "La largeur du clip reflète sa durée.",
      "La ligne rose indique la position actuelle.",
      "En mode vidéo, les zones sombres ou rouges ne seront pas exportées."
    ],
    tips: [
      "Glissez un clip sur un autre pour le déplacer.",
      "Cliquez sur un clip pour le sélectionner et vous y rendre.",
      "La forme d’onde actuelle est une représentation décorative."
    ],
    demo: "timeline"
  },
  {
    id: "inspector",
    label: "Inspecteur",
    title: "Modifier la sélection",
    summary: "L’inspecteur affiche les outils adaptés au média actif.",
    steps: [
      "Sélectionnez une photo pour régler durée, rotation et cadrage.",
      "Choisissez Remplir pour ajuster la position dans le cadre.",
      "En mode vidéo, utilisez l’inspecteur pour créer les coupes.",
      "Les actions de suppression demandent une confirmation."
    ],
    tips: [
      "Les réglages sont non destructifs.",
      "La durée minimale d’une photo est de 0,5 seconde.",
      "Les positions horizontale et verticale concernent le mode Remplir."
    ],
    demo: "inspector"
  },
  {
    id: "export",
    label: "Export",
    title: "Exporter la vidéo finale",
    summary: "Encodez le montage dans un fichier vidéo partageable.",
    steps: [
      "Cliquez sur Exporter la vidéo.",
      "Choisissez MP4 pour la compatibilité ou WebM pour le web.",
      "Sélectionnez la résolution souhaitée.",
      "Choisissez la destination et suivez la progression."
    ],
    tips: [
      "MP4 utilise H.264 et AAC.",
      "WebM utilise VP9 et Opus.",
      "FFmpeg et FFprobe doivent être installés sur la machine."
    ],
    demo: "export"
  },
  {
    id: "settings",
    label: "Paramètres",
    title: "Personnaliser Vidéor",
    summary: "Définissez les valeurs appliquées aux prochains imports et exports.",
    steps: [
      "Choisissez la durée par défaut des nouvelles photos.",
      "Définissez le format et la résolution d’export par défaut.",
      "Activez ou désactivez les confirmations destructrices.",
      "Utilisez Réinitialiser pour revenir aux valeurs d’origine."
    ],
    tips: [
      "Les préférences sont conservées sur cette machine.",
      "Modifier la durée par défaut ne change pas les photos déjà importées.",
      "La visite guidée peut être relancée depuis le centre d’aide."
    ],
    demo: "settings"
  }
];

export function helpTopicById(id: HelpTopicId) {
  return helpTopics.find((topic) => topic.id === id) || helpTopics[0];
}

export function shouldShowOnboarding(storage: Pick<Storage, "getItem">) {
  return storage.getItem("videor-onboarding-complete") !== "true";
}

export function completeOnboarding(storage: Pick<Storage, "setItem">) {
  storage.setItem("videor-onboarding-complete", "true");
}
