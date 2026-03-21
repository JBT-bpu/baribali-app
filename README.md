# BariBali V3 - Video Homepage System

## Project Overview

BariBali is a mobile-first salad builder app featuring a cinematic video homepage with seamless transitions, parallax border effects, and interactive hotspots.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS animations
- **Video**: HTML5 Video with Canvas Bridge for seamless transitions

## Current Architecture

### Video Queue System

The video system uses a simplified queue-based architecture:

```typescript
const VIDEO_QUEUE: QueueEntry[] = [
  { id: 'menu-intro',    src: '/video/intro.mp4',        loop: false, waitFor: null },
  { id: 'menu-loop',     src: '/video/loop1.mp4',        loop: true,  waitFor: 'card-pick' },
  { id: 'build-intro',   src: '/video/intro_build.mp4',  loop: false, waitFor: null },
  { id: 'build-loop',    src: '/video/build_loop1.mp4',  loop: true,  waitFor: 'size-pick' },
  { id: 'build-outro',   src: '/video/build_outro.mp4',  loop: false, waitFor: null },
];
```

### Video Flow

1. **intro.mp4** → auto-advance
2. **loop1.mp4** → wait for card pick (two-tap confirmation)
3. **intro_build.mp4** → auto-advance
4. **build_loop1.mp4** → wait for size pick (two-tap confirmation)
5. **build_outro.mp4** → show builder UI

### Components

#### Video Queue Engine
- **[`VideoQueue.tsx`](src/components/video-menu/VideoQueue.tsx)**
  - Single video element with built-in canvas bridge
  - Linear queue-based video flow
  - Seamless transitions with frame capture and fade
  - ~180 lines

#### Video Menu Wrapper
- **[`VideoMenuQueue.tsx`](src/components/video-menu/VideoMenuQueue.tsx)**
  - Manages queue state and user interactions
  - Two-tap confirmation pattern for cards
  - Debug mode support (press 'D' to toggle)
  - Integrates with hotspots and glows

#### Parallax Border
- **[`ParallaxBorder.tsx`](src/components/video-menu/ParallaxBorder.tsx)**
  - 3-layer floating vegetable system
  - Gyroscope support for mobile
  - Mouse fallback for desktop
  - Phase-reactive animations
  - 12 border assets (emoji fallback until PNGs exist)

#### Glow Overlay
- **[`GlowOverlay.tsx`](src/components/video-menu/GlowOverlay.tsx)**
  - CSS gradient-based glow effects
  - Shows on card preview/confirm
  - Smooth opacity transitions

#### Hotspot Layer
- **[`HotspotLayer.tsx`](src/components/video-menu/HotspotLayer.tsx)**
  - Invisible clickable areas
  - Debug mode visualization
  - Background tap handling

## Video Files

All videos are 1176x1764 resolution for seamless canvas bridge transitions.

| File | Purpose |
|-------|----------|
| intro.mp4 | Menu intro |
| loop1.mp4 | Menu loop |
| loop2.mp4 | Alternative menu loop |
| intro_build.mp4 | Build intro transition |
| build_loop1.mp4 | Build loop |
| build_outro.mp4 | Build outro |

## Two-Tap Confirmation Pattern

1. **First Tap**: Preview the card (shows glow overlay)
2. **Second Tap**: Confirm selection (advances video queue)

## Parallax Border System

### Layers

| Layer | Assets | Blur | Opacity | Movement | Z-Index |
|--------|---------|-------|----------|-----------|----------|
| Deep | 3 large veggies | 8px | 0.5 | 8px | 0 |
| Mid | 3 medium veggies | 2px | 0.7 | 15px | 1 |
| Front | 3 small + bokeh | 0px | 0.85 | 25px | 3 |

### Phase-Reactive Behaviors

1. **Intro Phase**: All assets drift inward slowly
2. **Loop/Preview Phase**: Gentle ambient floating, assets near hovered card glow brighter
3. **Navigating Phase**: Assets accelerate toward selected card, others scatter outward

## CSS Animations

- `glowPulse` - Glow pulse effect (2s)
- `driftInward` - Parallax drift (3s)
- `scatterOutward` - Scatter effect (1s)
- `ambientFloat` - Gentle float (4s)
- `accelerateToCard` - Scale up effect (0.5s)

## Installation

```bash
npm install
npm run dev
```

## Development

```bash
npm run dev
```

Access at: http://localhost:3000

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
d:/BariBaliV3VIDEOAPP/
├── src/
│   ├── app/
│   │   ├── globals.css          # Global styles and animations
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage (VideoMenuQueue)
│   │   ├── build/page.tsx     # Builder page
│   │   └── calibrator/        # Hotspot calibrator tool
│   ├── components/video-menu/
│   │   ├── VideoQueue.tsx         # Video queue engine
│   │   ├── VideoMenuQueue.tsx     # Menu wrapper
│   │   ├── ParallaxBorder.tsx     # Parallax effects
│   │   ├── GlowOverlay.tsx        # Glow effects
│   │   ├── HotspotLayer.tsx       # Clickable areas
│   │   └── hotspot-config.ts      # Configuration
│   ├── lib/
│   │   └── utils.ts             # Utility functions
│   └── types/
│       └── video-menu.ts        # TypeScript types
├── public/
│   ├── video/                   # Video files
│   └── glows/mobile/          # Glow overlay images
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Debug Mode

Press 'D' key to toggle debug mode overlay showing:
- FPS counter
- Current queue index
- Waiting state
- Preview state
- Hovered hotspot

## RTL Support

The app supports right-to-left (RTL) layout for Hebrew text.

## Mobile-Only Design

Optimized for mobile devices with:
- Touch-friendly hotspots
- Gyroscope-based parallax
- Responsive sizing (420px max width, 9:16 aspect ratio)

## License

Proprietary
