import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createHypClient,
    formatAgorot,
    HypGatewayError,
    parseHypAmountToAgorot,
} from '../../src/lib/hypPay';

const credentials = { masof: 'test-terminal', key: 'test-key', passp: 'test-pass' };

test('formats and parses whole and fractional shekel amounts without floating point math', () => {
    assert.equal(formatAgorot(7200), '72');
    assert.equal(formatAgorot(7255), '72.55');
    assert.equal(parseHypAmountToAgorot('72'), 7200);
    assert.equal(parseHypAmountToAgorot('72,5'), 7250);
    assert.equal(parseHypAmountToAgorot('72.555'), null);
});

test('SIGN uses the durable merchant reference and never returns credentials in the checkout URL', async () => {
    const requests: URL[] = [];
    const client = createHypClient(credentials, async input => {
        requests.push(new URL(String(input)));
        return new Response('signature=signed-value&Order=BBP-attempt');
    });

    const paymentUrl = await client.createPaymentUrl({
        amountAgorot: 7250,
        merchantReference: 'BBP-attempt',
        info: 'BariBali test',
    });

    assert.equal(requests[0]?.searchParams.get('What'), 'SIGN');
    assert.equal(requests[0]?.searchParams.get('Amount'), '72.50');
    assert.equal(requests[0]?.searchParams.get('Order'), 'BBP-attempt');
    assert.equal(paymentUrl.includes('test-key'), false);
    assert.equal(paymentUrl.includes('test-pass'), false);
});

test('VERIFY returns the provider transaction id, reference, amount and currency', async () => {
    const client = createHypClient(credentials, async input => {
        const requested = new URL(String(input));
        assert.equal(requested.searchParams.get('What'), 'VERIFY');
        return new Response('CCode=0&Order=BBP-attempt&Id=tx-123&Amount=72.50&Coin=1&ACode=ok');
    });
    const callback = new URLSearchParams({
        CCode: '0',
        Order: 'BBP-attempt',
        Id: 'tx-123',
        Amount: '72.50',
        Coin: '1',
        Signature: 'signed',
    });

    const result = await client.verifyPayment(callback);

    assert.equal(result.verified, true);
    assert.equal(result.transactionId, 'tx-123');
    assert.equal(result.orderReference, 'BBP-attempt');
    assert.equal(result.amountAgorot, 7250);
    assert.equal(result.currencyCode, 'ILS');
});

test('legacy Hyp success is exactly CCode=0 and Amount is parsed as shekels', async () => {
    const responses = [
        'CCode=0&Order=BBP-attempt&Id=tx-10&Amount=10.5&Coin=1',
        'CCode=000&Order=BBP-attempt&Id=tx-10&Amount=10.5&Coin=1',
        'CCode=0&Order=BBP-attempt&Id=tx-10&Price=1050&Coin=1',
    ];
    const client = createHypClient(credentials, async () => new Response(responses.shift()));
    const callback = new URLSearchParams({
        Order: 'BBP-attempt',
        Id: 'tx-10',
        Coin: '1',
    });

    const approved = await client.verifyPayment(callback);
    const yaadPayCode = await client.verifyPayment(callback);
    const yaadPayAmountField = await client.verifyPayment(callback);

    assert.equal(approved.verified, true);
    assert.equal(approved.amountAgorot, 1050);
    assert.equal(yaadPayCode.verified, false);
    assert.equal(yaadPayAmountField.verified, true);
    assert.equal(yaadPayAmountField.amountAgorot, null);
});

test('VERIFY rejects injected reserved fields before contacting Hyp', async () => {
    let fetched = false;
    const client = createHypClient(credentials, async () => {
        fetched = true;
        return new Response('CCode=0');
    });

    await assert.rejects(
        client.verifyPayment(new URLSearchParams({ Order: 'BBP-attempt', KEY: 'attacker' })),
        (error: unknown) => error instanceof HypGatewayError
            && error.code === 'HYP_CALLBACK_RESERVED_FIELD',
    );
    assert.equal(fetched, false);
});

test('provider response content is not exposed through SIGN errors', async () => {
    const client = createHypClient(credentials, async () => (
        new Response('message=secret-provider-debug-body')
    ));

    await assert.rejects(
        client.createPaymentUrl({ amountAgorot: 7200, merchantReference: 'BBP-attempt' }),
        (error: unknown) => error instanceof HypGatewayError
            && error.message === 'HYP_SIGN_MALFORMED'
            && !error.message.includes('secret-provider-debug-body'),
    );
});
