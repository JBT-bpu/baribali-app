# Particle System Enhancements Plan

## Overview

This plan details the enhancements to make the particle system truly diegetic and intentional, based on the detailed feedback. The system will feature dual populations (LensField and BorderField), motion archetypes, energy-driven behavior, and micro-signatures for each action.

---

## 1. Diegetic Overlay Enhancement

### 1.1 Two Populations: BorderField and LensField

**Current State:** Single particle population rendered over entire canvas.

**Enhancement:** Split into two distinct populations:

| Population | Types | Purpose | Alpha Cap |
|------------|-------|---------|-----------|
| **BorderField** | All types (bokehSmall, bokehMedium, bokehLarge, firefly, veggie) | Rich border effects with small sparkles | No cap (normal opacity) |
| **LensField** | bokehMedium, bokehLarge only | Ultra-subtle lens overlay over video | 0.02–0.09 effective |

**Implementation:**
- Add `population` property to [`Particle`](src/components/video-menu/particles/ParticleTypes.ts:89) interface: `'border' | 'lens'`
- Modify [`initializeParticles()`](src/components/video-menu/particles/createParticle.ts:235) to create separate populations
- Update [`animateFrame()`](src/components/video-menu/particles/animationLoop.ts:104) to filter particles by population when rendering
- LensField particles use `isLensOverlay=true` flag in [`renderBokeh()`](src/components/video-menu/particles/renderers.ts:54)

**Code Changes:**
```typescript
// ParticleTypes.ts - Add population property
export interface Particle {
    // ... existing properties
    population: 'border' | 'lens'; // NEW
}

// createParticle.ts - Set population based on type
p.population = (type === 'bokehMedium' || type === 'bokehLarge') ? 'lens' : 'border';

// animationLoop.ts - Render in two passes
// Pass 1: Render BorderField particles
state.particles.filter(p => p.population === 'border').forEach(p => { ... });
// Pass 2: Render LensField particles with alpha cap
state.particles.filter(p => p.population === 'lens').forEach(p => { ... });
```

### 1.2 Edge-Weight Radial Mask

**Current State:** Lens overlay applies uniformly across video area.

**Enhancement:** Apply radial gradient mask after drawing lens layer:
- Strongest at edges (full opacity)
- Lightest at center (reduced opacity)
- Creates "lens" feel, not "overlay" feel

**Implementation:**
- Modify [`applyEdgeMask()`](src/components/video-menu/particles/renderers.ts:187) to use `destination-in` composite operation
- Create radial gradient from center (transparent) to edges (opaque)

**Code Changes:**
```typescript
// renderers.ts - Update applyEdgeMask
export function applyEdgeMask(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist);
    gradient.addColorStop(0, 'rgba(0,0,0,0.15)');   // Center: 15% visible
    gradient.addColorStop(0.4, 'rgba(0,0,0,0.4)');  // Mid: 40% visible
    gradient.addColorStop(1, 'rgba(0,0,0,1)');     // Edges: 100% visible

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}
```

### 1.3 Z-Order Discipline

**Current State:** All particles rendered in single layer.

**Enhancement:** Ensure proper layering:
```
Video (bottom)
  ↓
Lens bokeh overlay (over video, under UI)
  ↓
BorderField particles
  ↓
UI (top)
```

**Implementation:**
- Update [`ParallaxBorder.tsx`](src/components/video-menu/ParallaxBorder.tsx:50) to render in correct order
- Lens canvas layer between video and UI
- Border canvas layer above lens layer

---

## 2. Motion Archetypes

### 2.1 Three Motion Archetypes

**Current State:** Only pull and burst functions available.

**Enhancement:** Add three motion archetypes:

| Archetype | Description | Use Case |
|-----------|-------------|----------|
| **Swirl** | Particles rotate tangentially around a point | Selection feels magical |
| **Inhale** | Particles pull toward center | Transition / loading |
| **Exhale** | Particles burst outward | Outro / confirm |

**Implementation:**
- Add [`swirlParticles()`](src/components/video-menu/particles/energyActions.ts) function

