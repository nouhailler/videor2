import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Film,
  ImagePlus,
  Lightbulb,
  Music2,
  Play,
  Scissors,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  HelpTopic,
  HelpTopicId,
  helpTopicById,
  helpTopics,
  onboardingSlides,
  tourSteps
} from "./guidance";

type ContextTipProps = {
  topic: HelpTopicId;
  onOpenHelp: (topic: HelpTopicId) => void;
};

export function ContextTip({ topic, onOpenHelp }: ContextTipProps) {
  const content = helpTopicById(topic);
  return (
    <button className="context-tip" onClick={() => onOpenHelp(topic)}>
      <Lightbulb size={14} />
      <span>{content.tips[0]}</span>
      <b>En savoir plus</b>
    </button>
  );
}

type OnboardingModalProps = {
  open: boolean;
  step: number;
  onStep: (step: number) => void;
  onSkip: () => void;
  onFinish: () => void;
};

export function OnboardingModal({
  open,
  step,
  onStep,
  onSkip,
  onFinish
}: OnboardingModalProps) {
  if (!open) return null;
  const slide = onboardingSlides[step];
  const lastStep = step === onboardingSlides.length - 1;

  return (
    <div className="guidance-backdrop onboarding-backdrop">
      <section className="onboarding-modal" aria-modal="true" role="dialog">
        <div className="onboarding-visual" aria-hidden="true">
          <div className={`onboarding-scene scene-${step}`}>
            <div className="scene-library"><ImagePlus size={25} /><i /><i /><i /></div>
            <div className="scene-preview"><Play size={30} fill="currentColor" /></div>
            <div className="scene-inspector"><span /><span /><span /></div>
            <div className="scene-timeline"><b /><b /><b /><em /></div>
          </div>
        </div>
        <div className="onboarding-copy">
          <div className="onboarding-heading">
            <div>
              <span className="eyebrow">{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
            </div>
            <button className="icon-button" onClick={onSkip} title="Ignorer l’introduction">
              <X size={20} />
            </button>
          </div>
          <p>{slide.description}</p>
          <ul>
            {slide.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
          <div className="onboarding-progress">
            {onboardingSlides.map((_item, index) => (
              <button
                key={index}
                className={index === step ? "active" : ""}
                onClick={() => onStep(index)}
                aria-label={`Étape ${index + 1}`}
              />
            ))}
          </div>
          <div className="onboarding-actions">
            <button className="secondary" onClick={onSkip}>Passer</button>
            <div>
              {step > 0 && (
                <button className="secondary" onClick={() => onStep(step - 1)}>
                  <ChevronLeft size={17} />Précédent
                </button>
              )}
              <button
                className="primary"
                onClick={() => lastStep ? onFinish() : onStep(step + 1)}
              >
                {lastStep ? "Visiter l’interface" : "Continuer"}
                {!lastStep && <ChevronRight size={17} />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type GuidedTourProps = {
  open: boolean;
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function GuidedTour({ open, step, onStep, onClose }: GuidedTourProps) {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const item = tourSteps[step];

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour="${item.target}"]`);
      if (!target) {
        setRect(null);
        return;
      }
      const bounds = target.getBoundingClientRect();
      setRect({
        top: Math.max(8, bounds.top - 5),
        left: Math.max(8, bounds.left - 5),
        width: Math.min(window.innerWidth - 16, bounds.width + 10),
        height: Math.min(window.innerHeight - 16, bounds.height + 10)
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [item.target, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  const lastStep = step === tourSteps.length - 1;
  const cardStyle = rect
    ? {
        top: Math.min(
          window.innerHeight - 230,
          rect.top + rect.height + 14
        ),
        left: Math.min(
          window.innerWidth - 360,
          Math.max(16, rect.left + Math.min(rect.width / 2 - 170, rect.width - 340))
        )
      }
    : undefined;

  return (
    <div className="tour-layer">
      <div className="tour-shade" />
      {rect && <div className="tour-spotlight" style={rect} />}
      <section className="tour-card" style={cardStyle}>
        <div className="tour-count">ÉTAPE {step + 1} SUR {tourSteps.length}</div>
        <h2>{item.title}</h2>
        <p>{item.text}</p>
        <div className="tour-actions">
          <button className="secondary" onClick={onClose}>Quitter</button>
          <div>
            {step > 0 && (
              <button className="secondary" onClick={() => onStep(step - 1)}>
                <ChevronLeft size={16} />
              </button>
            )}
            <button
              className="primary"
              onClick={() => lastStep ? onClose() : onStep(step + 1)}
            >
              {lastStep ? "Terminer" : "Suivant"}
              {!lastStep && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DemoVisual({ topic }: { topic: HelpTopic }) {
  if (topic.demo === "settings") {
    return (
      <div className="demo-stage demo-settings">
        <label><span>Durée des photos</span><b>5,0 s</b></label>
        <div className="demo-segmented"><b>MP4</b><span>WebM</span></div>
        <div className="demo-segmented"><span>720p</span><b>1080p</b><span>4K</span></div>
        <label className="demo-switch"><i /><span>Confirmer les suppressions</span></label>
      </div>
    );
  }
  if (topic.demo === "video") {
    return (
      <div className="demo-stage demo-video">
        <div className="demo-monitor"><Film size={34} /><span>00:08 / 00:20</span></div>
        <div className="demo-video-track">
          <i className="removed start" /><i className="removed middle" />
          <b className="demo-playhead" />
        </div>
        <div className="demo-caption"><Scissors size={15} />Les zones rayées sont retirées</div>
      </div>
    );
  }
  if (topic.demo === "audio") {
    return (
      <div className="demo-stage demo-audio">
        <Music2 size={34} />
        <div className="demo-wave">
          {Array.from({ length: 20 }, (_, index) => (
            <i key={index} style={{ height: `${25 + ((index * 37) % 65)}%` }} />
          ))}
        </div>
        <div className="demo-volume"><span /><b /></div>
        <small>La piste courte est prolongée par du silence</small>
      </div>
    );
  }
  if (topic.demo === "export") {
    return (
      <div className="demo-stage demo-export">
        <div><b>MP4</b><span>H.264 · AAC</span></div>
        <div className="active"><b>1080p</b><span>1920 × 1080</span></div>
        <progress max="100" value="72" />
        <small>Encodage en cours… 72%</small>
      </div>
    );
  }
  if (topic.demo === "preview") {
    return (
      <div className="demo-stage demo-preview">
        <div className="demo-monitor"><Play size={36} fill="currentColor" /></div>
        <div className="demo-controls"><ChevronLeft /><Play fill="currentColor" /><ChevronRight /><i /></div>
      </div>
    );
  }
  if (topic.demo === "inspector") {
    return (
      <div className="demo-stage demo-inspector">
        <div className="demo-photo-card" />
        <label>Durée <b>5,0 s</b></label>
        <div className="demo-slider"><span /></div>
        <div className="demo-segmented"><b>Remplir</b><span>Ajuster</span></div>
      </div>
    );
  }
  if (topic.demo === "timeline") {
    return (
      <div className="demo-stage demo-timeline">
        <div className="demo-clips"><i /><i /><i /><i /></div>
        <b className="demo-playhead" />
        <div className="demo-wave">
          {Array.from({ length: 24 }, (_, index) => (
            <i key={index} style={{ height: `${20 + ((index * 23) % 70)}%` }} />
          ))}
        </div>
      </div>
    );
  }
  if (topic.demo === "photos") {
    return (
      <div className="demo-stage demo-photos">
        <div className="demo-grid"><i /><i /><i /><i /></div>
        <div className="demo-drag"><span>1</span><ChevronRight /><span>3</span></div>
        <small>Glissez pour réorganiser les photos</small>
      </div>
    );
  }
  return (
    <div className="demo-stage demo-projects">
      <div><BookOpen size={28} /><b>Mon projet.videor</b></div>
      <span>Photos, réglages et chemins médias</span>
      <i />
      <small>Sauvegarde automatique activée</small>
    </div>
  );
}

type HelpCenterProps = {
  open: boolean;
  initialTopic: HelpTopicId;
  onClose: () => void;
  onStartTour: () => void;
  onStartOnboarding: () => void;
};

export function HelpCenter({
  open,
  initialTopic,
  onClose,
  onStartTour,
  onStartOnboarding
}: HelpCenterProps) {
  const [selectedId, setSelectedId] = useState<HelpTopicId>(initialTopic);
  const [demoTopic, setDemoTopic] = useState<HelpTopic | null>(null);

  useEffect(() => {
    if (open) setSelectedId(initialTopic);
  }, [initialTopic, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (demoTopic) setDemoTopic(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [demoTopic, onClose, open]);

  const topic = useMemo(() => helpTopicById(selectedId), [selectedId]);
  if (!open) return null;

  return (
    <>
      <div className="help-backdrop" onMouseDown={onClose} />
      <aside className="help-center" aria-label="Centre d’aide">
        <div className="help-heading">
          <div><CircleHelp size={22} /><span><b>Centre d’aide</b><small>Aide contextuelle Vidéor</small></span></div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="help-topic-tabs">
          {helpTopics.map((item) => (
            <button
              key={item.id}
              className={item.id === selectedId ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="help-content">
          <span className="eyebrow">AIDE CONTEXTUELLE</span>
          <h2>{topic.title}</h2>
          <p className="help-summary">{topic.summary}</p>
          <button className="help-demo-button" onClick={() => setDemoTopic(topic)}>
            <Sparkles size={17} />
            <span><b>Voir la démonstration</b><small>Animation sans modifier votre projet</small></span>
            <ChevronRight size={17} />
          </button>
          <h3>Comment faire</h3>
          <ol>
            {topic.steps.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <h3>Conseils</h3>
          <div className="help-tips">
            {topic.tips.map((item) => (
              <div key={item}><Lightbulb size={15} /><span>{item}</span></div>
            ))}
          </div>
        </div>
        <div className="help-footer">
          <button className="secondary" onClick={onStartOnboarding}>Revoir l’introduction</button>
          <button className="primary" onClick={onStartTour}>Lancer la visite guidée</button>
        </div>
      </aside>
      {demoTopic && (
        <div className="guidance-backdrop" onMouseDown={() => setDemoTopic(null)}>
          <section className="demo-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div><span className="eyebrow">DÉMONSTRATION</span><h2>{demoTopic.title}</h2></div>
              <button className="icon-button" onClick={() => setDemoTopic(null)}><X size={20} /></button>
            </div>
            <DemoVisual topic={demoTopic} />
            <div className="demo-explanation">
              <p>{demoTopic.summary}</p>
              <span><Sparkles size={15} />Cette animation est illustrative et ne modifie pas votre projet.</span>
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={() => setDemoTopic(null)}>J’ai compris</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
