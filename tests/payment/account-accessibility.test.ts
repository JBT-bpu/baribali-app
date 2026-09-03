import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const adminLogin = source('../../src/app/admin/AdminLogin.tsx');
const ordersPage = source('../../src/app/orders/page.tsx');
const profilePage = source('../../src/app/profile/page.tsx');

test('admin login has a labelled, stateful password field and linked error', () => {
    assert.match(adminLogin, /<label htmlFor="admin-password"/);
    assert.match(adminLogin, /id="admin-password"[\s\S]*?autoComplete="current-password"/);
    assert.match(adminLogin, /autoCapitalize="none"/);
    assert.match(adminLogin, /spellCheck=\{false\}/);
    assert.match(adminLogin, /aria-invalid=\{Boolean\(error\)\}/);
    assert.match(adminLogin, /aria-describedby=\{error \? 'admin-login-error' : undefined\}/);
    assert.match(adminLogin, /id="admin-login-error" role="alert" aria-live="assertive"/);
    assert.match(adminLogin, /<form onSubmit=\{submit\} style=\{S\.card\} aria-busy=\{busy\}>/);
    assert.match(adminLogin, /disabled=\{busy\}/);
});

test('account page loading states are polite and expose busy state', () => {
    for (const page of [ordersPage, profilePage]) {
        assert.match(page, /aria-busy="true"/);
        assert.match(page, /role="status" aria-live="polite"/);
    }
    assert.match(ordersPage, /aria-busy=\{orders === null\}/);
    assert.match(ordersPage, /טוען הזמנות…/);
});