**Code Changes:**
```typescript
// energyActions.ts - Add swirl function
export function swirlParticles(
    particles: Particle[],
    center: { x: number; y: number },
    strength: number = 1
): void {
    for (const p of particles) {
        if (Math.random() > 0.6) continue; // ~40% affected

        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const inv = 1 / (Math.sqrt(dx * dx + dy * dy) + 60);
        const tangX = -dy * inv;
        const tangY = dx * inv;

        const s = 90 * (1 - p.depth) * strength;
        p.vx += tangX * s;
        p.vy += tangY * s;
    }
}
```

### 2.2 Event to Archetype Mapping

**Current State:** Simple impulse-based responses.

**Enhancement:** Map events to motion archetypes:

| Event | Motion | Impulse |
|-------|--------|---------|
| hover | Gentle pull + tiny swirl | +0.12 |
| select | Retarget + swirl | +0.35 |
| continue | Inhale → 250ms later exhale | +0.55 |
| phase intro | Inhale | +0.7 |
| phase outro | Exhale | +0.7 |

**Implementation:**
- Update [`eventHooks.ts`](src/components/video-menu/particles/eventHooks.ts) with motion archetypes
- Add `setTimeout` for inhale→exhale combo on continue

**Code Changes:**
```typescript
// eventHooks.ts - Update event hooks
export function onCardHover(...) {
    impulse(energyState, 0.12);
    if (cardId && videoRect) {
        const card = getCardCanvasPosition(cardId, videoRect);
        if (card) {
            pullParticles(particles, card, 0.5);
            swirlParticles(particles, card, 0.2); // NEW: tiny swirl
        }
    }
}

export function onCardSelect(...) {
    impulse(energyState, 0.35);
    if (cardId && videoRect) {
        const card = getCardCanvasPosition(cardId, videoRect);
        if (card) {
            retargetParticles(particles, card, 1.0);
            swirlParticles(particles, card, 1.0); // NEW: full swirl
        }
    }
}

export function onContinue(...) {
    impulse(energyState, 0.55);
    if (!videoRect) return;

    const center = { x: videoRect.centerX, y: videoRect.centerY };

    // Inhale
    pullParticles(particles, center, 1.2);

    // Exhale after 250ms (cinematic transition breath)
    setTimeout(() => {
        burstParticles(particles, center, 1.5);
    }, 250);
}
```

---

## 3. Energy-Driven Behavior

### 3.1 Time-Windowed Activity

**Current State:** Energy decays instantly after impulse.

**Enhancement:** Add activity windows:
- `activeUntil` timestamp set on select/continue
- During active window: allow more retarget and velocity kicks
- Creates "period of time" feel

**Implementation:**
- Add `activeUntil` to [`EnergyState`](src/components/video-menu/particles/energySystem.ts:12)
- Set `activeUntil` in event hooks
- Check `activeUntil` in [`updateParticlePhysics()`](src/components/video-menu/particles/energyActions.ts:106)

**Code Changes:**
```typescript
// energySystem.ts - Add activeUntil
export interface EnergyState {
    energy: number;
    energyVel: number;
    lastUpdate: number;
    activeUntil: number; // NEW: Timestamp until activity window ends
}

// energyActions.ts - Use active window
export function updateParticlePhysics(...) {
    const isActive = currentTime < energyState.activeUntil;
    const activityMultiplier = isActive ? 1.5 : 1.0;

    // ... rest of function uses activityMultiplier
}
```

### 3.2 Energy-Driven Retarget Probability

**Current State:** Fixed ~45% retarget rate.

**Enhancement:** Retarget probability increases with energy:
- Idle: 2–10% slowly re-seed over time
- Burst: 30–70% re-anchor

**Implementation:**
- Update [`retargetParticles()`](src/components/video-menu/particles/energyActions.ts:20) to use energy

