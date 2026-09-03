import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    createOverlayHistoryController,
    ownsOverlayHistoryMarker,
    withOverlayHistoryMarker,
    withoutOverlayHistoryMarker,
    type OverlayHistoryPort,
} from '../../src/lib/overlayHistory';

interface Entry {
    state: Record<string, unknown>;
    url: string;
}

class FakeHistoryPort implements OverlayHistoryPort {
    entries: Entry[] = [{ state: { __NA: true, tree: ['home'] }, url: '/home2' }];
    index = 0;
    backCalls = 0;
    deferBack = false;
    private backPending = false;
    private readonly popListeners = new Set<(state: unknown) => void>();
    private readonly pageHideListeners = new Set<() => void>();
    private readonly pageShowListeners = new Set<() => void>();

    currentState = () => this.entries[this.index].state;
    currentUrl = () => this.entries[this.index].url;

    pushState = (state: Record<string, unknown>, url: string) => {
        this.entries.splice(this.index + 1, Infinity, { state, url });
        this.index += 1;
    };

    replaceState = (state: Record<string, unknown>, url: string) => {
        this.entries[this.index] = { state, url };
    };

    back = () => {
        this.backCalls += 1;
        if (this.deferBack) {
            this.backPending = true;
            return;
        }
        this.traverseBack();
    };

    flushBack = () => {
        assert.equal(this.backPending, true, 'a deferred Back must be pending');
        this.backPending = false;
        this.traverseBack();
    };

    private traverseBack = () => {
        if (this.index === 0) return;
        this.index -= 1;
        for (const listener of this.popListeners) listener(this.currentState());
    };

    forward = () => {
        if (this.index >= this.entries.length - 1) return;
        this.index += 1;
        for (const listener of this.popListeners) listener(this.currentState());
    };

    pageHide = () => {
        for (const listener of this.pageHideListeners) listener();
    };

    pageShow = () => {
        for (const listener of this.pageShowListeners) listener();
    };

    listenPopState = (listener: (state: unknown) => void) => {
        this.popListeners.add(listener);
        return () => this.popListeners.delete(listener);
    };

    listenPageHide = (listener: () => void) => {
        this.pageHideListeners.add(listener);
        return () => this.pageHideListeners.delete(listener);
    };

    listenPageShow = (listener: () => void) => {
        this.pageShowListeners.add(listener);
        return () => this.pageShowListeners.delete(listener);
    };
}

test('overlay history markers preserve Next router state and other overlays', () => {
    const original = { __NA: true, tree: ['home'], bbOverlay: 'size-picker' };
    const login = withOverlayHistoryMarker(original, 'home-login');
    const stacked = withOverlayHistoryMarker(login, 'summary-notes');

    assert.deepEqual(original, { __NA: true, tree: ['home'], bbOverlay: 'size-picker' });
    assert.equal(ownsOverlayHistoryMarker(stacked, 'home-login'), true);
    assert.equal(ownsOverlayHistoryMarker(stacked, 'summary-notes'), true);
    assert.equal(ownsOverlayHistoryMarker(stacked, 'builder-detail'), false);
    assert.deepEqual(withoutOverlayHistoryMarker(stacked, 'home-login'), {
        __NA: true,
        tree: ['home'],
        bbOverlay: 'size-picker',
        'bbHistoryOverlay:summary-notes': true,
    });
});

test('hardware Back closes a sheet once and Forward cannot resurrect it', () => {
    const port = new FakeHistoryPort();
    const changes: boolean[] = [];
    const controller = createOverlayHistoryController(port, 'home-login', open => changes.push(open));

    controller.open();
    assert.equal(port.index, 1);
    assert.equal(ownsOverlayHistoryMarker(port.currentState(), 'home-login'), true);

    port.back();
    assert.deepEqual(changes, [true, false]);
    assert.equal(port.index, 0);

    port.forward();
    assert.deepEqual(changes, [true, false]);
    assert.equal(ownsOverlayHistoryMarker(port.currentState(), 'home-login'), false);
    controller.detach();
});

