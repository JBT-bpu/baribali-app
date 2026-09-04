import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { HypGatewayError } from '../../src/lib/hypPay';
import {
    settleHypCallback,
    type HypSettlementDependencies,
} from '../../src/lib/hypSettlement';

const callback = new URLSearchParams({
    Order: 'BBP-attempt',
    Id: 'tx-123',
    Amount: '72',
    Coin: '1',
    CCode: '0',
});

const hypReturnRoute = readFileSync(new URL(
    '../../src/app/api/payment/hyp/return/route.ts',
    import.meta.url,
), 'utf8');

function dependencies(overrides: Partial<HypSettlementDependencies> = {}): HypSettlementDependencies {
    return {
        record: async () => ({
            eventId: 17,
            attemptId: '11111111-1111-4111-8111-111111111111',
            orderId: '22222222-2222-4222-8222-222222222222',
            amountAgorot: 7200,
            currencyCode: 'ILS',
            attemptStatus: 'verification_pending',
            duplicateEvent: false,
        }),
        verify: async () => ({
            verified: true,
            ccode: '0',
            transactionId: 'tx-123',
            orderReference: 'BBP-attempt',
            amountAgorot: 7200,
            currencyCode: 'ILS',
            safeMetadata: { CCode: '0', Id: 'tx-123' },
        }),
        apply: async () => ({
            result: 'settled',
            orderId: '22222222-2222-4222-8222-222222222222',
            attemptId: '11111111-1111-4111-8111-111111111111',
            orderPaymentStatus: 'paid',
        }),
        ...overrides,
    };
}

test('approved VERIFY sends the provider transaction id to atomic settlement', async () => {
    const appliedInputs: Parameters<HypSettlementDependencies['apply']>[0][] = [];
    const recordedInputs: Parameters<HypSettlementDependencies['record']>[0][] = [];
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        record: async input => {
            recordedInputs.push(input);
            return {
                eventId: 17,
                attemptId: '11111111-1111-4111-8111-111111111111',
                orderId: '22222222-2222-4222-8222-222222222222',
                amountAgorot: 7200,
                currencyCode: 'ILS',
                attemptStatus: 'verification_pending',
                duplicateEvent: false,
            };
        },
        apply: async input => {
            appliedInputs.push(input);
            return {
                result: 'settled',
                orderId: '22222222-2222-4222-8222-222222222222',
                attemptId: '11111111-1111-4111-8111-111111111111',
                orderPaymentStatus: 'paid',
            };
        },
    }));

    assert.equal(recordedInputs[0]?.providerTransactionId, 'tx-123');
    assert.equal(appliedInputs[0]?.providerTransactionId, 'tx-123');
    assert.equal(appliedInputs[0]?.reportedAmountAgorot, 7200);
    assert.equal(appliedInputs[0]?.currencyCode, 'ILS');
    assert.equal(result.paid, true);
});

test('the browser return records its transaction Id before a VERIFY budget can defer work', async () => {
    const calls: string[] = [];
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        record: async input => {
            calls.push(`record:${input.providerTransactionId}`);
            return {
                eventId: 17,
                attemptId: '11111111-1111-4111-8111-111111111111',
                orderId: '22222222-2222-4222-8222-222222222222',
                amountAgorot: 7200,
                currencyCode: 'ILS',
                attemptStatus: 'verification_pending',
                duplicateEvent: false,
            };
        },
        claimVerificationBudget: () => {
            calls.push('budget');
            return false;
        },
        verify: async () => {
            calls.push('verify');
            throw new Error('VERIFY must be deferred');
        },
        apply: async () => {
            calls.push('apply');
            throw new Error('an unverified event must remain replayable');
        },
    }));

    assert.deepEqual(calls, ['record:tx-123', 'budget']);
    assert.deepEqual(result, {
        orderId: '22222222-2222-4222-8222-222222222222',
        result: 'verification_deferred',
        paid: false,
    });
    assert.doesNotMatch(hypReturnRoute, /if \(limited\) return limited/);
    assert.match(
        hypReturnRoute,
        /recordUnknownReference = rateLimit[\s\S]*?record: input => recordPaymentCallback\([\s\S]*?recordUnknownReference/,
    );
    assert.match(
        hypReturnRoute,
        /claimVerificationBudget: \(\{ merchantReference \}\)[\s\S]*?hyp-browser-verify:\$\{merchantReference\}/,
    );
});

