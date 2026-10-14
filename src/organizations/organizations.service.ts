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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

interface OrganizationRow {
  id: string;
  tenantId: string;
  parentOrganizationId: string | null;
  name: string;
  legalName: string | null;
  organizationType: string | null;
  status: string;
  externalId: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly trackingService: TrackingService,
  ) {}

  private readonly selectColumns = `
    id,
    tenant_id AS "tenantId",
    parent_organization_id AS "parentOrganizationId",
    name,
    legal_name AS "legalName",
    organization_type AS "organizationType",
    status,
    external_id AS "externalId",
    version,
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  `;

  async list(tenantId: string): Promise<OrganizationRow[]> {
    const result = await this.databaseService.query<OrganizationRow>(
      `
        SELECT ${this.selectColumns}
        FROM organizations
        WHERE tenant_id = $1
        ORDER BY name ASC, created_at DESC
      `,
      [tenantId],
    );

    return result.rows;
  }

  async findOne(
    tenantId: string,
    organizationId: string,
  ): Promise<OrganizationRow> {
    const result = await this.databaseService.query<OrganizationRow>(
      `
        SELECT ${this.selectColumns}
        FROM organizations
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `,
      [tenantId, organizationId],
    );

    const organization = result.rows[0];

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationRow> {
    const id = randomUUID();

    try {
      return await this.databaseService.transaction(async (client) => {
        if (dto.parentOrganizationId) {
          await this.assertParentExists(
            client,
            tenantId,
            dto.parentOrganizationId,
          );
        }

        const result = await client.query<OrganizationRow>(
          `
            INSERT INTO organizations (
              id,
              tenant_id,
              parent_organization_id,
              name,
              legal_name,
              organization_type,
              status,
              external_id,
              metadata
            )
            VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9::jsonb
            )
            RETURNING ${this.selectColumns}
          `,
          [
            id,
            tenantId,
            dto.parentOrganizationId ?? null,
            dto.name,
            dto.legalName ?? null,
            dto.organizationType ?? null,
            dto.status ?? 'active',
            dto.externalId ?? null,
            JSON.stringify(dto.metadata ?? {}),
          ],
        );

        const organization = result.rows[0];

        await this.trackingService.recordMutation(client, {
          tenantId,
          entityType: 'organization',
          entityId: organization.id,
          action: 'created',
          version: organization.version,
          source: '127-api',
          actorUserId,
          afterData: organization,
          metadata: {
            organizationName: organization.name,
          },
        });

        return organization;
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(
    tenantId: string,
    organizationId: string,
    actorUserId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationRow> {
    try {
      return await this.databaseService.transaction(async (client) => {
        const existingResult = await client.query<OrganizationRow>(
          `
            SELECT ${this.selectColumns}
            FROM organizations
            WHERE tenant_id = $1
              AND id = $2
            FOR UPDATE
          `,
          [tenantId, organizationId],
        );

        const existing = existingResult.rows[0];

        if (!existing) {
          throw new NotFoundException('Organization not found');
        }

        if (existing.version !== dto.expectedVersion) {
          throw new ConflictException(
            `Organization version conflict. Current version is ${existing.version}.`,
          );
        }

        if (dto.parentOrganizationId) {
          if (dto.parentOrganizationId === organizationId) {
            throw new BadRequestException(
              'An organization cannot be its own parent.',
            );
          }

          await this.assertParentExists(
            client,
            tenantId,
            dto.parentOrganizationId,
          );

          await this.assertNoHierarchyCycle(
            client,
            tenantId,
            organizationId,
            dto.parentOrganizationId,
          );
        }

        const result = await client.query<OrganizationRow>(
          `
            UPDATE organizations
            SET
              parent_organization_id =
                COALESCE($3, parent_organization_id),
              name = COALESCE($4, name),
              legal_name = COALESCE($5, legal_name),
              organization_type = COALESCE($6, organization_type),
              status = COALESCE($7, status),
              external_id = COALESCE($8, external_id),
              metadata = COALESCE($9::jsonb, metadata),
              version = version + 1,
              updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = $1
              AND id = $2
              AND version = $10
            RETURNING ${this.selectColumns}
          `,
          [
            tenantId,
            organizationId,
            dto.parentOrganizationId ?? null,
            dto.name ?? null,
            dto.legalName ?? null,
            dto.organizationType ?? null,
            dto.status ?? null,
            dto.externalId ?? null,
            dto.metadata ? JSON.stringify(dto.metadata) : null,
            dto.expectedVersion,
          ],
        );

        const organization = result.rows[0];

        if (!organization) {
          throw new ConflictException(
            'Organization was modified by another request.',
          );
        }

        await this.trackingService.recordMutation(client, {
          tenantId,
          entityType: 'organization',
          entityId: organization.id,
          action: 'updated',
          version: organization.version,
          source: '127-api',
          actorUserId,
          beforeData: existing,
          afterData: organization,
          metadata: {
            previousVersion: existing.version,
            currentVersion: organization.version,
          },
        });

        return organization;
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.handleDatabaseError(error);
    }
  }

  private async assertParentExists(
    client: PoolClient,
    tenantId: string,
    parentOrganizationId: string,
  ): Promise<void> {
    const result = await client.query<{ id: string }>(
      `
        SELECT id
        FROM organizations
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `,
      [tenantId, parentOrganizationId],
    );

    if (!result.rows[0]) {
      throw new BadRequestException(
        'Parent organization does not exist in this tenant.',
      );
    }
  }

  private async assertNoHierarchyCycle(
    client: PoolClient,
    tenantId: string,
    organizationId: string,
    parentOrganizationId: string,
  ): Promise<void> {
    const result = await client.query<{ createsCycle: boolean }>(
      `
        WITH RECURSIVE descendants AS (
          SELECT id
          FROM organizations
          WHERE tenant_id = $1
            AND parent_organization_id = $2

          UNION

          SELECT child.id
          FROM organizations child
          INNER JOIN descendants d
            ON child.parent_organization_id = d.id
          WHERE child.tenant_id = $1
        )
        SELECT EXISTS (
          SELECT 1
          FROM descendants
          WHERE id = $3
        ) AS "createsCycle"
      `,
      [tenantId, organizationId, parentOrganizationId],
    );

    if (result.rows[0]?.createsCycle) {
      throw new BadRequestException(
        'Parent organization would create a circular hierarchy.',
      );
    }
  }

  private handleDatabaseError(error: unknown): never {
    const dbError = error as {
      code?: string;
      constraint?: string;
    };

    if (dbError.code === '23503') {
      throw new BadRequestException(
        'A referenced tenant or parent organization is invalid.',
      );
    }

    throw error;
  }
}
