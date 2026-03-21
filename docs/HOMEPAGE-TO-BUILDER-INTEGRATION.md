# Homepage to Builder Integration Guide

## Overview

This document explains how the **BariBali Homepage** passes the selected salad size (S, M, or L) to the **Builder Application**. After merging both projects into a single codebase, the homepage and builder will work together seamlessly.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow](#data-flow)
3. [Integration Points](#integration-points)
4. [Implementation Guide](#implementation-guide)
5. [File Locations](#file-locations)
6. [Testing](#testing)

---

## System Architecture

### Project Structure (After Merge)

```
baribali-project/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Homepage (VideoMenuQueue)
│   │   ├── build/
│   │   │   └── page.tsx          # Builder Application
│   │   ├── favorites/
│   │   ├── fresh/
│   │   ├── login/
│   │   ├── profile/
│   │   ├── recommended/
│   │   └── top/
│   └── components/
│       └── video-menu/
│           ├── VideoQueue.tsx
│           ├── VideoMenuQueue.tsx    # Homepage component
│           ├── hotspot-config.ts
│           └── ...
└── public/
    └── video/
        ├── intro.mp4
        ├── loop1.mp4
        ├── intro_build.mp4
        ├── build_loop1.mp4
        └── build_outro.mp4
```

### Components

| Component | File | Role |
|-----------|------|------|
| **Homepage** | [`src/app/page.tsx`](../src/app/page.tsx) | Landing page with video menu |
| **VideoMenuQueue** | [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx) | Manages video flow and size selection |
| **Builder** | [`src/app/build/page.tsx`](../src/app/build/page.tsx) | Salad builder application |
| **Hotspot Config** | [`src/components/video-menu/hotspot-config.ts`](../src/components/video-menu/hotspot-config.ts) | Size option definitions |

---

## Data Flow

### User Journey

```
1. User Launches App
   ↓
2. Homepage Shows Video Menu
   - intro.mp4 plays
   - loop1.mp4 loops
   ↓
3. User Taps "Build" Card
   - First tap: Preview with glow
   - Second tap: Confirm selection
   ↓
4. Transition Video Plays
   - intro_build.mp4 plays
   ↓
5. Size Selection Appears
   - build_loop1.mp4 loops
   - Three options: Size S, Size M, Size L
   ↓
6. User Taps Size Option
   - First tap: Preview with glow
   - Second tap: Confirm selection
   ↓
7. Transition Video Plays
   - build_outro.mp4 plays
   ↓
8. Navigate to Builder
   - URL: /build?size=S|M|L
   - Selected size passed as parameter
   ↓
9. Builder Loads
   - Reads size parameter
   - Displays size-specific content
   - User builds salad
```

### Parameter Passing

**From Homepage to Builder:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `size` | `S`, `M`, `L` | Selected salad size |

**URL Examples:**
- `/build` - Default (Medium size)
- `/build?size=S` - Small size selected
- `/build?size=M` - Medium size selected
- `/build?size=L` - Large size selected

---

## Integration Points

### Point 1: Homepage Captures Size Selection

**File:** [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)

**What happens:**
1. User taps a size option (S/M/L)
2. Two-tap confirmation pattern:
   - **First tap**: Preview with glow overlay
   - **Second tap**: Confirm selection
3. Selected size ID is stored in state
4. Video queue advances to `build_outro.mp4`

**Key Code Section:**
```typescript
// Lines 106-118 in VideoMenuQueue.tsx
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

### Point 2: Homepage Navigates to Builder

**File:** [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)

**What happens:**
1. Video queue completes (after `build_outro.mp4` finishes)
2. `showBuilder` state becomes `true`
3. Navigate to `/build` with size parameter
4. Builder page loads with selected size

**Current Code (Lines 145-149):**
```typescript
if (showBuilder) {
    useEffect(() => {
        window.location.href = '/build';
    }, []);
    return null;
}
```

**Required Change:**
```typescript
if (showBuilder) {
    useEffect(() => {
        const sizeParam = selectedSize ? `?size=${selectedSize.replace('size', '')}` : '';
        window.location.href = `/build${sizeParam}`;
    }, [selectedSize]);
    return null;
}
```

### Point 3: Builder Receives Size Parameter

**File:** [`src/app/build/page.tsx`](../src/app/build/page.tsx)

**What happens:**
1. Builder page loads
2. Reads `size` parameter from URL
3. Defaults to 'M' (Medium) if not provided
4. Displays size-specific content

**Required Implementation:**
```typescript
'use client';

import { useSearchParams } from 'next/navigation';

export default function BuildPage() {
    const searchParams = useSearchParams();
    const sizeParam = searchParams.get('size') || 'M'; // Default to Medium

    // Use sizeParam to display size-specific content
    // ...
}
```

---

## Implementation Guide

### Step 1: Add Size State to VideoMenuQueue

**File:** [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)

Add state to track the selected size:

```typescript
// Add near line 29
const [selectedSize, setSelectedSize] = useState<string | null>(null);
```

### Step 2: Update Size Selection Handler

**File:** [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)

Modify `handleHotspotTap` to store the selected size:

```typescript
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
```

### Step 3: Update Navigation to Include Size Parameter

**File:** [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx)

Replace the current navigation code (lines 145-149) with:

```typescript
if (showBuilder) {
    useEffect(() => {
        const sizeParam = selectedSize ? `?size=${selectedSize.replace('size', '')}` : '';
        window.location.href = `/build${sizeParam}`;
    }, [selectedSize]);
    return null;
}
```

### Step 4: Update Builder Page to Read Size Parameter

**File:** [`src/app/build/page.tsx`](../src/app/build/page.tsx)

Add URL parameter reading:

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

    // ... rest of your builder code

    return (
        <div style={{ /* your existing styles */ }}>
            {/* Your existing video element */}

            {/* Add size indicator */}
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
        </div>
    );
}
```

---

## File Locations

### Homepage Files

| File | Purpose | Lines to Modify |
|------|---------|-----------------|
| [`src/components/video-menu/VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx) | Video menu with size selection | 29 (add state), 106-118 (update handler), 145-149 (update navigation) |
| [`src/components/video-menu/hotspot-config.ts`](../src/components/video-menu/hotspot-config.ts) | Size hotspot definitions | Reference only |
| [`src/app/page.tsx`](../src/app/page.tsx) | Homepage entry point | Reference only |

### Builder Files

| File | Purpose | Lines to Modify |
|------|---------|-----------------|
| [`src/app/build/page.tsx`](../src/app/build/page.tsx) | Builder application | Add parameter reading, add size display |

### Type Definitions

| File | Purpose |
|------|---------|
| [`src/types/video-menu.ts`](../src/types/video-menu.ts) | TypeScript interfaces (reference) |

---

## Testing

### Test Case 1: Default Size (No Parameter)

1. Navigate directly to `/build`
2. Verify Medium size is selected
3. Verify price shows `₪39`

### Test Case 2: Size S Selection

1. Start from homepage (`/`)
2. Tap "Build" card (first tap → preview, second tap → confirm)
3. Tap Size S (first tap → preview, second tap → confirm)
4. Verify URL becomes `/build?size=S`
5. Verify Small size displays:
   - Name: "Small"
   - Price: `₪29`
   - Portions: "1-2"

### Test Case 3: Size M Selection

1. Same flow as Size S
2. Verify URL becomes `/build?size=M`
3. Verify Medium size displays:
   - Name: "Medium"
   - Price: `₪39`
   - Portions: "2-3"

### Test Case 4: Size L Selection

1. Same flow as Size S
2. Verify URL becomes `/build?size=L`
3. Verify Large size displays:
   - Name: "Large"
   - Price: `₪49`
   - Portions: "3-4"

### Test Case 5: Video Transitions

1. Verify smooth transitions between all videos
2. Verify `build_outro.mp4` plays after size selection
3. Verify navigation happens after outro completes

### Console Logging

Check browser console for expected logs:

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

## Quick Reference for AI Developers

### What You Need to Do

1. **In [`VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx):**
   - Add `selectedSize` state
   - Store size when user confirms selection
   - Pass size as URL parameter when navigating to builder

2. **In [`build/page.tsx`](../src/app/build/page.tsx):**
   - Use `useSearchParams` to read size parameter
   - Display size-specific content
   - Default to Medium if no parameter provided

### Key Code Patterns

**Reading URL Parameter:**
```typescript
import { useSearchParams } from 'next/navigation';
const searchParams = useSearchParams();
const size = searchParams.get('size') || 'M';
```

**Building URL with Parameter:**
```typescript
const sizeParam = selectedSize ? `?size=${selectedSize.replace('size', '')}` : '';
window.location.href = `/build${sizeParam}`;
```

**Size Data Structure:**
```typescript
const SIZE_DATA = {
    S: { name: 'Small', price: '₪29', ... },
    M: { name: 'Medium', price: '₪39', ... },
    L: { name: 'Large', price: '₪49', ... },
};
```

---

## Troubleshooting

### Issue: Size parameter not appearing in URL

**Check:**
- Is `selectedSize` state being set correctly?
- Is the `useEffect` dependency array correct?
- Are you using `window.location.href` correctly?

### Issue: Builder page not reading size parameter

**Check:**
- Is the page a client component (`'use client'`)?
- Are you importing `useSearchParams` from `next/navigation`?
- Is the default value set correctly?

### Issue: Video transitions not smooth

**Check:**
- Are all video files present in `public/video/`?
- Is the canvas bridge working correctly?
- Check browser console for video loading errors

---

## Additional Notes

### Video Assets

Ensure these videos exist in `public/video/`:
- `intro.mp4` - Main menu intro
- `loop1.mp4` - Main menu loop
- `intro_build.mp4` - Transition to size selection
- `build_loop1.mp4` - Size selection loop
- `build_outro.mp4` - Transition to builder

### Size Hotspot Positions

Size options are defined in [`VideoMenuQueue.tsx`](../src/components/video-menu/VideoMenuQueue.tsx:22):

```typescript
const SIZE_HOTSPOTS = [
    { id: 'sizeS', label: 'Size S', dest: '/build', top: 40, left: 1.6, width: 25, height: 27.2 },
    { id: 'sizeM', label: 'Size M', dest: '/build', top: 38.3, left: 35, width: 30, height: 30 },
    { id: 'sizeL', label: 'Size L', dest: '/build', top: 40, left: 72, width: 26.4, height: 26.7 },
];
```

### Debug Mode

Press 'D' to toggle debug mode and see:
- Current queue index
- Waiting state
- Preview state
- Hovered hotspot

---

**Last Updated:** 2026-03-15
**Version:** 1.0
**Status:** Ready for Implementation