**Code Changes:**
```typescript
// energyActions.ts - Energy-driven retarget
export function retargetParticles(
    particles: Particle[],
    target: { x: number; y: number },
    strength: number = 1,
    energy: number = 0 // NEW
): void {
    const reseedChance = 0.02 + 0.28 * energy; // 2% → 30% per action tick

    for (const p of particles) {
        if (Math.random() > reseedChance) continue;

        // ... rest of function
    }
}
```

### 3.3 Depth-Dependent Size Response

**Current State:** Size changes uniformly across all particles.

**Enhancement:** Size changes mostly on near particles (small/medium):
- Big bokeh wash stays stable
- Near particles get size kicks

**Implementation:**
- Update size target calculation in [`retargetParticles()`](src/components/video-menu/particles/energyActions.ts:20)

**Code Changes:**
```typescript
// energyActions.ts - Depth-dependent size kick
export function retargetParticles(...) {
    // ... inside loop
    const sizeKick = (1 - p.depth) * (0.2 + 0.6 * energy);
    p.sizeTarget = p.baseSize * (1 + sizeKick * (Math.random() * 0.6 - 0.2));
}
```

---

## 4. Micro-Signatures

### 4.1 Action-Specific Visual Signatures

**Current State:** All actions look similar.

**Enhancement:** Add unique signatures per action:

| Action | Signature |
|--------|-----------|
| hover | Slight brighten near hovered card (local exposure bump) |
| select | Subtle ring bokeh pulse (two big bokehs expand + fade) |
| continue | Short light leak sweep + inhale/exhale |
| intro/outro | Global bloom changes |

**Implementation:**
- Add signature functions to [`eventHooks.ts`](src/components/video-menu/particles/eventHooks.ts)
- Add `ringBokehPulse()` function for select
- Add `lightLeakSweep()` function for continue
- Add `localExposureBump()` function for hover

**Code Changes:**
```typescript
// eventHooks.ts - Add signature functions
function localExposureBump(
    particles: Particle[],
    card: { x: number; y: number },
    radius: number
): void {
    // Increase opacity for particles near card
    for (const p of particles) {
        const dx = p.x - card.x;
        const dy = p.y - card.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
            p.opacity = Math.min(1, p.opacity * 1.3);
        }
    }
}

function ringBokehPulse(
    particles: Particle[],
    center: { x: number; y: number }
): void {
    // Create two expanding ring bokeh particles
    // They expand and fade over time
}

function lightLeakSweep(): void {
    // Trigger light leak animation in ParallaxBorder
    // This would need a light leak state in the component
}

// Update event hooks to use signatures
export function onCardHover(...) {
    // ... existing code
    if (card) {
        localExposureBump(particles, card, 150); // NEW: local exposure bump
    }
}
```

---

## 5. Mobile Optimization

### 5.1 LensField-Only on Mobile

**Current State:** All particles rendered on mobile.

**Enhancement:** On mobile:
- Run LensField only
- 8–14 bokeh sprites max
- DPR cap 1.25
- No blur filters
- Energy still works (just fewer particles)

**Implementation:**
- Update [`ParallaxBorder.tsx`](src/components/video-menu/ParallaxBorder.tsx:50) to detect mobile
- Reduce particle count on mobile
- Limit to bokehMedium and bokehLarge on mobile

**Code Changes:**
```typescript
// ParallaxBorder.tsx - Mobile detection
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

// createParticle.ts - Adjust counts for mobile
export function initializeParticles(...) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    Object.entries(PARTICLE_TYPES).forEach(([type, config]) => {
        // On mobile: only bokehMedium and bokehLarge, reduced counts
        if (isMobile) {
            if (type !== 'bokehMedium' && type !== 'bokehLarge') return;
            config.count = Math.floor(config.count * 0.3); // 30% of normal count
        }

        // ... rest of function
    });
}
```

---

## 6. Critical Bug Fixes

### 6.1 Energy dt in Seconds

**Current State:** Need to verify dt is in seconds, not ms.

**Check:** In [`updateEnergy()`](src/components/video-menu/particles/energySystem.ts:55):
```typescript
if (dt === undefined) {
    dt = (currentTime - state.lastUpdate) / 1000; // ✓ Divides by 1000 = seconds
}
```