test('explicit close stays responsive when another same-page entry copied the marker', () => {
    const port = new FakeHistoryPort();
    const changes: boolean[] = [];
    const controller = createOverlayHistoryController(port, 'builder-detail', open => changes.push(open));

    controller.open();
    port.pushState({ ...port.currentState(), bbOverlay: 'builder-size-picker' }, '/home2');
    port.deferBack = true;
    controller.close();

    assert.deepEqual(changes, [true], 'the controlled sheet stays stable until Back lands');
    assert.equal(port.backCalls, 1);
    assert.equal(port.index, 2);

    port.flushBack();
    assert.deepEqual(changes, [true, false]);
    assert.equal(port.index, 1);
    assert.equal(ownsOverlayHistoryMarker(port.currentState(), 'builder-detail'), false);

    port.forward();
    assert.equal(ownsOverlayHistoryMarker(port.currentState(), 'builder-detail'), false);
    assert.equal(port.currentState().bbOverlay, 'builder-size-picker');

    // A tap to reopen before the previous asynchronous Back lands is queued;
    // it cannot be closed later by that old traversal.
    controller.open();
    controller.close();
    controller.open();
    port.flushBack();
    assert.deepEqual(changes, [true, false, true],
        'queued reopen keeps the existing UI payload mounted without a false→true callback pair');
    assert.equal(ownsOverlayHistoryMarker(port.currentState(), 'builder-detail'), true);
    controller.detach();
});

test('route unmount strips only the current marker and never traverses history', () => {
    const port = new FakeHistoryPort();
    const changes: boolean[] = [];
    const controller = createOverlayHistoryController(port, 'summary-notes', open => changes.push(open));

    controller.open();
    port.pushState({ ...port.currentState() }, '/checkout');
    controller.detach();

    assert.equal(port.currentUrl(), '/checkout');
    assert.equal(port.index, 2);
    assert.equal(port.backCalls, 0);
    assert.equal(ownsOverlayHistoryMarker(port.currentState(), 'summary-notes'), false);
    assert.deepEqual(changes, [true]);
});

test('full-page navigation clears the marker before OAuth or reload', () => {
    const port = new FakeHistoryPort();
    const changes: boolean[] = [];
    const controller = createOverlayHistoryController(port, 'home-login', open => changes.push(open));

    controller.open();
    port.pageHide();

    assert.equal(ownsOverlayHistoryMarker(port.currentState(), 'home-login'), false);
    assert.equal(port.backCalls, 0);
    port.pageShow();
    assert.deepEqual(changes, [true, false],
        'a BFCache restore must close UI whose temporary history entry was cleared');
    controller.detach();
});

test('every sheet routes open and close actions through its stable parent controller', () => {
    const home = readFileSync(new URL('../../src/app/home2/page.tsx', import.meta.url), 'utf8');
    const builder = readFileSync(new URL('../../src/components/builder/BariBaliBuilder.jsx', import.meta.url), 'utf8');
    const summary = readFileSync(new URL('../../src/components/builder/SummaryView.jsx', import.meta.url), 'utf8');
    const modal = readFileSync(new URL('../../src/components/ui/bari/BariModal.tsx', import.meta.url), 'utf8');

    assert.match(home, /id: 'home-login'[\s\S]*?onOpenChange: setLoginSheet/);
    assert.match(home, /<BariModal open=\{loginSheet\} onClose=\{closeLoginSheet\}/);
    assert.match(home, /aria-label=\{user \? 'הפרופיל שלי' : 'התחברות'\}[\s\S]*?aria-haspopup=\{user \? undefined : 'dialog'\}/);
    assert.match(builder, /id: "builder-detail"[\s\S]*?onClose=\{closeDetailSheet\}/);
    assert.match(builder, /aria-label=\{`מידע על \$\{item\.he\}`\}[\s\S]*?aria-haspopup="dialog"/);
    assert.match(builder, /id: "builder-clear-confirm"[\s\S]*?<ClearConfirmModal open=\{showClearConfirm\}[\s\S]*?onCancel=\{closeClearConfirm\}/);
    assert.match(summary, /id: "summary-notes"[\s\S]*?<BariModal open=\{notesOpen\} onClose=\{closeNotes\}/);
    assert.doesNotMatch(modal, /history\.(?:pushState|replaceState|back)/,
        'the shared modal primitive must remain presentational and never navigate during cleanup');
});
