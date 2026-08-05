import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

export type ExactLocationPayload = {
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  capturedAt?: string | null;
};

export type EncryptedLocationRecord = {
  locationEncrypted: string;
  locationHash: string;
  locationGeohash: string;
  locationAccuracyM: number | null;
  locationCapturedAt: Date | null;
  hasExactLocation: true;
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
/** ~4.9 km cells — useful for ops without exposing exact pins */
const GEOHASH_PRECISION = 5;

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Secure at-rest storage for exact GPS.
 * - AES-256-GCM encryption (confidentiality)
 * - HMAC-SHA256 integrity hash (tamper detection / keyed hash)
 * - Geohash for coarse indexing without decrypting
 */
export class LocationCrypto {
  private readonly key: Buffer;
  private readonly hmacKey: Buffer;

  constructor(encryptionKeyHex?: string, hmacSecret?: string) {
    const raw = encryptionKeyHex || process.env.LOCATION_ENCRYPTION_KEY;
    if (!raw || raw.length < 64) {
      throw new Error(
        'LOCATION_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Set it in .env',
      );
    }
    this.key = Buffer.from(raw.slice(0, 64), 'hex');
    const hmacRaw = hmacSecret || process.env.LOCATION_HMAC_SECRET || raw;
    this.hmacKey = Buffer.from(hmacRaw.slice(0, 64), 'hex');
  }

  encrypt(payload: ExactLocationPayload): EncryptedLocationRecord {
    this.assertCoords(payload.latitude, payload.longitude);

    const body = JSON.stringify({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracyM: payload.accuracyM ?? null,
      capturedAt: payload.capturedAt ?? new Date().toISOString(),
    });

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, tag, ciphertext]).toString('base64');

    const capturedAt = payload.capturedAt ? new Date(payload.capturedAt) : new Date();

    return {
      locationEncrypted: packed,
      locationHash: this.hashCoords(payload.latitude, payload.longitude),
      locationGeohash: encodeGeohash(payload.latitude, payload.longitude, GEOHASH_PRECISION),
      locationAccuracyM: payload.accuracyM ?? null,
      locationCapturedAt: Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt,
      hasExactLocation: true,
    };
  }

  decrypt(locationEncrypted: string): ExactLocationPayload {
    const buf = Buffer.from(locationEncrypted, 'base64');
    if (buf.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted location payload');
    }
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(plain) as ExactLocationPayload;
    this.assertCoords(parsed.latitude, parsed.longitude);
    return parsed;
  }

  /**
   * Decrypt and verify HMAC integrity hash matches stored hash.
   */
  decryptAndVerify(locationEncrypted: string, locationHash: string): ExactLocationPayload {
    const payload = this.decrypt(locationEncrypted);
    const expected = this.hashCoords(payload.latitude, payload.longitude);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(locationHash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('Location integrity check failed');
    }
    return payload;
  }

  hashCoords(latitude: number, longitude: number): string {
    // Round to ~1.1m to keep hash stable across tiny float noise
    const lat = latitude.toFixed(5);
    const lng = longitude.toFixed(5);
    return createHmac('sha256', this.hmacKey).update(`${lat},${lng}`).digest('hex');
  }

  tryDecrypt(
    locationEncrypted: string | null | undefined,
    locationHash?: string | null,
  ): ExactLocationPayload | null {
    if (!locationEncrypted) return null;
    try {
      if (locationHash) {
        return this.decryptAndVerify(locationEncrypted, locationHash);
      }
      return this.decrypt(locationEncrypted);
    } catch {
      return null;
    }
  }

  private assertCoords(latitude: number, longitude: number) {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error('Invalid coordinates');
    }
    // Soft Lebanon bounds check (still allow border edge cases)
    if (latitude < 32.8 || latitude > 34.8 || longitude < 34.8 || longitude > 36.8) {
      // Do not reject — diaspora / testing — but callers may warn
    }
  }
}

export function encodeGeohash(latitude: number, longitude: number, precision = 5): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (latitude >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}