test('the same durable event can complete VERIFY after the budget window reopens', async () => {
    let recorded = false;
    let verificationAllowed = false;
    let verifyCalls = 0;
    let applyCalls = 0;
    const shared = dependencies({
        record: async () => {
            const duplicateEvent = recorded;
            recorded = true;
            return {
                eventId: 17,
                attemptId: '11111111-1111-4111-8111-111111111111',
                orderId: '22222222-2222-4222-8222-222222222222',
                amountAgorot: 7200,
                currencyCode: 'ILS',
                attemptStatus: 'verification_pending',
                duplicateEvent,
            };
        },
        claimVerificationBudget: () => verificationAllowed,
        verify: async () => {
            verifyCalls += 1;
            return {
                verified: true,
                ccode: '0',
                transactionId: 'tx-123',
                orderReference: 'BBP-attempt',
                amountAgorot: 7200,
                currencyCode: 'ILS',
                safeMetadata: { CCode: '0', Id: 'tx-123' },
            };
        },
        apply: async () => {
            applyCalls += 1;
            return {
                result: 'settled',
                orderId: '22222222-2222-4222-8222-222222222222',
                attemptId: '11111111-1111-4111-8111-111111111111',
                orderPaymentStatus: 'paid',
            };
        },
    });

    const deferred = await settleHypCallback(callback, 'browser_return', shared);
    verificationAllowed = true;
    const replayed = await settleHypCallback(callback, 'browser_return', shared);

    assert.equal(deferred.result, 'verification_deferred');
    assert.equal(replayed.result, 'settled');
    assert.equal(replayed.paid, true);
    assert.equal(verifyCalls, 1);
    assert.equal(applyCalls, 1);
});

test('a VERIFY transport error stays verification_pending instead of becoming failed', async () => {
    const appliedInputs: Parameters<HypSettlementDependencies['apply']>[0][] = [];
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        verify: async () => {
            throw new HypGatewayError('HYP_VERIFY_TRANSPORT', true);
        },
        apply: async input => {
            appliedInputs.push(input);
            return {
                result: 'verification_pending',
                orderId: '22222222-2222-4222-8222-222222222222',
                attemptId: '11111111-1111-4111-8111-111111111111',
                orderPaymentStatus: 'pending',
            };
        },
    }));

    assert.equal(appliedInputs[0]?.outcome, 'verification_pending');
    assert.equal(appliedInputs[0]?.providerCode, 'HYP_VERIFY_TRANSPORT');
    assert.equal(result.paid, false);
});

test('a VERIFY error replay still succeeds when another callback already paid the order', async () => {
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        verify: async () => {
            throw new HypGatewayError('HYP_VERIFY_TRANSPORT', true);
        },
        apply: async () => ({
            result: 'duplicate_event',
            orderId: '22222222-2222-4222-8222-222222222222',
            attemptId: '11111111-1111-4111-8111-111111111111',
            orderPaymentStatus: 'paid',
        }),
    }));

    assert.equal(result.result, 'duplicate_event');
    assert.equal(result.paid, true);
});

test('a duplicate callback for an already paid attempt does not call VERIFY again', async () => {
    let verified = false;
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        record: async () => ({
            eventId: 17,
            attemptId: '11111111-1111-4111-8111-111111111111',
            orderId: '22222222-2222-4222-8222-222222222222',
            amountAgorot: 7200,
            currencyCode: 'ILS',
            attemptStatus: 'paid',
            duplicateEvent: true,
        }),
        verify: async () => {
            verified = true;
            throw new Error('must not run');
        },
        claimVerificationBudget: () => {
            throw new Error('a paid duplicate must not consume verification budget');
        },
    }));

    assert.equal(result.result, 'duplicate_success');
    assert.equal(result.paid, true);
    assert.equal(verified, false);
});

test('a replay for a recorded duplicate charge does not call VERIFY again', async () => {
    let verified = false;
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        record: async () => ({
            eventId: 17,
            attemptId: '11111111-1111-4111-8111-111111111111',
            orderId: '22222222-2222-4222-8222-222222222222',
            amountAgorot: 7200,
            currencyCode: 'ILS',
            attemptStatus: 'duplicate_paid',
            duplicateEvent: true,
        }),
        verify: async () => {
            verified = true;
            throw new Error('must not run');
        },
    }));

    assert.equal(result.result, 'duplicate_success');
    assert.equal(result.paid, true);
    assert.equal(verified, false);
});

test('a concurrent duplicate event redirects to success once the order is paid', async () => {
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        apply: async () => ({
            result: 'duplicate_event',
            orderId: '22222222-2222-4222-8222-222222222222',
            attemptId: '11111111-1111-4111-8111-111111111111',
            orderPaymentStatus: 'paid',
        }),
    }));

    assert.equal(result.result, 'duplicate_event');
    assert.equal(result.paid, true);
});

test('unknown merchant references are recorded but never verified', async () => {
    let verified = false;
    const result = await settleHypCallback(callback, 'browser_return', dependencies({
        record: async () => ({
            eventId: 18,
            attemptId: null,
            orderId: null,
            amountAgorot: null,
            currencyCode: null,
            attemptStatus: 'unknown_reference',
            duplicateEvent: false,
        }),
        verify: async () => {
            verified = true;
            throw new Error('must not run');
        },
    }));

    assert.equal(result.result, 'unknown_reference');
    assert.equal(verified, false);
});

test('oversized merchant references are rejected before writing an event', async () => {
    let recorded = false;
    const oversized = new URLSearchParams({ Order: 'x'.repeat(129) });
    const result = await settleHypCallback(oversized, 'browser_return', dependencies({
        record: async () => {
            recorded = true;
            throw new Error('must not run');
        },
    }));

    assert.equal(result.result, 'invalid_reference');
    assert.equal(recorded, false);
});
