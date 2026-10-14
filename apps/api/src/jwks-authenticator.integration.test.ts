import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { UnauthenticatedError } from './auth.js';
import { JwksAdminAuthenticator } from './jwt-authenticator.js';

const issuer = 'https://fitness-tracker.example.test';
const audience = 'fitness-tracker-admin';

type Key = Awaited<ReturnType<typeof generateKeyPair>> & { kid: string };

const createRsaKey = async (kid: string): Promise<Key> => ({
  ...(await generateKeyPair('RS256')),
  kid,
});

const createJwksServer = async (keys: Key[]) => {
  const jwks = await Promise.all(keys.map(async ({ publicKey, kid }) => ({
    ...(await exportJWK(publicKey)),
    kid,
    alg: 'RS256',
    use: 'sig',
  })));
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ keys: jwks }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('JWKS test server did not bind.');
  return { server, url: `http://127.0.0.1:${address.port}/.well-known/jwks.json` };
};

const issue = async (
  key: Key,
  overrides: { issuer?: string; audience?: string; expiration?: string } = {},
) => new SignJWT({ sub: 'admin-1', roles: ['content_admin'] })
  .setProtectedHeader({ alg: 'RS256', kid: key.kid })
  .setIssuer(overrides.issuer ?? issuer)
  .setAudience(overrides.audience ?? audience)
  .setIssuedAt()
  .setExpirationTime(overrides.expiration ?? '5m')
  .sign(key.privateKey);

describe('JwksAdminAuthenticator integration', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
    server = undefined;
  });

  it('accepts a valid token and rejects wrong issuer, audience, and expiration', async () => {
    const key = await createRsaKey('key-1');
    const jwks = await createJwksServer([key]);
    server = jwks.server;
    const authenticator = new JwksAdminAuthenticator({ jwksUrl: jwks.url, issuer, audience });

    await expect(authenticator.authenticate(await issue(key))).resolves.toEqual({
      actor: { id: 'admin-1', roles: ['content_admin'] },
    });
    await expect(authenticator.authenticate(await issue(key, { issuer: 'https://wrong.example.test' }))).rejects.toThrow(UnauthenticatedError);
    await expect(authenticator.authenticate(await issue(key, { audience: 'wrong-audience' }))).rejects.toThrow(UnauthenticatedError);
    await expect(authenticator.authenticate(await issue(key, { expiration: '0s' }))).rejects.toThrow(UnauthenticatedError);
  });

  it('accepts a new signing key after JWKS rotation and rejects an unknown key', async () => {
    const first = await createRsaKey('key-1');
    const second = await createRsaKey('key-2');
    const jwks = await createJwksServer([first, second]);
    server = jwks.server;
    const authenticator = new JwksAdminAuthenticator({ jwksUrl: jwks.url, issuer, audience });

    await expect(authenticator.authenticate(await issue(first))).resolves.toMatchObject({ actor: { id: 'admin-1' } });
    await expect(authenticator.authenticate(await issue(second))).resolves.toMatchObject({ actor: { id: 'admin-1' } });

    const unknown = await createRsaKey('unknown-key');
    await expect(authenticator.authenticate(await issue(unknown))).rejects.toThrow(UnauthenticatedError);
  });
});
