import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crop,
  Download,
  Expand,
  FileDown,
  FilePlus2,
  FileUp,
  Film,
  FolderOpen,
  ImagePlus,
  Images,
  Lightbulb,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Settings,
  Trash2,
  Upload,
  Undo2,
  Volume2,
  X
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  editedTimeToSource,
  editedVideoDuration,
  normalizeVideoEdits,
  segmentAtSourceTime,
  sourceTimeToEdited,
  TimeRange
} from "./videoEditing";
import {
  ContextTip,
  GuidedTour,
  HelpCenter,
  OnboardingModal
} from "./GuidanceUI";
import {
  completeOnboarding,
  HelpTopicId,
  shouldShowOnboarding
} from "./guidance";

type Photo = {
  id: string;
  path: string;
  previewPath?: string | null;
  name: string;
  duration: number;
  rotation: 0 | 90 | 180 | 270;
  fit: "cover" | "contain";
  positionX: number;
  positionY: number;
};

type AudioTrack = {
  path: string;
  name: string;
  duration: number;
  volume: number;
};

type VideoSource = {
  path: string;
  previewPath: string | null;
  name: string;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  trimStart: number;
  trimEnd: number;
  cuts: TimeRange[];
};

type Project = {
  format: "videor-project";
  version: 1;
  name: string;
  photos: Photo[];
  audio: AudioTrack | null;
  video: VideoSource | null;
  updatedAt?: string;
};

type ExportOptions = {
  format: "mp4" | "webm";
  resolution: "720p" | "1080p" | "4k";
};

type AppSettings = {
  defaultPhotoDuration: number;
  defaultFormat: ExportOptions["format"];
  defaultResolution: ExportOptions["resolution"];
  confirmDestructiveActions: boolean;
};

const defaultSettings: AppSettings = {
  defaultPhotoDuration: 5,
  defaultFormat: "mp4",
  defaultResolution: "1080p",
  confirmDestructiveActions: true
};

function loadSettings(): AppSettings {
  try {
    const stored = JSON.parse(localStorage.getItem("videor-settings") || "{}");
    return {
      defaultPhotoDuration:
        Number.isFinite(stored.defaultPhotoDuration) &&
        stored.defaultPhotoDuration >= 0.5 &&
        stored.defaultPhotoDuration <= 600
          ? stored.defaultPhotoDuration
          : defaultSettings.defaultPhotoDuration,
      defaultFormat: stored.defaultFormat === "webm" ? "webm" : "mp4",
      defaultResolution: ["720p", "1080p", "4k"].includes(stored.defaultResolution)
        ? stored.defaultResolution
        : defaultSettings.defaultResolution,
      confirmDestructiveActions: stored.confirmDestructiveActions !== false
    };
  } catch {
    return defaultSettings;
  }
}

const emptyProject = (): Project => ({
  format: "videor-project",
  version: 1,
  name: "Mon projet",
  photos: [],
  audio: null,
  video: null
});

const iconSize = 18;

function basename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function photoSource(photo: Photo) {
  return window.videor.fileUrl(photo.previewPath || photo.path);
}

