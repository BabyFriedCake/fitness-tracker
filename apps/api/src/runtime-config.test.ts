import { describe, expect, it } from 'vitest';
import { readApiRuntimeConfig } from './runtime-config.js';

describe('API runtime configuration', () => {
  it('requires database and authentication in production', () => {
    expect(() => readApiRuntimeConfig({ NODE_ENV: 'production' })).toThrow('DATABASE_URL');
    expect(() => readApiRuntimeConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db' })).toThrow('ADMIN_JWT_SECRET');
  });

  it('requires HTTPS JWKS with issuer and audience in production', () => {
    const base = { NODE_ENV: 'production', DATABASE_URL: 'postgres://db', ADMIN_JWKS_URL: 'http://issuer.test/jwks' };
    expect(() => readApiRuntimeConfig(base)).toThrow('HTTPS');
    expect(() => readApiRuntimeConfig({ ...base, ADMIN_JWKS_URL: 'https://issuer.test/jwks' })).toThrow('ISSUER');
  });

  it('rejects a weak production HS256 secret', () => {
    expect(() => readApiRuntimeConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://db',
      ADMIN_JWT_SECRET: 'too-short',
    })).toThrow('ADMIN_JWT_SECRET must be at least 32 characters in production.');
  });

  it('rejects ambiguous production authentication configuration', () => {
    expect(() => readApiRuntimeConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://db',
      ADMIN_JWT_SECRET: 'a'.repeat(32),
      ADMIN_JWKS_URL: 'https://issuer.test/jwks',
      ADMIN_JWT_ISSUER: 'https://issuer.test/',
      ADMIN_JWT_AUDIENCE: 'fitness-tracker-admin',
    })).toThrow('Configure only one of ADMIN_JWT_SECRET or ADMIN_JWKS_URL in production.');
  });

  it('accepts a complete production JWKS configuration', () => {
    expect(readApiRuntimeConfig({
      NODE_ENV: 'production',
      PORT: '4000',
      DATABASE_URL: 'postgres://db',
      ADMIN_JWKS_URL: 'https://issuer.test/jwks',
      ADMIN_JWT_ISSUER: 'https://issuer.test/',
      ADMIN_JWT_AUDIENCE: 'fitness-tracker-admin',
    })).toMatchObject({ nodeEnv: 'production', port: 4000, jwksUrl: 'https://issuer.test/jwks' });
  });
});
