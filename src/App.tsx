import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crop,
  Download,
  Expand,
  FileDown,
  FilePlus2,
  FileUp,
  FolderOpen,
  ImagePlus,
  Images,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Settings,
  Trash2,
  Upload,
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

type Project = {
  format: "videor-project";
  version: 1;
  name: string;
  photos: Photo[];
  audio: AudioTrack | null;
  updatedAt?: string;
};

type ExportOptions = {
  format: "mp4" | "webm";
  resolution: "720p" | "1080p" | "4k";
};

const emptyProject = (): Project => ({
  format: "videor-project",
  version: 1,
  name: "Mon projet",
  photos: [],
  audio: null
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

function photoAtTime(photos: Photo[], time: number) {
  let elapsed = 0;
  for (let index = 0; index < photos.length; index += 1) {
    elapsed += photos[index].duration;
    if (time < elapsed) return index;
  }
  return Math.max(0, photos.length - 1);
}

function App() {
  const [project, setProject] = useState<Project>(emptyProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(true);
  const [message, setMessage] = useState("Prêt");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "mp4",
    resolution: "1080p"
  });
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [libraryTab, setLibraryTab] = useState<"photos" | "audio">("photos");
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const playbackStartRef = useRef({ wallTime: 0, mediaTime: 0 });

  const totalDuration = useMemo(
    () => project.photos.reduce((sum, photo) => sum + photo.duration, 0),
    [project.photos]
  );
  const selected = project.photos.find((photo) => photo.id === selectedId) || null;
  const activeIndex = project.photos.length ? photoAtTime(project.photos, currentTime) : -1;
  const activePhoto = activeIndex >= 0 ? project.photos[activeIndex] : null;

  const mutateProject = useCallback((mutator: (value: Project) => Project) => {
    setProject((value) => mutator(value));
    setSaved(false);
  }, []);

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
      const audio = audioRef.current;
      const next = project.audio && audio
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
  }, [playing, project.audio, totalDuration]);

  const addPhotos = useCallback(async (paths: string[]) => {
    const accepted = paths.filter((path) => /\.(jpe?g|png|webp|bmp)$/i.test(path));
    if (!accepted.length) return;
    setMessage(`Préparation de ${accepted.length} photo${accepted.length > 1 ? "s" : ""}…`);
    const prepared = await window.videor.preparePhotos(accepted);
    const valid = prepared.filter((item) => item.previewPath);
    const photos: Photo[] = valid.map(({ path, previewPath }) => ({
      id: crypto.randomUUID(),
      path,
      previewPath,
      name: basename(path),
      duration: 5,
      rotation: 0,
      fit: "cover",
      positionX: 50,
      positionY: 50
    }));
    if (!photos.length) {
      setMessage("Aucune photo lisible n’a pu être importée");
      return;
    }
    mutateProject((value) => ({ ...value, photos: [...value.photos, ...photos] }));
    setSelectedId((value) => value || photos[0].id);
    const rejected = prepared.length - valid.length;
    setMessage(
      `${photos.length} photo${photos.length > 1 ? "s" : ""} ajoutée${photos.length > 1 ? "s" : ""}` +
      (rejected ? ` · ${rejected} fichier${rejected > 1 ? "s" : ""} ignoré${rejected > 1 ? "s" : ""}` : "")
    );
  }, [mutateProject]);

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
    mutateProject((value) => ({
      ...value,
      audio: { path, name: basename(path), duration: 0, volume: value.audio?.volume ?? 0.8 }
    }));
    setLibraryTab("audio");
    setCurrentTime(0);
    setMessage("Piste audio chargée");
  };

  const handleFileDrop = async (event: DragEvent) => {
    event.preventDefault();
    const paths = [...event.dataTransfer.files].map(window.videor.filePath);
    const audio = paths.find((path) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(path));
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
    if (audioRef.current && project.audio) audioRef.current.currentTime = next;
    playbackStartRef.current = { wallTime: performance.now(), mediaTime: next };
  };

  const togglePlay = async () => {
    if (!project.photos.length || totalDuration <= 0) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (currentTime >= totalDuration) seek(0);
    playbackStartRef.current = { wallTime: performance.now(), mediaTime: currentTime };
    if (project.audio && audioRef.current) {
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
    const prepared = await window.videor.preparePhotos(value.photos.map((photo) => photo.path));
    const previewByPath = new Map(prepared.map((item) => [item.path, item.previewPath]));
    const hydrated = {
      ...value,
      photos: value.photos.map((photo) => ({
        ...photo,
        previewPath: previewByPath.get(photo.path) || photo.previewPath || null
      }))
    };
    setProject(hydrated);
    setSelectedId(hydrated.photos[0]?.id ?? null);
    setCurrentTime(0);
    setPlaying(false);
    setSaved(true);
    setMessage(notice);
  };

  const openProject = async () => {
    try {
      const result = await window.videor.openProject();
      if (result) await loadProject(result.project as Project, "Projet ouvert");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const importProject = async () => {
    try {
      const result = await window.videor.importProject();
      if (result) await loadProject(result.project as Project, "Projet importé");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const newProject = async () => {
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

  return (
    <div className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={handleFileDrop}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Play size={13} fill="currentColor" /></div>
          <strong>Vidéor</strong>
        </div>
        <nav className="top-actions">
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
          <button className="primary" onClick={() => setExportOpen(true)}>
            <Download size={iconSize} />Exporter la vidéo
          </button>
          <button className="icon-button" title="Paramètres"><Settings size={20} /></button>
        </div>
      </header>

      <main className="workspace">
        <aside className="library panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MÉDIATHÈQUE</span>
              <h2>Vos médias</h2>
            </div>
            <button className="icon-button" onClick={choosePhotos} title="Ajouter des photos">
              <Plus size={19} />
            </button>
          </div>
          <div className="tabs">
            <button className={libraryTab === "photos" ? "active" : ""} onClick={() => setLibraryTab("photos")}>
              <Images size={16} /> Photos <span>{project.photos.length}</span>
            </button>
            <button className={libraryTab === "audio" ? "active" : ""} onClick={() => setLibraryTab("audio")}>
              <Music2 size={16} /> Audio
            </button>
          </div>

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
          ) : (
            <div className="library-content">
              {project.audio ? (
                <div className="audio-card">
                  <div className="audio-icon"><Music2 size={21} /></div>
                  <div>
                    <strong>{project.audio.name}</strong>
                    <span>{formatTime(project.audio.duration)} · piste principale</span>
                  </div>
                  <button className="icon-button danger" onClick={() => mutateProject((value) => ({ ...value, audio: null }))}>
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
          <div className="preview-wrap panel">
            <div className="preview-header">
              <span>Aperçu</span>
              <button className="icon-button" onClick={() => playerRef.current?.requestFullscreen()} title="Plein écran">
                <Expand size={17} />
              </button>
            </div>
            <div className="player" ref={playerRef}>
              {activePhoto ? (
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
                <button className="empty-player" onClick={choosePhotos}>
                  <div><ImagePlus size={32} /></div>
                  <strong>Commencez votre vidéo</strong>
                  <span>Ajoutez des photos pour créer votre montage</span>
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

          <div className="timeline panel">
            <div className="timeline-heading">
              <div>
                <span className="eyebrow">TIMELINE</span>
                <strong>{project.photos.length} photo{project.photos.length !== 1 ? "s" : ""} · {formatTime(totalDuration)}</strong>
              </div>
              <button className="secondary small" onClick={choosePhotos}><Plus size={15} />Ajouter</button>
            </div>
            <div className="timeline-scroll">
              <div className="photo-track">
                {project.photos.length === 0 && (
                  <button className="timeline-empty" onClick={choosePhotos}>
                    Déposez vos photos ici pour commencer
                  </button>
                )}
                {project.photos.map((photo, index) => (
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
              <div className="audio-track">
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
              </div>
              {totalDuration > 0 && (
                <div className="timeline-playhead" style={{ left: `${(currentTime / totalDuration) * 100}%` }}>
                  <span />
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="inspector panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">INSPECTEUR</span>
              <h2>Photo</h2>
            </div>
          </div>
          {selected ? (
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
              <button className="danger-button" onClick={() => removePhoto(selected.id)}>
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

      {project.audio && (
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
          onEnded={() => setPlaying(false)}
        />
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
            <div className="export-summary">
              <div><Images size={20} /><span><b>{project.photos.length}</b> photos</span></div>
              <div><Clock3 size={20} /><span><b>{formatTime(totalDuration)}</b> durée</span></div>
              <div><Music2 size={20} /><span><b>{project.audio ? "Oui" : "Non"}</b> audio</span></div>
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
                  <button className="primary" disabled={!project.photos.length} onClick={runExport}>
                    <Download size={18} />Choisir la destination et exporter
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
