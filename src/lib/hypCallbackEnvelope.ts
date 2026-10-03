import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Node-only helper. Never import from a client component or log its inputs. */
export class HypCallbackEnvelopeError extends Error {
    constructor(code: string) {
        super(code);
        this.name = 'HypCallbackEnvelopeError';
    }
}

function encryptionKey(value: string | undefined): Buffer {
    if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
        throw new HypCallbackEnvelopeError('PAYMENT_CALLBACK_KEY_INVALID');
    }
    return Buffer.from(value, 'hex');
}

/** Fail before issuing a chargeable hosted URL when replay cannot be persisted. */
export function assertHypCallbackEncryptionConfigured(): void {
    encryptionKey(process.env.PAYMENT_CALLBACK_ENCRYPTION_KEY);
}

export function encryptHypCallback(
    query: string,
    merchantReference: string,
    key = process.env.PAYMENT_CALLBACK_ENCRYPTION_KEY,
): string {
    if (query.length > 8192) throw new HypCallbackEnvelopeError('PAYMENT_CALLBACK_TOO_LARGE');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), nonce);
    cipher.setAAD(Buffer.from(`hyp:${merchantReference}`, 'utf8'));
    const encrypted = Buffer.concat([cipher.update(query, 'utf8'), cipher.final()]);
    return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptHypCallback(
    envelope: string,
    merchantReference: string,
    key = process.env.PAYMENT_CALLBACK_ENCRYPTION_KEY,
): URLSearchParams {
    const secret = encryptionKey(key);
    try {
        const parts = envelope.split('.');
        if (parts.length !== 4 || parts[0] !== 'v1' || envelope.length > 12000) throw new Error();
        const nonce = Buffer.from(parts[1], 'base64url');
        const tag = Buffer.from(parts[2], 'base64url');
        if (nonce.length !== 12 || tag.length !== 16) throw new Error();
        const decipher = createDecipheriv('aes-256-gcm', secret, nonce);
        decipher.setAAD(Buffer.from(`hyp:${merchantReference}`, 'utf8'));
        decipher.setAuthTag(tag);
        const query = Buffer.concat([
            decipher.update(Buffer.from(parts[3], 'base64url')),
            decipher.final(),
        ]).toString('utf8');
        if (query.length > 8192) throw new Error();
        const params = new URLSearchParams(query);
        const references = [...params.entries()].filter(([key]) => key.toLowerCase() === 'order');
        if (references.length !== 1 || references[0][1] !== merchantReference) throw new Error();
        return params;
    } catch {
        throw new HypCallbackEnvelopeError('PAYMENT_CALLBACK_DECRYPT_FAILED');
    }
}