**Status:** ✓ Correct - dt is in seconds

### 6.2 Anchor Initialization

**Current State:** Need to verify ax/ay start at spawn position.

**Check:** In [`createParticle()`](src/components/video-menu/particles/createParticle.ts:24):
```typescript
p.ax = x; // ✓ Anchor starts at spawn position
p.ay = y; // ✓ Anchor starts at spawn position
```

**Status:** ✓ Correct - anchors initialize at spawn position

### 6.3 Blend State Resets

**Current State:** Need to ensure screen composite is reset after bokeh.

**Check:** In [`renderBokeh()`](src/components/video-menu/particles/renderers.ts:54):
```typescript
ctx.globalCompositeOperation = 'screen'; // Set to screen
// ... draw bokeh
ctx.globalAlpha = 1; // ✓ Reset alpha
ctx.globalCompositeOperation = 'source-over'; // ✓ Reset composite
```

**Status:** ✓ Correct - blend state is reset

---

## Implementation Order

1. **Diegetic Overlay Enhancement**
   - Add population property to Particle interface
   - Update createParticle to set population
   - Update animateFrame for two-pass rendering
   - Update applyEdgeMask for radial gradient
   - Update ParallaxBorder layer order

2. **Motion Archetypes**
   - Add swirlParticles function
   - Update event hooks with swirl
   - Add inhale→exhale combo for continue

3. **Energy-Driven Behavior**
   - Add activeUntil to EnergyState
   - Update retargetParticles with energy probability
   - Update retargetParticles with depth-dependent size
   - Update updateParticlePhysics with activity multiplier

4. **Micro-Signatures**
   - Add localExposureBump function
   - Add ringBokehPulse function
   - Add lightLeakSweep function
   - Update event hooks to use signatures

5. **Mobile Optimization**
   - Add mobile detection
   - Update initializeParticles for mobile counts
   - Limit to LensField on mobile

6. **Verification**
   - Verify energy dt is correct
   - Verify anchor initialization
   - Verify blend state resets
   - Test complete system

---

## Files to Modify

| File | Changes |
|------|---------|
| [`ParticleTypes.ts`](src/components/video-menu/particles/ParticleTypes.ts) | Add `population` property to Particle interface |
| [`createParticle.ts`](src/components/video-menu/particles/createParticle.ts) | Set population, add mobile detection |
| [`energySystem.ts`](src/components/video-menu/particles/energySystem.ts) | Add `activeUntil` to EnergyState |
| [`energyActions.ts`](src/components/video-menu/particles/energyActions.ts) | Add swirlParticles, update retargetParticles, update updateParticlePhysics |
| [`eventHooks.ts`](src/components/video-menu/particles/eventHooks.ts) | Add signature functions, update event hooks |
| [`renderers.ts`](src/components/video-menu/particles/renderers.ts) | Update applyEdgeMask for radial gradient |
| [`animationLoop.ts`](src/components/video-menu/particles/animationLoop.ts) | Two-pass rendering for populations |
| [`ParallaxBorder.tsx`](src/components/video-menu/ParallaxBorder.tsx) | Layer order, mobile detection |

---

## Testing Checklist

- [ ] BorderField renders with full opacity
- [ ] LensField renders with alpha cap (0.02–0.09)
- [ ] Edge mask is strongest at edges, lightest at center
- [ ] Z-order is correct (video → lens → border → UI)
- [ ] Swirl motion works correctly
- [ ] Inhale→exhale combo triggers on continue
- [ ] Retarget probability increases with energy
- [ ] Size kicks affect near particles more
- [ ] Activity window allows more retarget/velocity
- [ ] Local exposure bump on hover
- [ ] Ring bokeh pulse on select
- [ ] Light leak sweep on continue
- [ ] Mobile shows LensField only (8–14 particles)
- [ ] Energy decays correctly (dt in seconds)
- [ ] Anchors initialize at spawn position
- [ ] Blend state resets after screen compositing
