---
name: Vidéor
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  panel-gap: 1px
  sidebar-width: 280px
---

## Brand & Style
The design system is engineered for a high-performance Linux video editing environment. It prioritizes deep focus, technical precision, and a reduced cognitive load for creative professionals. The aesthetic is **Corporate / Modern** with a lean toward **Minimalism**, drawing inspiration from the streamlined utility of GNOME and the structural depth of KDE Plasma.

The brand personality is authoritative yet unobtrusive. It positions the software as a powerful tool that recedes into the background, allowing the user's content to take center stage. The emotional response should be one of stability, speed, and creative flow.

## Colors
The palette is built on a "Deep Charcoal" foundation to minimize eye strain during long editing sessions. 

- **Background (#121212):** The canvas for the entire application.
- **Surface Tiers:** Use `#1E1E1E` for primary panels (Timeline, Media Pool) and `#252525` for elevated elements (toolbars, active inspector fields).
- **Electric Indigo (#6366F1):** The primary action color for buttons, selections, and progress indicators.
- **Rose Playhead (#F43F5E):** A high-visibility secondary accent specifically reserved for the timeline playhead and critical recording states to ensure it is never lost against the video content.
- **Text:** High-contrast `Off-White` for readability, with `Slate Grey` used for secondary metadata to maintain visual hierarchy.

## Typography
This design system utilizes **Inter** for all UI elements to ensure maximum legibility at small sizes. For technical metadata, timecodes, and frame counts, **JetBrains Mono** is employed to provide a rhythmic, monospaced clarity essential for precision editing.

- **Headlines:** Used sparingly for panel titles and modal headers.
- **Body:** Standard for descriptions and project notes.
- **Labels (Monospaced):** Used for timecodes (00:00:00:00), file sizes, and duration overlays on thumbnails.
- **Mobile scaling:** As a desktop-first application, typography remains consistent across sizes, though sidebars may collapse into icon-only views on smaller displays.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy within dynamic containers. The interface is divided into functional "Zones" (Media, Player, Inspector, Timeline) separated by 1px borders to mimic a seamless, tiled window manager experience.

- **The 4px Rule:** All spacing between internal elements (icons within a toolbar, labels next to inputs) must be a multiple of 4px.
- **Panel Gaps:** Use 1px "gutters" (effectively the border color of the panels) to create a sharp, architectural division of space.
- **Safe Margins:** Use 16px internal padding for modals and inspector panels to prevent content from feeling cramped against the panel edges.

## Elevation & Depth
Depth in this design system is communicated through **Tonal Layers** rather than heavy shadows. This maintains a "flat-plus" aesthetic consistent with modern Linux environments.

- **Level 0 (Base):** `#121212` for the main application background.
- **Level 1 (Panels):** `#1E1E1E` with a subtle 1px border of `#2D2D2D`.
- **Level 2 (Popovers/Modals):** `#252525` with a soft 12px ambient shadow (Black, 40% opacity) to distinguish floating elements from the workspace.
- **Active State:** Elements being dragged or selected receive a subtle inner glow using the Primary color at 10% opacity.

## Shapes
The shape language is **Soft** but disciplined. A 4px (`0.25rem`) border radius is the standard for almost all UI components to retain a professional, "tooled" appearance.

- **Buttons & Inputs:** 4px radius.
- **Media Cards:** 8px (`rounded-lg`) for the outer container to slightly soften the media library view.
- **Timeline Clips:** 2px radius—sharp enough to look like precise blocks of data, but soft enough to avoid a "harsh" brutalist feel.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Electric Indigo with white text.
- **Secondary Action:** Ghost style with a 1px Slate Grey border.
- **Form Elements:** Inputs use the `#252525` surface color. Focused states replace the border with Electric Indigo.

### Media Library Cards
- Cards feature a "vignette" style thumbnail. 
- Hovering over a card reveals a Play icon overlay and technical metadata (resolution, frame rate) in the monospaced label font.

### Timeline Vignettes
- Clip thumbnails should have a 1px inner border to separate them from adjacent clips. 
- The "Active" clip is indicated by a 2px Electric Indigo outline.
- Audio waveforms are rendered in a desaturated version of the primary color.

### Toolbar
- Unified top bar with a `#252525` background.
- Icons are 20px, stroke-based (2px weight), with a 12px padding hit-box.

### Video Player Controls
- Transport controls (Play, Pause, Scrub) are centered. 
- The scrubber bar uses the Rose Playhead color for the current position, with a Slate Grey background for the buffered/remaining duration.

### Modal Dialogs
- Centered layout with a header, body, and footer action row.
- Background dimming uses a 60% black overlay to maintain focus on the task.