const PLACEHOLDER_MARKERS = ['change_me', 'change-in-production', 'change_in_production', 'doublea_secret'];

function required(config: Record<string, unknown>, key: string): string {
  const value = String(config[key] ?? '').trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function secureSecret(config: Record<string, unknown>, key: string, minimumLength = 32): string {
  const value = required(config, key);
  if (value.length < minimumLength || PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker))) {
    throw new Error(`${key} must be a non-placeholder secret of at least ${minimumLength} characters`);
  }
  return value;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const production = config.NODE_ENV === 'production';
  const databaseUrl = required(config, 'DATABASE_URL');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL must be a PostgreSQL URL');

  if (production) {
    const redisUrl = required(config, 'REDIS_URL');
    if (!/^rediss?:\/\//.test(redisUrl)) throw new Error('REDIS_URL must be a Redis URL');
    if (!new URL(redisUrl).password) throw new Error('REDIS_URL must include authentication in production');
    for (const option of ['connection_limit', 'pool_timeout', 'connect_timeout', 'socket_timeout']) {
      if (!new URL(databaseUrl).searchParams.has(option)) {
        throw new Error(`DATABASE_URL must define ${option} in production`);
      }
    }

    const access = secureSecret(config, 'JWT_ACCESS_SECRET');
    const refresh = secureSecret(config, 'JWT_REFRESH_SECRET');
    if (access === refresh) throw new Error('JWT access and refresh secrets must be different');

    const encryptionKey = required(config, 'LOCATION_ENCRYPTION_KEY');
    if (!/^[a-fA-F0-9]{64}$/.test(encryptionKey)) {
      throw new Error('LOCATION_ENCRYPTION_KEY must be exactly 64 hexadecimal characters');
    }
    secureSecret(config, 'LOCATION_HMAC_SECRET');

    const origins = required(config, 'CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (origins.length === 0 || origins.includes('*')) throw new Error('CORS_ORIGINS must contain explicit origins');
    for (const origin of origins) {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
        throw new Error(`Invalid CORS origin: ${origin}`);
      }
    }
  }

  return config;
}

export function configuredCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
