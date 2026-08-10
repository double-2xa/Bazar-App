import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { LocationCrypto } from '../common/utils/location-crypto';
import { LocationsService } from '../locations/locations.service';

export type AddressPublic = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  country: string;
  governorate: string | null;
  district: string | null;
  city: string;
  settlementId: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  postalCode: string | null;
  /** Decrypted for the address owner / authorized roles only */
  latitude: number | null;
  longitude: number | null;
  locationAccuracyM: number | null;
  locationCapturedAt: string | null;
  hasExactLocation: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

@Injectable()
export class AddressesService {
  private readonly crypto: LocationCrypto;

  constructor(
    private prisma: PrismaService,
    private locations: LocationsService,
  ) {
    this.crypto = new LocationCrypto();
  }

  async findAll(userId: string): Promise<AddressPublic[]> {
    const rows = await this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toPublic(r));
  }

  async findOne(userId: string, id: string): Promise<AddressPublic> {
    const address = await this.prisma.address.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!address) throw new NotFoundException('Address not found');
    return this.toPublic(address);
  }

  async create(userId: string, dto: CreateAddressDto): Promise<AddressPublic> {
    const structured = this.resolveStructuredFields(dto);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const locationFields = this.buildLocationFields(dto.latitude, dto.longitude, dto.locationAccuracyM);

    const created = await this.prisma.address.create({
      data: {
        userId,
        label: dto.label,
        fullName: dto.fullName,
        phone: dto.phone,
        country: dto.country?.trim() || 'Lebanon',
        governorate: structured.governorate,
        district: structured.district,
        city: structured.city,
        settlementId: structured.settlementId,
        street: dto.street,
        building: dto.building,
        floor: dto.floor,
        apartment: dto.apartment,
        postalCode: dto.postalCode ?? null,
        isDefault: dto.isDefault ?? false,
        ...locationFields,
      },
    });

    return this.toPublic(created);
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<AddressPublic> {
    await this.requireOwned(userId, id);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const data: Prisma.AddressUpdateInput = {};

    if (dto.label !== undefined) data.label = dto.label;
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.street !== undefined) data.street = dto.street;
    if (dto.building !== undefined) data.building = dto.building;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.apartment !== undefined) data.apartment = dto.apartment;
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    if (
      dto.settlementId !== undefined ||
      dto.city !== undefined ||
      dto.governorate !== undefined ||
      dto.district !== undefined
    ) {
      const structured = this.resolveStructuredFields({
        governorate: dto.governorate ?? '',
        district: dto.district ?? '',
        city: dto.city ?? '',
        settlementId: dto.settlementId,
      });
      data.governorate = structured.governorate;
      data.district = structured.district;
      data.city = structured.city;
      data.settlementId = structured.settlementId;
    }

    if (dto.clearExactLocation) {
      Object.assign(data, this.clearLocationFields());
    } else if (dto.latitude != null && dto.longitude != null) {
      Object.assign(data, this.buildLocationFields(dto.latitude, dto.longitude, dto.locationAccuracyM));
    }

    const updated = await this.prisma.address.update({ where: { id }, data });
    return this.toPublic(updated);
  }

  async remove(userId: string, id: string) {
    await this.requireOwned(userId, id);
    await this.prisma.address.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
    return { message: 'Address deleted' };
  }

  async setDefault(userId: string, id: string): Promise<AddressPublic> {
    await this.requireOwned(userId, id);
    await this.prisma.address.updateMany({
      where: { userId, deletedAt: null },
      data: { isDefault: false },
    });
    const updated = await this.prisma.address.update({ where: { id }, data: { isDefault: true } });
    return this.toPublic(updated);
  }

  /** Decrypt for admin / delivery — never expose ciphertext fields */
  toPublic(
    row: {
      id: string;
      label: string;
      fullName: string;
      phone: string;
      country: string;
      governorate: string | null;
      district: string | null;
      city: string;
      settlementId: string | null;
      street: string;
      building: string | null;
      floor: string | null;
      apartment: string | null;
      postalCode: string | null;
      locationEncrypted: string | null;
      locationHash: string | null;
      locationAccuracyM: number | null;
      locationCapturedAt: Date | null;
      hasExactLocation: boolean;
      isDefault: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
    options?: { includeCoordinates?: boolean },
  ): AddressPublic {
    const includeCoordinates = options?.includeCoordinates !== false;
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (includeCoordinates && row.hasExactLocation && row.locationEncrypted) {
      const coords = this.crypto.tryDecrypt(row.locationEncrypted, row.locationHash);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    return {
      id: row.id,
      label: row.label,
      fullName: row.fullName,
      phone: row.phone,
      country: row.country,
      governorate: row.governorate,
      district: row.district,
      city: row.city,
      settlementId: row.settlementId,
      street: row.street,
      building: row.building,
      floor: row.floor,
      apartment: row.apartment,
      postalCode: row.postalCode,
      latitude,
      longitude,
      locationAccuracyM: row.locationAccuracyM,
      locationCapturedAt: row.locationCapturedAt?.toISOString() ?? null,
      hasExactLocation: row.hasExactLocation,
      isDefault: row.isDefault,
      createdAt: row.createdAt?.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    };
  }

  decryptCoords(locationEncrypted: string | null, locationHash: string | null) {
    return this.crypto.tryDecrypt(locationEncrypted, locationHash);
  }

  private async requireOwned(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  private resolveStructuredFields(input: {
    governorate?: string;
    district?: string;
    city?: string;
    settlementId?: string;
  }) {
    if (input.settlementId) {
      const settlement = this.locations.findOneInternal(input.settlementId);
      if (!settlement) {
        throw new BadRequestException('Invalid settlementId — pick a city from the Lebanon catalog');
      }
      return {
        settlementId: settlement.id,
        city: settlement.name,
        governorate: settlement.governorate,
        district: settlement.district,
      };
    }

    if (!input.governorate?.trim() || !input.district?.trim() || !input.city?.trim()) {
      throw new BadRequestException(
        'Select a Lebanon city (settlementId) or provide governorate, district, and city',
      );
    }

    return {
      settlementId: null as string | null,
      city: input.city.trim(),
      governorate: input.governorate.trim(),
      district: input.district.trim(),
    };
  }

  private buildLocationFields(
    latitude?: number,
    longitude?: number,
    accuracyM?: number,
  ) {
    if (latitude == null || longitude == null) {
      return {
        locationEncrypted: null as string | null,
        locationHash: null as string | null,
        locationGeohash: null as string | null,
        locationAccuracyM: null as number | null,
        locationCapturedAt: null as Date | null,
        hasExactLocation: false,
      };
    }

    try {
      return this.crypto.encrypt({
        latitude,
        longitude,
        accuracyM,
        capturedAt: new Date().toISOString(),
      });
    } catch {
      throw new BadRequestException('Invalid GPS coordinates');
    }
  }

  private clearLocationFields() {
    return {
      locationEncrypted: null,
      locationHash: null,
      locationGeohash: null,
      locationAccuracyM: null,
      locationCapturedAt: null,
      hasExactLocation: false,
    };
  }
}
