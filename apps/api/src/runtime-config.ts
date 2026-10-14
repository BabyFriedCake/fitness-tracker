import { z } from 'zod';

const optionalString = z.preprocess((value) => value === '' ? undefined : value, z.string().trim().min(1).optional());

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: optionalString,
  ADMIN_JWT_SECRET: optionalString,
  ADMIN_JWKS_URL: z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional()),
  ADMIN_JWT_ISSUER: optionalString,
  ADMIN_JWT_AUDIENCE: optionalString,
});

export type ApiRuntimeConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl?: string;
  jwtSecret?: string;
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
};

export const readApiRuntimeConfig = (environment: NodeJS.ProcessEnv): ApiRuntimeConfig => {
  const parsed = environmentSchema.parse(environment);
  const isProduction = parsed.NODE_ENV === 'production';

  if (isProduction && !parsed.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production.');
  }
  if (isProduction && !parsed.ADMIN_JWT_SECRET && !parsed.ADMIN_JWKS_URL) {
    throw new Error('ADMIN_JWT_SECRET or ADMIN_JWKS_URL is required in production.');
  }
  if (isProduction && parsed.ADMIN_JWT_SECRET && parsed.ADMIN_JWKS_URL) {
    throw new Error('Configure only one of ADMIN_JWT_SECRET or ADMIN_JWKS_URL in production.');
  }
  if (isProduction && parsed.ADMIN_JWT_SECRET && parsed.ADMIN_JWT_SECRET.length < 32) {
    throw new Error('ADMIN_JWT_SECRET must be at least 32 characters in production.');
  }
  if (parsed.ADMIN_JWKS_URL && isProduction) {
    const protocol = new URL(parsed.ADMIN_JWKS_URL).protocol;
    if (protocol !== 'https:') {
      throw new Error('ADMIN_JWKS_URL must use HTTPS in production.');
    }
    if (!parsed.ADMIN_JWT_ISSUER || !parsed.ADMIN_JWT_AUDIENCE) {
      throw new Error('ADMIN_JWT_ISSUER and ADMIN_JWT_AUDIENCE are required with JWKS in production.');
    }
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    jwtSecret: parsed.ADMIN_JWT_SECRET,
    jwksUrl: parsed.ADMIN_JWKS_URL,
    issuer: parsed.ADMIN_JWT_ISSUER,
    audience: parsed.ADMIN_JWT_AUDIENCE,
  };
};
