'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
    createOverlayHistoryController,
    type OverlayHistoryController,
    type OverlayHistoryPort,
} from '@/lib/overlayHistory';

interface Options {
    id: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function browserHistoryPort(): OverlayHistoryPort {
    return {
        currentState: () => window.history.state,
        currentUrl: () => window.location.href,
        pushState: (state, url) => window.history.pushState(state, '', url),
        replaceState: (state, url) => window.history.replaceState(state, '', url),
        back: () => window.history.back(),
        listenPopState: listener => {
            const handler = (event: PopStateEvent) => listener(event.state);
            window.addEventListener('popstate', handler);
            return () => window.removeEventListener('popstate', handler);
        },
        listenPageHide: listener => {
            window.addEventListener('pagehide', listener);
            return () => window.removeEventListener('pagehide', listener);
        },
        listenPageShow: listener => {
            window.addEventListener('pageshow', listener);
            return () => window.removeEventListener('pageshow', listener);
        },
    };
}

export function useHistoryBackedOverlay({ id, open, onOpenChange }: Options) {
    const controllerRef = useRef<OverlayHistoryController | null>(null);
    const changeRef = useRef(onOpenChange);
    const openRef = useRef(open);

    useEffect(() => {
        changeRef.current = onOpenChange;
    }, [onOpenChange]);

    useEffect(() => {
        const controller = createOverlayHistoryController(
            browserHistoryPort(),
            id,
            next => changeRef.current(next),
        );
        controllerRef.current = controller;
        controller.sync(openRef.current);

        return () => {
            controller.detach();
            if (controllerRef.current === controller) controllerRef.current = null;
        };
    }, [id]);

    useEffect(() => {
        openRef.current = open;
        controllerRef.current?.sync(open);
    }, [open]);

    const openOverlay = useCallback(() => {
        const controller = controllerRef.current;
        if (controller) controller.open();
        else changeRef.current(true);
    }, []);

    const closeOverlay = useCallback(() => {
        const controller = controllerRef.current;
        if (controller) controller.close();
        else changeRef.current(false);
    }, []);

    return { openOverlay, closeOverlay };
}
