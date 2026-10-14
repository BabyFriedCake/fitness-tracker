import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import {
  adminRoleSchema,
  type AdminAuthenticator,
  type AuthenticatedRequest,
  UnauthenticatedError,
} from './auth.js';

const claimsSchema = z.object({
  sub: z.string().min(1),
  roles: z.array(adminRoleSchema).min(1),
});

export type JwtAuthenticatorOptions = {
  issuer?: string;
  audience?: string;
};

export class JwtAdminAuthenticator implements AdminAuthenticator {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly options: JwtAuthenticatorOptions = {},
  ) {
    if (secret.length < 32) {
      throw new Error('ADMIN_JWT_SECRET must contain at least 32 characters.');
    }
    this.key = new TextEncoder().encode(secret);
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedRequest> {
    if (!token) throw new UnauthenticatedError();
    try {
      const verified = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        issuer: this.options.issuer,
        audience: this.options.audience,
      });
      const claims = claimsSchema.parse(verified.payload);
      return { actor: { id: claims.sub, roles: claims.roles } };
    } catch {
      throw new UnauthenticatedError();
    }
  }
}

export type JwksAuthenticatorOptions = JwtAuthenticatorOptions & {
  jwksUrl: string;
};

export class JwksAdminAuthenticator implements AdminAuthenticator {
  private readonly keySet: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly options: JwksAuthenticatorOptions) {
    this.keySet = createRemoteJWKSet(new URL(options.jwksUrl));
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedRequest> {
    if (!token) throw new UnauthenticatedError();
    try {
      const verified = await jwtVerify(token, this.keySet, {
        algorithms: ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512'],
        issuer: this.options.issuer,
        audience: this.options.audience,
      });
      const claims = claimsSchema.parse(verified.payload);
      return { actor: { id: claims.sub, roles: claims.roles } };
    } catch {
      throw new UnauthenticatedError();
    }
  }
}
