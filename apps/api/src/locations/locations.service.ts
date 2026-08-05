import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export type LebanonSettlement = {
  id: string;
  name: string;
  nameAr: string | null;
  governorate: string | null;
  district: string | null;
  placeType: string;
  latitude: number;
  longitude: number;
};

export type LebanonHierarchy = {
  country: string;
  countryCode: string;
  governorates: string[];
  districtsByGovernorate: Record<string, string[]>;
  settlementCount: number;
};

@Injectable()
export class LocationsService implements OnModuleInit {
  private settlements: LebanonSettlement[] = [];
  private byId = new Map<string, LebanonSettlement>();
  private hierarchy: LebanonHierarchy = {
    country: 'Lebanon',
    countryCode: 'LB',
    governorates: [],
    districtsByGovernorate: {},
    settlementCount: 0,
  };

  onModuleInit() {
    const dataDir = join(process.cwd(), 'data');
    const settlementsPath = join(dataDir, 'lebanon-settlements.json');
    const hierarchyPath = join(dataDir, 'lebanon-hierarchy.json');

    this.settlements = JSON.parse(readFileSync(settlementsPath, 'utf8')) as LebanonSettlement[];
    this.hierarchy = JSON.parse(readFileSync(hierarchyPath, 'utf8')) as LebanonHierarchy;

    this.byId = new Map(this.settlements.map((s) => [s.id, s]));
  }

  getHierarchy() {
    return this.hierarchy;
  }

  findSettlements(query: {
    governorate?: string;
    district?: string;
    q?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
    const q = query.q?.trim().toLowerCase();
    const gov = query.governorate?.trim().toLowerCase();
    const dist = query.district?.trim().toLowerCase();

    const filtered = this.settlements.filter((s) => {
      if (gov && (s.governorate || '').toLowerCase() !== gov) return false;
      if (dist && (s.district || '').toLowerCase() !== dist) return false;
      if (!q) return true;
      const hay = `${s.name} ${s.nameAr ?? ''} ${s.district ?? ''} ${s.governorate ?? ''}`.toLowerCase();
      return hay.includes(q);
    });

    return {
      total: filtered.length,
      data: filtered.slice(0, limit).map((s) => this.toPublic(s)),
    };
  }

  findOne(id: string) {
    const s = this.byId.get(id);
    return s ? this.toPublic(s) : null;
  }

  /** Internal: includes centroid coords for server-side fallbacks only */
  findOneInternal(id: string) {
    return this.byId.get(id) ?? null;
  }

  /** Resolve a settlement by exact name (+ optional governorate/district) */
  findByName(input: {
    name: string;
    governorate?: string | null;
    district?: string | null;
  }) {
    const name = input.name.trim().toLowerCase();
    if (!name) return null;
    const gov = input.governorate?.trim().toLowerCase();
    const dist = input.district?.trim().toLowerCase();

    const exact = this.settlements.find((s) => {
      if (s.name.toLowerCase() !== name) return false;
      if (gov && (s.governorate || '').toLowerCase() !== gov) return false;
      if (dist && (s.district || '').toLowerCase() !== dist) return false;
      return true;
    });
    if (exact) return exact;

    return (
      this.settlements.find((s) => {
        if (!s.name.toLowerCase().includes(name) && !(s.nameAr || '').includes(input.name.trim())) {
          return false;
        }
        if (gov && (s.governorate || '').toLowerCase() !== gov) return false;
        if (dist && (s.district || '').toLowerCase() !== dist) return false;
        return true;
      }) ?? null
    );
  }

  private toPublic(s: LebanonSettlement) {
    return {
      id: s.id,
      name: s.name,
      nameAr: s.nameAr,
      governorate: s.governorate,
      district: s.district,
      placeType: s.placeType,
      // Approximate settlement centroid — not a private home pin
      latitude: s.latitude,
      longitude: s.longitude,
    };
  }
}