function formatTime(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPreciseTime(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function photoAtTime(photos: Photo[], time: number) {
  let elapsed = 0;
  for (let index = 0; index < photos.length; index += 1) {
    elapsed += photos[index].duration;
    if (time < elapsed) return index;
  }
  return Math.max(0, photos.length - 1);
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => shouldShowOnboarding(localStorage)
  );
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopicId>("projects");
  const [project, setProject] = useState<Project>(emptyProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(true);
  const [message, setMessage] = useState("Prêt");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: settings.defaultFormat,
    resolution: settings.defaultResolution
  });
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [libraryTab, setLibraryTab] = useState<"photos" | "video" | "audio">("photos");
  const [cutStartSource, setCutStartSource] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const playbackStartRef = useRef({ wallTime: 0, mediaTime: 0 });

  const totalDuration = useMemo(
    () => project.video
      ? editedVideoDuration(project.video)
      : project.photos.reduce((sum, photo) => sum + photo.duration, 0),
    [project.photos, project.video]
  );
  const selected = project.photos.find((photo) => photo.id === selectedId) || null;
  const activeIndex = project.photos.length ? photoAtTime(project.photos, currentTime) : -1;
  const activePhoto = activeIndex >= 0 ? project.photos[activeIndex] : null;
  const sourceTime = project.video
    ? editedTimeToSource(project.video, currentTime)
    : currentTime;
  const hasProjectContent = project.photos.length > 0 || Boolean(project.audio) || Boolean(project.video);

  const mutateProject = useCallback((mutator: (value: Project) => Project) => {
    setProject((value) => mutator(value));
    setSaved(false);
  }, []);

  useEffect(() => {
    localStorage.setItem("videor-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.videor.loadAutosave().then((restored) => {
      if (!restored) return;
      void loadProject(restored as Project, "Projet restauré");
    }).catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (saved) return;
    const timeout = window.setTimeout(() => {
      window.videor.autosave(project).then(() => {
        setSaved(true);
        setMessage("Sauvegardé automatiquement");
      }).catch((error) => setMessage(error.message));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [project, saved]);

  useEffect(() => window.videor.onExportProgress(setExportProgress), []);

  useEffect(() => {
    if (!project.audio || !audioRef.current) return;
    audioRef.current.volume = project.audio.volume;
  }, [project.audio]);

  useEffect(() => {
    if (!playing) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    const update = () => {
      const video = videoRef.current;
      if (project.video && video) {
        const position = segmentAtSourceTime(project.video, video.currentTime);
        if (!position.segment) {
          if (position.next) {
            video.currentTime = position.next.start;
            animationRef.current = requestAnimationFrame(update);
            return;
          }
          setCurrentTime(totalDuration);
          setPlaying(false);
          video.pause();
          return;
        }
        if (video.currentTime >= position.segment.end - 0.03) {
          if (position.next) {
            video.currentTime = position.next.start;
          } else {
            setCurrentTime(totalDuration);
            setPlaying(false);
            video.pause();
            return;
          }
        }
        setCurrentTime(sourceTimeToEdited(project.video, video.currentTime));
        animationRef.current = requestAnimationFrame(update);
        return;
      }
      const audio = audioRef.current;
      const next = project.audio && audio && !audio.ended
        ? audio.currentTime
        : playbackStartRef.current.mediaTime +
          (performance.now() - playbackStartRef.current.wallTime) / 1000;
      if (next >= totalDuration) {
        setCurrentTime(totalDuration);
        setPlaying(false);
        audio?.pause();
        return;
      }
      setCurrentTime(next);
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing, project.audio, project.video, totalDuration]);

  const confirmDestructive = useCallback((message: string) => {
    return !settings.confirmDestructiveActions || window.confirm(message);
  }, [settings.confirmDestructiveActions]);

  const openHelp = useCallback((topic: HelpTopicId) => {
    setHelpTopic(topic);
    setHelpOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    completeOnboarding(localStorage);
    setOnboardingOpen(false);
  }, []);

  const finishOnboarding = useCallback(() => {
    closeOnboarding();
    setTourStep(0);
    setTourOpen(true);
  }, [closeOnboarding]);

  const startTour = useCallback(() => {
    setHelpOpen(false);
    setOnboardingOpen(false);
    setTourStep(0);
    setTourOpen(true);
  }, []);

  const restartOnboarding = useCallback(() => {
    setHelpOpen(false);
    setTourOpen(false);
    setOnboardingStep(0);
    setOnboardingOpen(true);
  }, []);

  const addPhotos = useCallback(async (paths: string[]) => {
    const accepted = paths.filter((path) => /\.(jpe?g|png|webp|bmp)$/i.test(path));
    if (!accepted.length) return;
    if (project.video && !confirmDestructive(
      "Ajouter des photos retirera la vidéo actuelle et ses coupes. Continuer ?"
    )) return;
    setMessage(`Préparation de ${accepted.length} photo${accepted.length > 1 ? "s" : ""}…`);
    const prepared = await window.videor.preparePhotos(accepted);
    const valid = prepared.filter((item) => item.previewPath);
    const photos: Photo[] = valid.map(({ path, previewPath }) => ({
      id: crypto.randomUUID(),
      path,
      previewPath,
      name: basename(path),
      duration: settings.defaultPhotoDuration,
      rotation: 0,
      fit: "cover",
      positionX: 50,
      positionY: 50
    }));
    if (!photos.length) {
      setMessage("Aucune photo lisible n’a pu être importée");
      return;
    }
    mutateProject((value) => ({
      ...value,
      video: null,
      photos: [...value.photos, ...photos]
    }));
    setSelectedId((value) => value || photos[0].id);
    const rejected = prepared.length - valid.length;
    setMessage(
      `${photos.length} photo${photos.length > 1 ? "s" : ""} ajoutée${photos.length > 1 ? "s" : ""}` +
      (rejected ? ` · ${rejected} fichier${rejected > 1 ? "s" : ""} ignoré${rejected > 1 ? "s" : ""}` : "")
    );
  }, [confirmDestructive, mutateProject, project.video, settings.defaultPhotoDuration]);

  const choosePhotos = async () => {
    try {
      await addPhotos(await window.videor.choosePhotos());
    } catch (error) {
      setMessage(`Import impossible : ${(error as Error).message}`);
    }
  };

  const chooseAudio = async () => {
    const path = await window.videor.chooseAudio();
    if (!path) return;
    if (project.audio && !confirmDestructive(
      "Remplacer la piste audio actuelle ?"
    )) return;
    mutateProject((value) => ({
      ...value,
      audio: { path, name: basename(path), duration: 0, volume: value.audio?.volume ?? 0.8 }
    }));
    setLibraryTab("audio");
    setCurrentTime(0);
    setMessage("Piste audio chargée");
  };

  const importVideo = useCallback(async (path: string) => {
    if ((project.photos.length || project.audio || project.video) && !confirmDestructive(
      "Charger cette vidéo remplacera les photos, l’audio et la vidéo actuels. Continuer ?"
    )) return;
    setMessage("Analyse de la vidéo…");
    const prepared = await window.videor.prepareVideo(path);
    if (!prepared || prepared.error || !prepared.previewPath) {
      throw new Error(prepared?.error || "Vidéo illisible");
    }
    const video: VideoSource = {
      path: prepared.path,
      previewPath: prepared.previewPath,
      name: basename(prepared.path),
      duration: prepared.duration,
      width: prepared.width,
      height: prepared.height,
      hasAudio: prepared.hasAudio,
      trimStart: 0,
      trimEnd: prepared.duration,
      cuts: []
    };
    mutateProject((value) => ({
      ...value,
      photos: [],
      audio: null,
      video
    }));
    setSelectedId(null);
    setLibraryTab("video");
    setCutStartSource(null);
    setCurrentTime(0);
    setPlaying(false);
    setMessage(`Vidéo chargée : ${video.name}`);
  }, [confirmDestructive, mutateProject, project.audio, project.photos.length, project.video]);

  const chooseVideo = async () => {
    try {
      const path = await window.videor.chooseVideo();
      if (path) await importVideo(path);
    } catch (error) {
      setMessage(`Import impossible : ${(error as Error).message}`);
    }
  };

  const handleFileDrop = async (event: DragEvent) => {
    event.preventDefault();
    const paths = [...event.dataTransfer.files].map(window.videor.filePath);
    const audio = paths.find((path) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(path));
    const video = paths.find((path) => /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(path));
    if (video) {
      try {
        await importVideo(video);
      } catch (error) {
        setMessage(`Import impossible : ${(error as Error).message}`);
      }
      return;
    }
    try {
      await addPhotos(paths);
    } catch (error) {
      setMessage(`Import impossible : ${(error as Error).message}`);
    }
    if (audio) {
      mutateProject((value) => ({
        ...value,
        audio: { path: audio, name: basename(audio), duration: 0, volume: 0.8 }
      }));
    }
  };

  const updateSelected = (patch: Partial<Photo>) => {
    if (!selectedId) return;
    mutateProject((value) => ({
      ...value,
      photos: value.photos.map((photo) => photo.id === selectedId ? { ...photo, ...patch } : photo)
    }));
  };

  const removePhoto = (id: string) => {
    const index = project.photos.findIndex((photo) => photo.id === id);
    const nextPhotos = project.photos.filter((photo) => photo.id !== id);
    mutateProject((value) => ({ ...value, photos: nextPhotos }));
    setSelectedId(nextPhotos[Math.min(index, nextPhotos.length - 1)]?.id ?? null);
    setCurrentTime(0);
  };

  const reorder = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    mutateProject((value) => {
      const photos = [...value.photos];
      const from = photos.findIndex((photo) => photo.id === draggingId);
      const to = photos.findIndex((photo) => photo.id === targetId);
      const [moved] = photos.splice(from, 1);
      photos.splice(to, 0, moved);
      return { ...value, photos };
    });
    setDraggingId(null);
  };

  const seek = (value: number) => {
    const next = Math.min(totalDuration, Math.max(0, value));
    setCurrentTime(next);
    if (videoRef.current && project.video) {
      videoRef.current.currentTime = editedTimeToSource(project.video, next);
    }
    if (audioRef.current && project.audio) audioRef.current.currentTime = next;
    playbackStartRef.current = { wallTime: performance.now(), mediaTime: next };
  };

  const togglePlay = async () => {
    if ((!project.photos.length && !project.video) || totalDuration <= 0) return;
    if (playing) {
      audioRef.current?.pause();
      videoRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (currentTime >= totalDuration) seek(0);
    playbackStartRef.current = { wallTime: performance.now(), mediaTime: currentTime };
    if (project.video && videoRef.current) {
      videoRef.current.currentTime = editedTimeToSource(project.video, currentTime);
      try {
        await videoRef.current.play();
        setPlaying(true);
        setMessage("Lecture de la vidéo");
      } catch (error) {
        setPlaying(false);
        setMessage(`Lecture impossible : ${(error as Error).message}`);
      }
      return;
    }
    if (
      project.audio &&
      audioRef.current &&
      currentTime < audioRef.current.duration
    ) {
      audioRef.current.currentTime = currentTime;
      await audioRef.current.play();
    }
    setPlaying(true);
  };

  const movePhoto = (direction: -1 | 1) => {
    if (!selectedId) return;
    const index = project.photos.findIndex((photo) => photo.id === selectedId);
    const target = index + direction;
    if (target < 0 || target >= project.photos.length) return;
    mutateProject((value) => {
      const photos = [...value.photos];
      [photos[index], photos[target]] = [photos[target], photos[index]];
      return { ...value, photos };
    });
  };

  const loadProject = async (value: Project, notice: string) => {
    setMessage("Préparation des aperçus…");
    const compatible = {
      ...value,
      photos: value.photos || [],
      audio: value.audio || null,
      video: value.video || null
    };
    const prepared = await window.videor.preparePhotos(compatible.photos.map((photo) => photo.path));
    const previewByPath = new Map(prepared.map((item) => [item.path, item.previewPath]));
    let hydratedVideo = compatible.video;
    if (compatible.video) {
      const videoInfo = await window.videor.prepareVideo(compatible.video.path);
      if (videoInfo && !videoInfo.error) {
        hydratedVideo = {
          ...compatible.video,
          previewPath: videoInfo.previewPath,
          duration: videoInfo.duration,
          width: videoInfo.width,
          height: videoInfo.height,
          hasAudio: videoInfo.hasAudio,
          trimEnd: Math.min(compatible.video.trimEnd ?? videoInfo.duration, videoInfo.duration)
        };
      }
    }
    const hydrated: Project = {
      ...compatible,
      video: hydratedVideo,
      photos: compatible.photos.map((photo) => ({
        ...photo,
        previewPath: previewByPath.get(photo.path) || photo.previewPath || null
      }))
    };
    setProject(hydrated);
    setSelectedId(hydrated.photos[0]?.id ?? null);
    setLibraryTab(hydrated.video ? "video" : "photos");
    setCutStartSource(null);
    setCurrentTime(0);
    setPlaying(false);
    setSaved(true);
    setMessage(notice);
  };

  const openProject = async () => {
    if (hasProjectContent && !confirmDestructive(
      "Ouvrir un autre projet remplacera le montage actuel. Continuer ?"
    )) return;
    try {
      const result = await window.videor.openProject();
      if (result) await loadProject(result.project as Project, "Projet ouvert");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const importProject = async () => {
    if (hasProjectContent && !confirmDestructive(
      "Importer un projet remplacera le montage actuel. Continuer ?"
    )) return;
    try {
      const result = await window.videor.importProject();
      if (result) await loadProject(result.project as Project, "Projet importé");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const newProject = async () => {
    if (hasProjectContent && !confirmDestructive(
      "Créer un nouveau projet effacera le montage actuel de l’espace de travail. Continuer ?"
    )) return;
    await window.videor.newProject();
    await loadProject(emptyProject(), "Nouveau projet");
  };

  const saveProject = async (saveAs = false) => {
    try {
      const path = await window.videor.saveProject(project, saveAs);
      if (path) {
        setSaved(true);
        setMessage(`Projet enregistré : ${basename(path)}`);
      }
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const runExport = async () => {
    try {
      setExportProgress(0);
      const output = await window.videor.exportVideo(project, exportOptions);
      if (output) {
        setMessage(`Vidéo exportée : ${basename(output)}`);
        setExportOpen(false);
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      window.setTimeout(() => setExportProgress(null), 600);
    }
  };

  const updateVideo = (patch: Partial<VideoSource>) => {
    mutateProject((value) => {
      if (!value.video) return value;
      const normalized = normalizeVideoEdits({ ...value.video, ...patch });
      return {
        ...value,
        video: { ...value.video, ...patch, ...normalized }
      };
    });
  };

  const setVideoStart = () => {
    if (!project.video) return;
    updateVideo({
      trimStart: Math.min(sourceTime, project.video.trimEnd - 0.05),
      cuts: project.video.cuts.filter((cut) => cut.end > sourceTime)
    });
    setCutStartSource(null);
    setCurrentTime(0);
    if (videoRef.current) videoRef.current.currentTime = sourceTime;
    setMessage("Début de la vidéo défini");
  };

  const setVideoEnd = () => {
    if (!project.video) return;
    updateVideo({
      trimEnd: Math.max(sourceTime, project.video.trimStart + 0.05),
      cuts: project.video.cuts.filter((cut) => cut.start < sourceTime)
    });
    setCutStartSource(null);
    setCurrentTime(Math.min(currentTime, sourceTimeToEdited({
      ...project.video,
      trimEnd: sourceTime
    }, sourceTime)));
    setMessage("Fin de la vidéo définie");
  };

  const completeInternalCut = () => {
    if (!project.video || cutStartSource === null) {
      setCutStartSource(sourceTime);
      setMessage("Début de coupe mémorisé. Placez-vous à la fin de la plage.");
      return;
    }
    if (Math.abs(sourceTime - cutStartSource) < 0.05) {
      setMessage("La plage à supprimer est trop courte");
      return;
    }
    const cut = {
      start: Math.min(cutStartSource, sourceTime),
      end: Math.max(cutStartSource, sourceTime)
    };
    const nextVideo = normalizeVideoEdits({
      ...project.video,
      cuts: [...project.video.cuts, cut]
    });
    if (editedVideoDuration(nextVideo) < 0.05) {
      setMessage("Cette coupe supprimerait toute la vidéo");
      return;
    }
    updateVideo({ cuts: nextVideo.cuts });
    setCutStartSource(null);
    setPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = cut.end;
    }
    setCurrentTime(sourceTimeToEdited(nextVideo, cut.end));
    setMessage("Plage supprimée du montage");
  };

  return (
    <div className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={handleFileDrop}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Play size={13} fill="currentColor" /></div>
          <strong>Vidéor</strong>
        </div>
        <nav className="top-actions" data-tour="projects">
          <button onClick={newProject}><FilePlus2 size={iconSize} />Nouveau</button>
          <button onClick={openProject}><FolderOpen size={iconSize} />Ouvrir</button>
          <button onClick={() => saveProject(false)}><Save size={iconSize} />Enregistrer</button>
          <span className="toolbar-separator" />
          <button onClick={importProject} title="Importer un projet"><FileUp size={iconSize} />Importer</button>
          <button onClick={() => window.videor.exportProject(project)} title="Exporter le fichier projet">
            <FileDown size={iconSize} />Projet
          </button>
        </nav>
        <div className="project-title">
          <input
            aria-label="Nom du projet"
            value={project.name}
            onChange={(event) => mutateProject((value) => ({ ...value, name: event.target.value }))}
          />
          <span className={saved ? "save-dot saved" : "save-dot"} />
        </div>
        <div className="top-actions top-actions-right">
          <button className="primary" data-tour="export" onClick={() => setExportOpen(true)}>
            <Download size={iconSize} />Exporter la vidéo
          </button>
          <button className="icon-button" title="Aide" onClick={() => openHelp("projects")}>
            <CircleHelp size={20} />
          </button>
          <button className="icon-button" title="Paramètres" onClick={() => setSettingsOpen(true)}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="library panel" data-tour="library">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MÉDIATHÈQUE</span>
              <h2>Vos médias</h2>
            </div>
            <button
              className="icon-button"
              onClick={libraryTab === "video" ? chooseVideo : choosePhotos}
              title={libraryTab === "video" ? "Charger une vidéo" : "Ajouter des photos"}
            >
              <Plus size={19} />
            </button>
          </div>
          <div className="tabs">
            <button className={libraryTab === "photos" ? "active" : ""} onClick={() => setLibraryTab("photos")}>
              <Images size={16} /> Photos <span>{project.photos.length}</span>
            </button>
            <button className={libraryTab === "video" ? "active" : ""} onClick={() => setLibraryTab("video")}>
              <Film size={16} /> Vidéo <span>{project.video ? 1 : 0}</span>
            </button>
            {!project.video && (
              <button className={libraryTab === "audio" ? "active" : ""} onClick={() => setLibraryTab("audio")}>
                <Music2 size={16} /> Audio
              </button>
            )}
          </div>
          <ContextTip topic={libraryTab} onOpenHelp={openHelp} />

          {libraryTab === "photos" ? (
            <div className="library-content">
              <button className="drop-zone" onClick={choosePhotos}>
                <ImagePlus size={25} />
                <strong>Ajouter des photos</strong>
                <span>ou déposez-les ici</span>
              </button>
              <div className="media-grid">
                {project.photos.map((photo, index) => (
                  <button
                    className={`media-card ${photo.id === selectedId ? "selected" : ""}`}
                    key={photo.id}
                    onClick={() => setSelectedId(photo.id)}
                  >
                    <img src={photoSource(photo)} alt="" />
                    <span className="media-index">{index + 1}</span>
                    <span className="media-duration">{photo.duration.toFixed(1)}s</span>
                  </button>
                ))}
              </div>
            </div>
          ) : libraryTab === "video" ? (
            <div className="library-content">
              {project.video ? (
                <div className="video-card">
                  <img src={window.videor.fileUrl(project.video.previewPath || project.video.path)} alt="" />
                  <strong>{project.video.name}</strong>
                  <span>
                    {project.video.width} × {project.video.height} · {formatTime(project.video.duration)}
                  </span>
                  <button
                    className="icon-button danger"
                    title="Retirer la vidéo"
                    onClick={() => {
                      if (!confirmDestructive("Retirer cette vidéo et toutes ses coupes ?")) return;
                      mutateProject((value) => ({ ...value, video: null }));
                      setCurrentTime(0);
                      setPlaying(false);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="empty-library">
                  <Film size={30} />
                  <strong>Aucune vidéo</strong>
                  <span>MP4, MOV, MKV, WebM, AVI ou M4V</span>
                </div>
              )}
              <button className="secondary full-width" onClick={chooseVideo}>
                <Upload size={17} /> {project.video ? "Remplacer la vidéo" : "Charger une vidéo"}
              </button>
              <p className="library-help">
                Charger une vidéo active le mode découpe et remplace le diaporama actuel.
              </p>
            </div>
          ) : (
            <div className="library-content">
              {project.audio ? (
                <div className="audio-card">
                  <div className="audio-icon"><Music2 size={21} /></div>
                  <div>
                    <strong>{project.audio.name}</strong>
                    <span>{formatTime(project.audio.duration)} · piste principale</span>
                  </div>
                  <button
                    className="icon-button danger"
                    onClick={() => {
                      if (!confirmDestructive("Retirer la piste audio actuelle ?")) return;
                      mutateProject((value) => ({ ...value, audio: null }));
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="empty-library">
                  <Music2 size={30} />
                  <strong>Aucune piste audio</strong>
                  <span>MP3, WAV, OGG, M4A ou FLAC</span>
                </div>
              )}
              <button className="secondary full-width" onClick={chooseAudio}>
                <Upload size={17} /> {project.audio ? "Remplacer la piste" : "Importer un fichier audio"}
              </button>
              {project.audio && (
                <label className="field volume-field">
                  <span><Volume2 size={15} /> Volume <b>{Math.round(project.audio.volume * 100)}%</b></span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={project.audio.volume}
                    onChange={(event) => mutateProject((value) => ({
                      ...value,
                      audio: value.audio ? { ...value.audio, volume: Number(event.target.value) } : null
                    }))}
                  />
                </label>
              )}
            </div>
          )}
        </aside>

        <section className="editor">
          <div className="preview-wrap panel" data-tour="preview">
            <div className="preview-header">
              <span>Aperçu</span>
              <div className="panel-help-actions">
                <button className="mini-tip" onClick={() => openHelp("preview")}>
                  <Lightbulb size={14} />Conseil
                </button>
                <button className="icon-button" onClick={() => playerRef.current?.requestFullscreen()} title="Plein écran">
                  <Expand size={17} />
                </button>
              </div>
            </div>
            <div className="player" ref={playerRef}>
              {project.video ? (
                <video
                  ref={videoRef}
                  src={window.videor.fileUrl(project.video.path)}
                  preload="metadata"
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = editedTimeToSource(project.video!, currentTime);
                    }
                  }}
                  onEnded={() => setPlaying(false)}
                />
              ) : activePhoto ? (
                <img
                  src={photoSource(activePhoto)}
                  alt=""
                  style={{
                    objectFit: activePhoto.fit,
                    objectPosition: `${activePhoto.positionX}% ${activePhoto.positionY}%`,
                    transform: `rotate(${activePhoto.rotation}deg)`
                  }}
                />
              ) : (
                <button className="empty-player" onClick={chooseVideo}>
                  <div><Film size={32} /></div>
                  <strong>Chargez une vidéo ou ajoutez des photos</strong>
                  <span>Déposez un fichier vidéo ici pour le découper simplement</span>
                </button>
              )}
              <div className="player-controls">
                <button className="icon-button" onClick={() => seek(Math.max(0, currentTime - 5))}><ChevronLeft size={19} /></button>
                <button className="play-button" onClick={togglePlay}>
                  {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                <button className="icon-button" onClick={() => seek(Math.min(totalDuration, currentTime + 5))}><ChevronRight size={19} /></button>
                <span className="timecode">{formatTime(currentTime)} <i>/</i> {formatTime(totalDuration)}</span>
                <input
                  className="scrubber"
                  aria-label="Position de lecture"
                  type="range"
                  min="0"
                  max={Math.max(totalDuration, 0.01)}
                  step="0.01"
                  value={Math.min(currentTime, totalDuration)}
                  onChange={(event) => seek(Number(event.target.value))}
                />
                <Volume2 size={17} />
              </div>
            </div>
          </div>

          <div className="timeline panel" data-tour="timeline">
            <div className="timeline-heading">
              <div>
                <span className="eyebrow">TIMELINE</span>
                <strong>
                  {project.video
                    ? `1 vidéo · ${project.video.cuts.length} coupe${project.video.cuts.length !== 1 ? "s" : ""}`
                    : `${project.photos.length} photo${project.photos.length !== 1 ? "s" : ""}`}
                  {" · "}{formatTime(totalDuration)}
                </strong>
              </div>
              <div className="panel-help-actions">
                <button className="mini-tip" onClick={() => openHelp("timeline")}>
                  <Lightbulb size={14} />Conseil
                </button>
                <button className="secondary small" onClick={project.video ? chooseVideo : choosePhotos}>
                  <Plus size={15} />{project.video ? "Remplacer" : "Ajouter"}
                </button>
              </div>
            </div>
            <div className="timeline-scroll">
              <div className="photo-track">
                {project.video ? (
                  <button
                    className="video-track"
                    onClick={(event) => {
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const source = project.video!.duration *
                        ((event.clientX - bounds.left) / bounds.width);
                      seek(sourceTimeToEdited(project.video!, source));
                    }}
                  >
                    <img
                      src={window.videor.fileUrl(project.video.previewPath || project.video.path)}
                      alt=""
                    />
                    <span className="video-track-name"><Film size={14} />{project.video.name}</span>
                    <i
                      className="trimmed-range"
                      style={{ left: 0, width: `${(project.video.trimStart / project.video.duration) * 100}%` }}
                    />
                    <i
                      className="trimmed-range"
                      style={{
                        left: `${(project.video.trimEnd / project.video.duration) * 100}%`,
                        right: 0
                      }}
                    />
                    {project.video.cuts.map((cut, index) => (
                      <i
                        className="cut-range"
                        key={`${cut.start}-${cut.end}-${index}`}
                        style={{
                          left: `${(cut.start / project.video!.duration) * 100}%`,
                          width: `${((cut.end - cut.start) / project.video!.duration) * 100}%`
                        }}
                      />
                    ))}
                    {cutStartSource !== null && (
                      <i
                        className="cut-marker"
                        style={{ left: `${(cutStartSource / project.video.duration) * 100}%` }}
                      />
                    )}
                  </button>
                ) : project.photos.length === 0 ? (
                  <button className="timeline-empty" onClick={choosePhotos}>
                    Déposez vos photos ici pour commencer
                  </button>
                ) : project.photos.map((photo, index) => (
                  <article
                    key={photo.id}
                    draggable
                    onDragStart={() => setDraggingId(photo.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorder(photo.id)}
                    onClick={() => {
                      setSelectedId(photo.id);
                      seek(project.photos.slice(0, index).reduce((sum, item) => sum + item.duration, 0));
                    }}
                    className={`clip ${photo.id === selectedId ? "selected" : ""} ${index === activeIndex ? "playing" : ""}`}
                    style={{ width: `${Math.max(108, photo.duration * 28)}px` }}
                  >
                    <Menu size={15} className="drag-handle" />
                    <img src={photoSource(photo)} alt="" />
                    <span>{index + 1}</span>
                    <b>{photo.duration.toFixed(1)}s</b>
                  </article>
                ))}
              </div>
              {!project.video && <div className="audio-track">
                {project.audio ? (
                  <>
                    <span className="audio-label"><Music2 size={13} />{project.audio.name}</span>
                    <div className="waveform" aria-hidden="true">
                      {Array.from({ length: 110 }, (_, index) => (
                        <i key={index} style={{ height: `${18 + ((index * 29) % 67)}%` }} />
                      ))}
                    </div>
                  </>
                ) : (
                  <button onClick={chooseAudio}><Music2 size={15} />Ajouter une piste audio</button>
                )}
              </div>}
              {totalDuration > 0 && (
                <div
                  className="timeline-playhead"
                  style={{
                    left: project.video
                      ? `${(sourceTime / project.video.duration) * 100}%`
                      : `${(currentTime / totalDuration) * 100}%`
                  }}
                >
                  <span />
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="inspector panel" data-tour="inspector">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">INSPECTEUR</span>
              <h2>{project.video ? "Découpe vidéo" : "Photo"}</h2>
            </div>
            <button className="mini-tip icon-only" onClick={() => openHelp("inspector")} title="Conseil sur l’inspecteur">
              <Lightbulb size={15} />
            </button>
          </div>
          {project.video ? (
            <div className="inspector-content">
              <div className="inspector-thumb">
                <img
                  src={window.videor.fileUrl(project.video.previewPath || project.video.path)}
                  alt=""
                />
              </div>
              <div className="file-name" title={project.video.path}>{project.video.name}</div>
              <div className="video-metadata">
                <span>{project.video.width} × {project.video.height}</span>
                <span>{formatTime(project.video.duration)} source</span>
                <span>{project.video.hasAudio ? "Avec audio" : "Sans audio"}</span>
              </div>
              <div className="field">
                <span><Clock3 size={15} /> Position actuelle <b>{formatPreciseTime(sourceTime)}</b></span>
                <p className="field-help">
                  Déplacez le curseur sous l’aperçu, puis choisissez une action.
                </p>
              </div>
              <div className="field">
                <span>Raccourcir le début ou la fin</span>
                <div className="button-stack">
                  <button className="secondary" onClick={setVideoStart}>
                    <ChevronRight size={17} />Commencer ici
                  </button>
                  <button className="secondary" onClick={setVideoEnd}>
                    <ChevronLeft size={17} />Terminer ici
                  </button>
                </div>
              </div>
              <div className="field">
                <span><Scissors size={15} /> Supprimer une plage interne</span>
                <p className="field-help">
                  {cutStartSource === null
                    ? "Placez-vous au début de la partie à retirer."
                    : `Début mémorisé à ${formatPreciseTime(cutStartSource)}. Placez-vous à la fin.`}
                </p>
                <button className={cutStartSource === null ? "secondary full-width" : "primary full-width"} onClick={completeInternalCut}>
                  <Scissors size={17} />
                  {cutStartSource === null ? "Marquer le début" : "Supprimer jusqu’ici"}
                </button>
                {cutStartSource !== null && (
                  <button className="secondary full-width" onClick={() => setCutStartSource(null)}>
                    Annuler le repère
                  </button>
                )}
              </div>
              <div className="field">
                <span>Coupes appliquées <b>{project.video.cuts.length}</b></span>
                <div className="cut-list">
                  {project.video.cuts.map((cut, index) => (
                    <div key={`${cut.start}-${cut.end}-${index}`}>
                      <span>{formatPreciseTime(cut.start)} → {formatPreciseTime(cut.end)}</span>
                      <button
                        className="icon-button"
                        title="Annuler cette coupe"
                        onClick={() => updateVideo({
                          cuts: project.video!.cuts.filter((_item, itemIndex) => itemIndex !== index)
                        })}
                      >
                        <Undo2 size={15} />
                      </button>
                    </div>
                  ))}
                  {!project.video.cuts.length && <small>Aucune plage interne supprimée.</small>}
                </div>
              </div>
              <button
                className="danger-button"
                onClick={() => {
                  if (!confirmDestructive("Retirer cette vidéo et toutes ses coupes ?")) return;
                  mutateProject((value) => ({ ...value, video: null }));
                  setCurrentTime(0);
                  setPlaying(false);
                }}
              >
                <Trash2 size={17} />Retirer cette vidéo
              </button>
            </div>
          ) : selected ? (
            <div className="inspector-content">
              <div className="inspector-thumb">
                <img
                  src={photoSource(selected)}
                  alt=""
                  style={{
                    objectFit: selected.fit,
                    objectPosition: `${selected.positionX}% ${selected.positionY}%`,
                    transform: `rotate(${selected.rotation}deg)`
                  }}
                />
              </div>
              <div className="file-name" title={selected.path}>{selected.name}</div>
              <label className="field">
                <span><Clock3 size={15} /> Durée</span>
                <div className="duration-input">
                  <input
                    type="number"
                    min="0.5"
                    max="600"
                    step="0.5"
                    value={selected.duration}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateSelected({ duration: Math.max(0.5, Number(event.target.value)) })
                    }
                  />
                  <em>secondes</em>
                </div>
              </label>
              <div className="field">
                <span><RotateCw size={15} /> Rotation</span>
                <div className="button-row">
                  <button className="secondary" onClick={() => updateSelected({
                    rotation: ((selected.rotation + 270) % 360) as Photo["rotation"]
                  })}><RotateCcw size={17} /> Gauche</button>
                  <button className="secondary" onClick={() => updateSelected({
                    rotation: ((selected.rotation + 90) % 360) as Photo["rotation"]
                  })}><RotateCw size={17} /> Droite</button>
                </div>
              </div>
              <div className="field">
                <span><Crop size={15} /> Recadrage simple</span>
                <div className="segmented">
                  <button className={selected.fit === "cover" ? "active" : ""} onClick={() => updateSelected({ fit: "cover" })}>Remplir</button>
                  <button className={selected.fit === "contain" ? "active" : ""} onClick={() => updateSelected({ fit: "contain" })}>Ajuster</button>
                </div>
              </div>
              {selected.fit === "cover" && (
                <>
                  <label className="field compact">
                    <span>Position horizontale <b>{selected.positionX}%</b></span>
                    <input type="range" min="0" max="100" value={selected.positionX} onChange={(event) => updateSelected({ positionX: Number(event.target.value) })} />
                  </label>
                  <label className="field compact">
                    <span>Position verticale <b>{selected.positionY}%</b></span>
                    <input type="range" min="0" max="100" value={selected.positionY} onChange={(event) => updateSelected({ positionY: Number(event.target.value) })} />
                  </label>
                </>
              )}
              <div className="field">
                <span>Ordre dans la vidéo</span>
                <div className="button-row">
                  <button className="secondary" onClick={() => movePhoto(-1)}><ChevronLeft size={17} />Avant</button>
                  <button className="secondary" onClick={() => movePhoto(1)}>Après<ChevronRight size={17} /></button>
                </div>
              </div>
              <button
                className="danger-button"
                onClick={() => {
                  if (confirmDestructive(`Supprimer la photo « ${selected.name} » ?`)) {
                    removePhoto(selected.id);
                  }
                }}
              >
                <Trash2 size={17} />Supprimer cette photo
              </button>
            </div>
          ) : (
            <div className="empty-inspector">
              <Crop size={28} />
              <strong>Aucune photo sélectionnée</strong>
              <span>Sélectionnez une vignette dans la timeline.</span>
            </div>
          )}
        </aside>
      </main>

      <footer className="statusbar">
        <span><i className={message.toLowerCase().includes("échec") ? "error" : ""} />{message}</span>
        <span>{saved ? "Toutes les modifications sont enregistrées" : "Enregistrement…"}</span>
      </footer>

      {project.audio && !project.video && (
        <audio
          ref={audioRef}
          src={window.videor.fileUrl(project.audio.path)}
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (!Number.isFinite(duration) || duration === project.audio?.duration) return;
            setProject((value) => ({
              ...value,
              audio: value.audio ? { ...value.audio, duration } : null
            }));
          }}
          onEnded={(event) => {
            const audioEnd = Math.min(event.currentTarget.duration, totalDuration);
            setCurrentTime(audioEnd);
            playbackStartRef.current = {
              wallTime: performance.now(),
              mediaTime: audioEnd
            };
            if (audioEnd >= totalDuration) setPlaying(false);
          }}
        />
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">PRÉFÉRENCES</span>
                <h2>Paramètres</h2>
              </div>
              <button className="icon-button" onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <ContextTip topic="settings" onOpenHelp={openHelp} />
            <div className="settings-content">
              <label className="settings-field">
                <span>Durée par défaut d’une nouvelle photo</span>
                <div className="duration-input">
                  <input
                    type="number"
                    min="0.5"
                    max="600"
                    step="0.5"
                    value={settings.defaultPhotoDuration}
                    onChange={(event) => setSettings((value) => ({
                      ...value,
                      defaultPhotoDuration: Math.min(600, Math.max(0.5, Number(event.target.value) || 0.5))
                    }))}
                  />
                  <em>secondes</em>
                </div>
              </label>
              <div className="settings-field">
                <span>Format d’export par défaut</span>
                <div className="segmented">
                  {(["mp4", "webm"] as const).map((format) => (
                    <button
                      key={format}
                      className={settings.defaultFormat === format ? "active" : ""}
                      onClick={() => {
                        setSettings((value) => ({ ...value, defaultFormat: format }));
                        setExportOptions((value) => ({ ...value, format }));
                      }}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-field">
                <span>Résolution d’export par défaut</span>
                <div className="segmented">
                  {(["720p", "1080p", "4k"] as const).map((resolution) => (
                    <button
                      key={resolution}
                      className={settings.defaultResolution === resolution ? "active" : ""}
                      onClick={() => {
                        setSettings((value) => ({ ...value, defaultResolution: resolution }));
                        setExportOptions((value) => ({ ...value, resolution }));
                      }}
                    >
                      {resolution === "4k" ? "4K" : resolution}
                    </button>
                  ))}
                </div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.confirmDestructiveActions}
                  onChange={(event) => setSettings((value) => ({
                    ...value,
                    confirmDestructiveActions: event.target.checked
                  }))}
                />
                <span>
                  <b>Confirmer les actions destructrices</b>
                  <small>Demande une confirmation avant de remplacer ou supprimer des médias.</small>
                </span>
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => {
                setSettings(defaultSettings);
                setExportOptions({
                  format: defaultSettings.defaultFormat,
                  resolution: defaultSettings.defaultResolution
                });
              }}>
                Réinitialiser
              </button>
              <button className="primary" onClick={() => setSettingsOpen(false)}>Terminé</button>
            </div>
          </section>
        </div>
      )}

      {exportOpen && (
        <div className="modal-backdrop" onMouseDown={() => exportProgress === null && setExportOpen(false)}>
          <section className="export-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">EXPORT FINAL</span>
                <h2>Créer votre vidéo</h2>
              </div>
              <button className="icon-button" onClick={() => setExportOpen(false)} disabled={exportProgress !== null}><X size={20} /></button>
            </div>
            <ContextTip topic="export" onOpenHelp={openHelp} />
            <div className="export-summary">
              <div>
                {project.video ? <Film size={20} /> : <Images size={20} />}
                <span>
                  <b>{project.video ? "Vidéo" : project.photos.length}</b>
                  {project.video ? `${project.video.cuts.length} coupe(s)` : " photos"}
                </span>
              </div>
              <div><Clock3 size={20} /><span><b>{formatTime(totalDuration)}</b> durée</span></div>
              <div><Music2 size={20} /><span><b>{project.video?.hasAudio || project.audio ? "Oui" : "Non"}</b> audio</span></div>
            </div>
            <div className="export-field">
              <span>Format</span>
              <div className="format-options">
                <button className={exportOptions.format === "mp4" ? "active" : ""} onClick={() => setExportOptions((value) => ({ ...value, format: "mp4" }))}>
                  <b>MP4</b><small>H.264 · Compatible partout</small>
                </button>
                <button className={exportOptions.format === "webm" ? "active" : ""} onClick={() => setExportOptions((value) => ({ ...value, format: "webm" }))}>
                  <b>WebM</b><small>VP9 · Optimisé pour le web</small>
                </button>
              </div>
            </div>
            <div className="export-field">
              <span>Résolution</span>
              <div className="resolution-options">
                {(["720p", "1080p", "4k"] as const).map((resolution) => (
                  <button
                    key={resolution}
                    className={exportOptions.resolution === resolution ? "active" : ""}
                    onClick={() => setExportOptions((value) => ({ ...value, resolution }))}
                  >
                    <b>{resolution === "4k" ? "4K" : resolution}</b>
                    <small>{resolution === "720p" ? "1280 × 720" : resolution === "1080p" ? "1920 × 1080" : "3840 × 2160"}</small>
                  </button>
                ))}
              </div>
            </div>
            {exportProgress !== null && (
              <div className="export-progress">
                <div><span>Encodage en cours…</span><b>{exportProgress}%</b></div>
                <progress max="100" value={exportProgress} />
              </div>
            )}
            <div className="modal-actions">
              {exportProgress !== null ? (
                <button className="secondary" onClick={() => window.videor.cancelExport()}>Annuler l’export</button>
              ) : (
                <>
                  <button className="secondary" onClick={() => setExportOpen(false)}>Annuler</button>
                  <button className="primary" disabled={!project.photos.length && !project.video} onClick={runExport}>
                    <Download size={18} />Choisir la destination et exporter
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      <OnboardingModal
        open={onboardingOpen}
        step={onboardingStep}
        onStep={setOnboardingStep}
        onSkip={closeOnboarding}
        onFinish={finishOnboarding}
      />
      <GuidedTour
        open={tourOpen}
        step={tourStep}
        onStep={setTourStep}
        onClose={() => setTourOpen(false)}
      />
      <HelpCenter
        open={helpOpen}
        initialTopic={helpTopic}
        onClose={() => setHelpOpen(false)}
        onStartTour={startTour}
        onStartOnboarding={restartOnboarding}
      />
    </div>
  );
}

export default App;
