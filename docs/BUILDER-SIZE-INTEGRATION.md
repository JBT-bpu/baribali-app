# Builder Size Integration Guide

## Overview

This document explains how to connect the BariBali salad builder to the size selection options (S, M, L) that users choose from the video menu system. This guide is intended for AI developers working on the builder functionality.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Video Flow System](#video-flow-system)
3. [Size Selection System](#size-selection-system)
4. [Integration Requirements](#integration-requirements)
5. [Implementation Steps](#implementation-steps)
6. [Code Examples](#code-examples)
7. [Testing Checklist](#testing-checklist)

---

## Current Architecture

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **Video Queue Engine** | [`src/components/video-menu/VideoQueue.tsx`](../src/components/video-menu/VideoQueue.tsx) | Manages video playback with seamless transitions |
| **Video Menu Wrapper** | [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx) | Handles user interactions and two-tap confirmation |
| **Hotspot Config** | [`src/components/video-menu/hotspot-config.ts`](../src/components/video-menu/hotspot-config.ts) | Defines clickable areas and transitions |
| **Builder Page** | [`src/app/build/page.tsx`](../src/app/build/page.tsx) | Main builder interface (currently under construction) |
| **Type Definitions** | [`src/types/video-menu.ts`](../src/types/video-menu.ts) | TypeScript interfaces for the video system |

### Video Flow

```
User Launches App
    ↓
intro.mp4 (auto-advance)
    ↓
loop1.mp4 (wait for card pick)
    ↓
User taps "Build" card
    ↓
intro_build.mp4 (auto-advance)
    ↓
build_loop1.mp4 (wait for size pick)
    ↓
User taps size option (S/M/L)
    ↓
build_outro.mp4 (auto-advance)
    ↓
Navigate to /build page with selected size
```

---

## Video Flow System

### Queue Configuration

The video queue is defined in [`VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx:13):

```typescript
const VIDEO_QUEUE: QueueEntry[] = [
    { id: 'menu-intro',    src: '/video/intro.mp4',        loop: false, waitFor: null },
    { id: 'menu-loop',     src: '/video/loop1.mp4',        loop: true,  waitFor: 'card-pick' },
    { id: 'build-intro',   src: '/video/intro_build.mp4',  loop: false, waitFor: null },
    { id: 'build-loop',    src: '/video/build_loop1.mp4',  loop: true,  waitFor: 'size-pick' },
    { id: 'build-outro',   src: '/video/build_outro.mp4',  loop: false, waitFor: null },
];
```

### Wait States

The system pauses at specific points waiting for user interaction:

| Wait State | Video | Trigger |
|------------|-------|---------|
| `card-pick` | loop1.mp4 | User selects a main menu card (build/recommended/login) |
| `size-pick` | build_loop1.mp4 | User selects a salad size (S/M/L) |

---

## Size Selection System

### Size Hotspots

Size options are defined in [`VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx:22):

```typescript
const SIZE_HOTSPOTS = [
    { id: 'sizeS', label: 'Size S', dest: '/build', top: 40, left: 1.6, width: 25, height: 27.2 },
    { id: 'sizeM', label: 'Size M', dest: '/build', top: 38.3, left: 35, width: 30, height: 30 },
    { id: 'sizeL', label: 'Size L', dest: '/build', top: 40, left: 72, width: 26.4, height: 26.7 },
];
```

### Two-Tap Confirmation Pattern

1. **First Tap**: Preview the size option (shows glow overlay)
2. **Second Tap**: Confirm selection (advances video queue to build_outro.mp4)

### Current Behavior

When a user confirms a size selection:
- The video queue advances to `build_outro.mp4`
- After the outro completes, the app redirects to `/build`
- **Currently**: The size information is NOT passed to the builder page
- **Needed**: Pass the selected size as a parameter

---

## Integration Requirements

### What Needs to Change

1. **Pass Size Parameter**: When navigating to `/build`, include the selected size (S/M/L)
2. **Receive Size Parameter**: The builder page needs to read the size parameter
3. **Size-Specific Content**: Builder should display different content based on size
4. **URL Structure**: Support both `/build` (default) and `/build?size=S|M|L`

### Data Flow

```
User taps size option (e.g., sizeM)
    ↓
VideoMenuQueue captures the selection
    ↓
Queue advances to build_outro.mp4
    ↓
Queue completes → navigate to /build?size=M
    ↓
Builder page reads size parameter
    ↓
Builder displays size-specific content
```

---

## Implementation Steps

### Step 1: Modify VideoMenuQueue to Pass Size Parameter

**File**: [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)

**Current Code** (lines 145-149):
```typescript
if (showBuilder) {
    useEffect(() => {
        window.location.href = '/build';
    }, []);
    return null;
}
```

**Required Changes**:
1. Add state to track selected size
2. Pass size parameter when navigating

### Step 2: Update Size Hotspot Handler

**File**: [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)

**Current Code** (lines 106-118):
```typescript
const handleHotspotTap = useCallback((id: string) => {
    if (!waitingFor) return;

    if (previewId === id) {
        // SECOND TAP → advance queue
        console.log('[VideoMenuQueue] Second tap on:', id, '- advancing queue');
        advanceQueue();
    } else {
        // FIRST TAP → preview
        console.log('[VideoMenuQueue] First tap on:', id, '- showing preview');
        setPreviewId(id);
    }
}, [waitingFor, previewId, advanceQueue]);
```

**Required Changes**:
1. Store the selected size ID when confirming
2. Pass this to the navigation handler

### Step 3: Modify Builder Page to Receive Size Parameter

**File**: [`src/app/build/page.tsx`](../src/app/build/page.tsx)

**Current Code** (lines 1-10):
```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { VIDEO_PATHS, BUILD_LOOPS } from '@/components/video-menu/hotspot-config';

export default function BuildPage() {
    const [videoReady, setVideoReady] = useState(false);
    const [currentLoopIndex, setCurrentLoopIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
```

**Required Changes**:
1. Read URL search parameters
2. Extract the `size` parameter
3. Store selected size in state
4. Display size-specific content

### Step 4: Add Size-Specific Content

**File**: [`src/app/build/page.tsx`](../src/app/build/page.tsx)

**Required Changes**:
1. Define size-specific data (prices, portions, descriptions)
2. Render different UI based on selected size
3. Show size indicator in the builder interface

---

## Code Examples

### Example 1: Modified VideoMenuQueue Navigation

```typescript
// Add state for selected size
const [selectedSize, setSelectedSize] = useState<string | null>(null);

// Update handleHotspotTap to store size
const handleHotspotTap = useCallback((id: string) => {
    if (!waitingFor) return;

    if (previewId === id) {
        // SECOND TAP → advance queue and store size
        console.log('[VideoMenuQueue] Second tap on:', id, '- advancing queue');
        if (waitingFor === 'size-pick') {
            setSelectedSize(id); // Store 'sizeS', 'sizeM', or 'sizeL'
        }
        advanceQueue();
    } else {
        // FIRST TAP → preview
        console.log('[VideoMenuQueue] First tap on:', id, '- showing preview');
        setPreviewId(id);
    }
}, [waitingFor, previewId, advanceQueue]);

// Update navigation to include size parameter
if (showBuilder) {
    useEffect(() => {
        const sizeParam = selectedSize ? `?size=${selectedSize.replace('size', '')}` : '';
        window.location.href = `/build${sizeParam}`;
    }, [selectedSize]);
    return null;
}
```

### Example 2: Builder Page with Size Parameter

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { VIDEO_PATHS, BUILD_LOOPS } from '@/components/video-menu/hotspot-config';

// Size-specific data
const SIZE_DATA = {
    S: {
        name: 'Small',
        portions: '1-2',
        price: '₪29',
        description: 'Perfect for a light lunch',
        calories: 350,
    },
    M: {
        name: 'Medium',
        portions: '2-3',
        price: '₪39',
        description: 'Great for sharing',
        calories: 500,
    },
    L: {
        name: 'Large',
        portions: '3-4',
        price: '₪49',
        description: 'Family size',
        calories: 700,
    },
};

export default function BuildPage() {
    const searchParams = useSearchParams();
    const sizeParam = searchParams.get('size') || 'M'; // Default to Medium

    const [videoReady, setVideoReady] = useState(false);
    const [currentLoopIndex, setCurrentLoopIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const selectedSize = SIZE_DATA[sizeParam as keyof typeof SIZE_DATA] || SIZE_DATA.M;

    // ... rest of the component

    return (
        <div style={{ /* existing styles */ }}>
            <video
                ref={videoRef}
                /* existing video props */
            />

            {/* Size indicator */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '10px 15px',
                borderRadius: '8px',
                zIndex: 10,
            }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {selectedSize.name}
                </div>
                <div style={{ fontSize: '18px', color: '#4ade80' }}>
                    {selectedSize.price}
                </div>
            </div>

            {/* Size details */}
            <div style={{
                position: 'absolute',
                bottom: '100px',
                left: '20px',
                right: '20px',
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: '#fff',
                padding: '15px',
                borderRadius: '10px',
                zIndex: 10,
            }}>
                <p>{selectedSize.description}</p>
                <p>Portions: {selectedSize.portions}</p>
                <p>Calories: {selectedSize.calories}</p>
            </div>
        </div>
    );
}
```

### Example 3: Size-Specific Video Selection

```typescript
// In builder page, select video based on size
const getVideoForSize = (size: string): string => {
    const sizeVideos: Record<string, string> = {
        S: '/video/build_loop_small.mp4',
        M: '/video/build_loop_medium.mp4',
        L: '/video/build_loop_large.mp4',
    };
    return sizeVideos[size] || BUILD_LOOPS[0];
};

// In useEffect
useEffect(() => {
    const video = videoRef.current;
    if (video) {
        const videoSrc = getVideoForSize(sizeParam);
        video.src = videoSrc;
        video.load();
        // ... rest of the effect
    }
}, [sizeParam]);
```

---

## Testing Checklist

### Manual Testing Steps

- [ ] **Test Default Size**
  - Navigate directly to `/build` (no size parameter)
  - Verify default size (Medium) is selected
  - Verify correct price and description display

- [ ] **Test Size S Selection**
  - Start from home page
  - Tap "Build" card (first tap → preview, second tap → confirm)
  - Tap Size S (first tap → preview, second tap → confirm)
  - Verify URL becomes `/build?size=S`
  - Verify Small size data displays correctly

- [ ] **Test Size M Selection**
  - Same flow as Size S
  - Verify URL becomes `/build?size=M`
  - Verify Medium size data displays correctly

- [ ] **Test Size L Selection**
  - Same flow as Size S
  - Verify URL becomes `/build?size=L`
  - Verify Large size data displays correctly

- [ ] **Test Video Transitions**
  - Verify smooth transitions between all videos
  - Verify build_outro.mp4 plays after size selection
  - Verify navigation happens after outro completes

- [ ] **Test Two-Tap Pattern**
  - Verify first tap shows glow preview
  - Verify second tap confirms and advances queue
  - Verify tapping outside resets preview

- [ ] **Test Debug Mode**
  - Press 'D' to toggle debug mode
  - Verify debug overlay shows current state
  - Verify queue index updates correctly

### Console Logging

The system logs important events. Check the browser console for:

```
[VideoMenuQueue] Waiting for: card-pick
[VideoMenuQueue] First tap on: build - showing preview
[VideoMenuQueue] Second tap on: build - advancing queue
[VideoMenuQueue] Waiting for: size-pick
[VideoMenuQueue] First tap on: sizeM - showing preview
[VideoMenuQueue] Second tap on: sizeM - advancing queue
[VideoMenuQueue] Queue complete, showing builder UI
```

---

## File Reference Summary

### Files to Modify

| File | Changes Required |
|------|------------------|
| [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx) | Add size state, pass size parameter on navigation |
| [`src/app/build/page.tsx`](../src/app/build/page.tsx) | Read size parameter, display size-specific content |

### Files to Reference

| File | Purpose |
|------|---------|
| [`src/components/video-menu/VideoQueue.tsx`](../src/components/video-menu/VideoQueue.tsx) | Video queue engine (reference only) |
| [`src/components/video-menu/hotspot-config.ts`](../src/components/video-menu/hotspot-config.ts) | Hotspot definitions (reference only) |
| [`src/types/video-menu.ts`](../src/types/video-menu.ts) | Type definitions (reference only) |

---

## Additional Notes

### Video Assets

Current video assets in [`public/video/`](../public/video/):
- `intro.mp4` - Main menu intro
- `loop1.mp4` - Main menu loop
- `loop2.mp4` - Alternative menu loop
- `intro_build.mp4` - Transition to size selection
- `build_loop1.mp4` - Size selection loop
- `build_outro.mp4` - Transition to builder

**Future Enhancement**: Create size-specific loop videos:
- `build_loop_small.mp4`
- `build_loop_medium.mp4`
- `build_loop_large.mp4`

### URL Parameter Format

The builder page should support:
- `/build` - Default (Medium size)
- `/build?size=S` - Small size
- `/build?size=M` - Medium size
- `/build?size=L` - Large size

### State Management

For more complex state management, consider:
- Using React Context for builder state
- Implementing URL-based state with `useSearchParams`
- Adding local storage for persisting selections

---

## Quick Start for AI Developers

1. **Read the current implementation** in [`VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)
2. **Understand the video flow** from the queue configuration
3. **Modify the navigation** to pass the size parameter
4. **Update the builder page** to receive and use the size
5. **Test all three sizes** using the checklist above

---

## Support

For questions about:
- **Video system**: Review [`README.md`](../README.md)
- **Component architecture**: Check type definitions in [`src/types/video-menu.ts`](../src/types/video-menu.ts)
- **Hotspot configuration**: See [`src/components/video-menu/hotspot-config.ts`](../src/components/video-menu/hotspot-config.ts)

---

**Last Updated**: 2026-03-15
**Version**: 1.0
