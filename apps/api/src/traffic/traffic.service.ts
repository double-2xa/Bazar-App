import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecordWebsiteVisitDto } from './dto/traffic.dto';

type RequestMetadata = { ip: string; userAgent: string | null; countryCode: string | null };

@Injectable()
export class TrafficService {
  constructor(private readonly prisma: PrismaService) {}

  async record(dto: RecordWebsiteVisitDto, metadata: RequestMetadata) {
    const ipAddress = this.normalizeIp(metadata.ip);
    const userAgent = metadata.userAgent?.slice(0, 500) || null;
    const parsed = this.parseUserAgent(userAgent || '');
    const path = dto.path.split(/[?#]/, 1)[0].slice(0, 300) || '/';
    const referrer = this.safeReferrer(dto.referrer);
    const secret = process.env.TRAFFIC_HASH_SECRET || process.env.LOCATION_HMAC_SECRET || process.env.JWT_ACCESS_SECRET || '';
    const visitorHash = createHash('sha256').update(`${secret}:${ipAddress}:${userAgent || ''}`).digest('hex');

    await this.prisma.websiteVisit.create({
      data: {
        sessionId: dto.sessionId,
        visitorHash,
        ipAddress,
        path,
        referrer,
        userAgent,
        browser: parsed.browser,
        deviceType: parsed.deviceType,
        operatingSystem: parsed.operatingSystem,
        countryCode: this.countryCode(metadata.countryCode),
        isBot: parsed.isBot,
      },
    });
    return { recorded: true };
  }

  async dashboard(days: number, page: number, limit: number) {
    const now = new Date();
    const from = new Date(now.getTime() - days * 86_400_000);
    const previousFrom = new Date(from.getTime() - days * 86_400_000);
    const humanWhere = { createdAt: { gte: from }, isBot: false } as const;
    const [pageViews, previousPageViews, uniqueRows, sessionRows, daily, topPages, devices, countries, recent, totalRecent] = await Promise.all([
      this.prisma.websiteVisit.count({ where: humanWhere }),
      this.prisma.websiteVisit.count({ where: { createdAt: { gte: previousFrom, lt: from }, isBot: false } }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(DISTINCT "visitorHash")::bigint AS count FROM "WebsiteVisit" WHERE "createdAt" >= ${from} AND "isBot" = false`),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(DISTINCT "sessionId")::bigint AS count FROM "WebsiteVisit" WHERE "createdAt" >= ${from} AND "isBot" = false`),
      this.prisma.$queryRaw<Array<{ day: Date; pageViews: bigint; visitors: bigint }>>(Prisma.sql`SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS "pageViews", COUNT(DISTINCT "visitorHash")::bigint AS visitors FROM "WebsiteVisit" WHERE "createdAt" >= ${from} AND "isBot" = false GROUP BY 1 ORDER BY 1 ASC`),
      this.prisma.websiteVisit.groupBy({ by: ['path'], where: humanWhere, _count: { _all: true }, orderBy: { _count: { path: 'desc' } }, take: 10 }),
      this.prisma.websiteVisit.groupBy({ by: ['deviceType'], where: humanWhere, _count: { _all: true }, orderBy: { _count: { deviceType: 'desc' } } }),
      this.prisma.websiteVisit.groupBy({ by: ['countryCode'], where: humanWhere, _count: { _all: true }, orderBy: { _count: { countryCode: 'desc' } }, take: 10 }),
      this.prisma.websiteVisit.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.websiteVisit.count(),
    ]);

    return {
      periodDays: days,
      summary: {
        pageViews,
        uniqueVisitors: Number(uniqueRows[0]?.count || 0),
        sessions: Number(sessionRows[0]?.count || 0),
        changePercent: previousPageViews ? Math.round(((pageViews - previousPageViews) / previousPageViews) * 1000) / 10 : null,
      },
      daily: daily.map((row) => ({ day: row.day.toISOString(), pageViews: Number(row.pageViews), visitors: Number(row.visitors) })),
      topPages: topPages.map((row) => ({ path: row.path, views: row._count._all })),
      devices: devices.map((row) => ({ name: row.deviceType || 'Unknown', views: row._count._all })),
      countries: countries.map((row) => ({ code: row.countryCode || 'Unknown', views: row._count._all })),
      recent,
      pagination: { page, limit, total: totalRecent, totalPages: Math.max(1, Math.ceil(totalRecent / limit)) },
    };
  }

  @Interval(6 * 60 * 60 * 1000)
  async removeExpiredVisits() {
    const retentionDays = Math.max(7, Math.min(365, Number(process.env.TRAFFIC_RETENTION_DAYS || 90)));
    await this.prisma.websiteVisit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - retentionDays * 86_400_000) } } });
  }

  private normalizeIp(value: string) {
    return value.replace(/^::ffff:/, '').slice(0, 64) || 'unknown';
  }

  private countryCode(value: string | null) {
    const code = value?.trim().toUpperCase();
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  }

  private safeReferrer(value?: string) {
    if (!value) return null;
    try { return new URL(value).origin.slice(0, 500); } catch { return null; }
  }

  private parseUserAgent(ua: string) {
    const isBot = /bot|crawler|spider|preview|facebookexternalhit|headless/i.test(ua);
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Other';
    const operatingSystem = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS|Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Other';
    const deviceType = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|Android|iPhone|iPod/i.test(ua) ? 'Mobile' : 'Desktop';
    return { isBot, browser, operatingSystem, deviceType };
  }
}
