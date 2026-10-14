import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database.service';
import { TrackingService } from '../tracking/tracking.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

interface FacilityRow {
  id: string;
  tenantId: string;
  organizationId: string | null;
  name: string;
  facilityType: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: string | null;
  longitude: string | null;
  timezone: string | null;
  status: string;
  externalId: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly trackingService: TrackingService,
  ) {}

  private readonly selectColumns = `
    id,
    tenant_id AS "tenantId",
    organization_id AS "organizationId",
    name,
    facility_type AS "facilityType",
    address_line1 AS "addressLine1",
    address_line2 AS "addressLine2",
    city,
    state_region AS "stateRegion",
    postal_code AS "postalCode",
    country_code AS "countryCode",
    latitude,
    longitude,
    timezone,
    status,
    external_id AS "externalId",
    version,
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  `;

  async list(tenantId: string): Promise<FacilityRow[]> {
    const result =
      await this.databaseService.query<FacilityRow>(
        `
          SELECT ${this.selectColumns}
          FROM facilities
          WHERE tenant_id = $1
          ORDER BY name ASC, created_at DESC
        `,
        [tenantId],
      );

    return result.rows;
  }

  async findOne(
    tenantId: string,
    facilityId: string,
  ): Promise<FacilityRow> {
    const result =
      await this.databaseService.query<FacilityRow>(
        `
          SELECT ${this.selectColumns}
          FROM facilities
          WHERE tenant_id = $1
            AND id = $2
          LIMIT 1
        `,
        [tenantId, facilityId],
      );

    const facility = result.rows[0];

    if (!facility) {
      throw new NotFoundException(
        'Facility not found',
      );
    }

    return facility;
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateFacilityDto,
  ): Promise<FacilityRow> {
    const id = randomUUID();

    try {
      return await this.databaseService.transaction(
        async (client) => {
          if (dto.organizationId) {
            await this.assertOrganizationExists(
              client,
              tenantId,
              dto.organizationId,
            );
          }

          const result =
            await client.query<FacilityRow>(
              `
                INSERT INTO facilities (
                  id,
                  tenant_id,
                  organization_id,
                  name,
                  facility_type,
                  address_line1,
                  address_line2,
                  city,
                  state_region,
                  postal_code,
                  country_code,
                  latitude,
                  longitude,
                  timezone,
                  status,
                  external_id,
                  metadata
                )
                VALUES (
                  $1, $2, $3, $4, $5,
                  $6, $7, $8, $9, $10,
                  $11, $12, $13, $14, $15,
                  $16, $17::jsonb
                )
                RETURNING ${this.selectColumns}
              `,
              [
                id,
                tenantId,
                dto.organizationId ?? null,
                dto.name,
                dto.facilityType ?? null,
                dto.addressLine1 ?? null,
                dto.addressLine2 ?? null,
                dto.city ?? null,
                dto.stateRegion ?? null,
                dto.postalCode ?? null,
                dto.countryCode?.toUpperCase() ??
                  null,
                dto.latitude ?? null,
                dto.longitude ?? null,
                dto.timezone ?? null,
                dto.status ?? 'active',
                dto.externalId ?? null,
                JSON.stringify(
                  dto.metadata ?? {},
                ),
              ],
            );

          const facility = result.rows[0];

          await this.trackingService.recordMutation(
            client,
            {
              tenantId,
              entityType: 'facility',
              entityId: facility.id,
              action: 'created',
              version: facility.version,
              source: '127-api',
              actorUserId,
              afterData: facility,
              metadata: {
                facilityName: facility.name,
                organizationId:
                  facility.organizationId,
              },
            },
          );

          return facility;
        },
      );
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(
    tenantId: string,
    facilityId: string,
    actorUserId: string,
    dto: UpdateFacilityDto,
  ): Promise<FacilityRow> {
    try {
      return await this.databaseService.transaction(
        async (client) => {
          const existingResult =
            await client.query<FacilityRow>(
              `
                SELECT ${this.selectColumns}
                FROM facilities
                WHERE tenant_id = $1
                  AND id = $2
                FOR UPDATE
              `,
              [tenantId, facilityId],
            );

          const existing =
            existingResult.rows[0];

          if (!existing) {
            throw new NotFoundException(
              'Facility not found',
            );
          }

          if (
            existing.version !==
            dto.expectedVersion
          ) {
            throw new ConflictException(
              `Facility version conflict. Current version is ${existing.version}.`,
            );
          }

          if (dto.organizationId) {
            await this.assertOrganizationExists(
              client,
              tenantId,
              dto.organizationId,
            );
          }

          const result =
            await client.query<FacilityRow>(
              `
                UPDATE facilities
                SET
                  organization_id =
                    COALESCE($3, organization_id),
                  name =
                    COALESCE($4, name),
                  facility_type =
                    COALESCE($5, facility_type),
                  address_line1 =
                    COALESCE($6, address_line1),
                  address_line2 =
                    COALESCE($7, address_line2),
                  city =
                    COALESCE($8, city),
                  state_region =
                    COALESCE($9, state_region),
                  postal_code =
                    COALESCE($10, postal_code),
                  country_code =
                    COALESCE($11, country_code),
                  latitude =
                    COALESCE($12, latitude),
                  longitude =
                    COALESCE($13, longitude),
                  timezone =
                    COALESCE($14, timezone),
                  status =
                    COALESCE($15, status),
                  external_id =
                    COALESCE($16, external_id),
                  metadata =
                    COALESCE(
                      $17::jsonb,
                      metadata
                    ),
                  version = version + 1,
                  updated_at =
                    CURRENT_TIMESTAMP
                WHERE tenant_id = $1
                  AND id = $2
                  AND version = $18
                RETURNING ${this.selectColumns}
              `,
              [
                tenantId,
                facilityId,
                dto.organizationId ?? null,
                dto.name ?? null,
                dto.facilityType ?? null,
                dto.addressLine1 ?? null,
                dto.addressLine2 ?? null,
                dto.city ?? null,
                dto.stateRegion ?? null,
                dto.postalCode ?? null,
                dto.countryCode?.toUpperCase() ??
                  null,
                dto.latitude ?? null,
                dto.longitude ?? null,
                dto.timezone ?? null,
                dto.status ?? null,
                dto.externalId ?? null,
                dto.metadata
                  ? JSON.stringify(dto.metadata)
                  : null,
                dto.expectedVersion,
              ],
            );

          const facility = result.rows[0];

          if (!facility) {
            throw new ConflictException(
              'Facility was modified by another request.',
            );
          }

          await this.trackingService.recordMutation(
            client,
            {
              tenantId,
              entityType: 'facility',
              entityId: facility.id,
              action: 'updated',
              version: facility.version,
              source: '127-api',
              actorUserId,
              beforeData: existing,
              afterData: facility,
              metadata: {
                previousVersion:
                  existing.version,
                currentVersion:
                  facility.version,
                organizationId:
                  facility.organizationId,
              },
            },
          );

          return facility;
        },
      );
    } catch (error) {
      if (
        error instanceof
          NotFoundException ||
        error instanceof
          ConflictException ||
        error instanceof
          BadRequestException
      ) {
        throw error;
      }

      this.handleDatabaseError(error);
    }
  }

  private async assertOrganizationExists(
    client: PoolClient,
    tenantId: string,
    organizationId: string,
  ): Promise<void> {
    const result = await client.query<{
      id: string;
    }>(
      `
        SELECT id
        FROM organizations
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `,
      [tenantId, organizationId],
    );

    if (!result.rows[0]) {
      throw new BadRequestException(
        'Organization does not exist in this tenant.',
      );
    }
  }

  private handleDatabaseError(
    error: unknown,
  ): never {
    const databaseError = error as {
      code?: string;
    };

    if (databaseError.code === '23503') {
      throw new BadRequestException(
        'Facility references an invalid related record.',
      );
    }

    throw error;
  }
}
