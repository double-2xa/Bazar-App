import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { mkdir, writeFile } from 'fs/promises';
import { isIP } from 'net';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class ProductImageStorageService {
  async storeRemote(source: string): Promise<string> {
    let current = new URL(source);
    for (let redirect = 0; redirect <= 3; redirect += 1) {
      await this.assertPublicHttpUrl(current);
      const response = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(Number(process.env.IMPORT_IMAGE_TIMEOUT_MS || 12000)),
        headers: { 'user-agent': 'NicePriceBazar-ProductImporter/1.0' },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || redirect === 3) throw new BadRequestException('Image redirected too many times');
        current = new URL(location, current);
        continue;
      }
      if (!response.ok) throw new BadRequestException(`Image download failed (${response.status})`);
      const declaredSize = Number(response.headers.get('content-length') || 0);
      if (declaredSize > MAX_IMAGE_BYTES) throw new BadRequestException('Image is larger than 5 MB');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_IMAGE_BYTES) throw new BadRequestException('Image is larger than 5 MB');
      return this.storeBytes(bytes);
    }
    throw new BadRequestException('Image download failed');
  }

  async storeBytes(bytes: Buffer): Promise<string> {
    const extension = this.detectExtension(bytes);
    if (!extension) throw new BadRequestException('Image must be a valid JPEG, PNG or WebP file');
    const directory = resolve(process.cwd(), 'uploads', 'products');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(resolve(directory, filename), bytes, { flag: 'wx' });
    return this.publicUrl(`/api/uploads/products/${filename}`);
  }

  public publicUrl(value: string): string {
    const configured = process.env.PUBLIC_API_URL?.trim();
    if (!configured) return value.replace(/^\/uploads\//, '/api/uploads/');

    const apiUrl = new URL(configured.endsWith('/') ? configured : `${configured}/`);
    const canonicalPath = (() => {
      try {
        const current = new URL(value, apiUrl);
        return current.pathname.replace(/^\/uploads\//, '/api/uploads/');
      } catch {
        return value.replace(/^\/uploads\//, '/api/uploads/');
      }
    })();
    return new URL(canonicalPath.replace(/^\//, ''), `${apiUrl.origin}/`).toString();
  }

  private detectExtension(bytes: Buffer): 'jpg' | 'png' | 'webp' | null {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
    if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    return null;
  }

  private async assertPublicHttpUrl(url: URL) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new BadRequestException('Image URL must use HTTP or HTTPS');
    }
    const addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => this.isPrivateAddress(address))) {
      throw new BadRequestException('Image URL cannot use a private network address');
    }
  }

  private isPrivateAddress(address: string): boolean {
    const normalized = address.toLowerCase();
    return normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe80:')
      || normalized.startsWith('127.')
      || normalized.startsWith('10.')
      || normalized.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
      || normalized.startsWith('169.254.')
      || normalized.startsWith('::ffff:127.')
      || normalized.startsWith('::ffff:10.')
      || normalized.startsWith('::ffff:192.168.')
      || normalized === '0.0.0.0';
  }
}
