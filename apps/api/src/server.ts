import { buildApp } from './app.js';
import { createPostgresPool, migratePostgres } from './database/postgres.js';
import { PostgresPublicExerciseRepository } from './database/postgres-exercise-repository.js';
import { PostgresPublicTemplateRepository } from './database/postgres-template-repository.js';
import { PostgresAuditSink } from './database/postgres-audit-sink.js';
import { JwksAdminAuthenticator, JwtAdminAuthenticator } from './jwt-authenticator.js';
import { PostgresAdminUserRepository } from './database/postgres-admin-user-repository.js';
import { PostgresMediaAssetRepository } from './database/postgres-media-asset-repository.js';
import { readApiRuntimeConfig } from './runtime-config.js';

const config = readApiRuntimeConfig(process.env);
const databaseUrl = config.databaseUrl;
const jwtSecret = config.jwtSecret;
const jwksUrl = config.jwksUrl;

const pool = databaseUrl ? createPostgresPool(databaseUrl) : undefined;
if (pool) await migratePostgres(pool);
const authenticator = jwksUrl
  ? new JwksAdminAuthenticator({
      jwksUrl,
      issuer: config.issuer,
      audience: config.audience,
    })
  : jwtSecret
    ? new JwtAdminAuthenticator(jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
    })
    : undefined;

const app = buildApp(
  pool ? new PostgresPublicExerciseRepository(pool) : undefined,
  pool ? new PostgresPublicTemplateRepository(pool) : undefined,
  authenticator,
  pool ? new PostgresAuditSink(pool) : undefined,
  pool ? new PostgresAdminUserRepository(pool) : undefined,
  pool ? async () => { await pool.query('SELECT 1'); } : undefined,
  pool ? new PostgresMediaAssetRepository(pool) : undefined,
);
const port = config.port;

await app.listen({ host: '0.0.0.0', port });

const shutdown = async () => {
  await app.close();
  await pool?.end();
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
