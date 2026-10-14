import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { UnauthenticatedError } from './auth.js';
import { JwksAdminAuthenticator, JwtAdminAuthenticator } from './jwt-authenticator.js';

const secret = 'a'.repeat(32);

const issue = async (claims: Record<string, unknown>) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));

describe('JwtAdminAuthenticator', () => {
  it('verifies a signed token and exposes only the actor contract', async () => {
    const token = await issue({ sub: 'admin-1', roles: ['content_reviewer'] });
    const authenticator = new JwtAdminAuthenticator(secret);

    await expect(authenticator.authenticate(token)).resolves.toEqual({
      actor: { id: 'admin-1', roles: ['content_reviewer'] },
    });
  });

  it('rejects invalid signatures, malformed roles and missing tokens', async () => {
    const token = await issue({ sub: 'admin-1', roles: ['unknown'] });
    const authenticator = new JwtAdminAuthenticator(secret);

    await expect(authenticator.authenticate(token)).rejects.toThrow(UnauthenticatedError);
    await expect(authenticator.authenticate(undefined)).rejects.toThrow(UnauthenticatedError);
    expect(() => new JwtAdminAuthenticator('short')).toThrow('at least 32 characters');
  });

  it('supports a replaceable JWKS authenticator without exposing provider details', async () => {
    const authenticator = new JwksAdminAuthenticator({ jwksUrl: 'https://issuer.example/.well-known/jwks.json' });
    await expect(authenticator.authenticate(undefined)).rejects.toThrow(UnauthenticatedError);
    await expect(authenticator.authenticate('malformed-token')).rejects.toThrow(UnauthenticatedError);
  });
});
