import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

interface AccountRow {
  id: string;
  tenantId: string;
  organizationId: string | null;
  ownerUserId: string | null;
  name: string;
  legalName: string | null;
  accountType: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingStateRegion: string | null;
  billingPostalCode: string | null;
  billingCountryCode: string | null;
  status: string;
  source: string | null;
  externalId: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AccountsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private readonly selectColumns = `
    id,
    tenant_id AS "tenantId",
    organization_id AS "organizationId",
    owner_user_id AS "ownerUserId",
    name,
    legal_name AS "legalName",
    account_type AS "accountType",
    industry,
    website,
    phone,
    billing_address_line1 AS "billingAddressLine1",
    billing_address_line2 AS "billingAddressLine2",
    billing_city AS "billingCity",
    billing_state_region AS "billingStateRegion",
    billing_postal_code AS "billingPostalCode",
    billing_country_code AS "billingCountryCode",
    status,
    source,
    external_id AS "externalId",
    version,
    metadata,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  `;

  async list(tenantId: string): Promise<AccountRow[]> {
    const result = await this.databaseService.query<AccountRow>(
      `
        SELECT ${this.selectColumns}
        FROM accounts
        WHERE tenant_id = $1
        ORDER BY name ASC, created_at DESC
      `,
      [tenantId],
    );

    return result.rows;
  }

  async findOne(
    tenantId: string,
    accountId: string,
  ): Promise<AccountRow> {
    const result = await this.databaseService.query<AccountRow>(
      `
        SELECT ${this.selectColumns}
        FROM accounts
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `,
      [tenantId, accountId],
    );

    const account = result.rows[0];

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async create(
    tenantId: string,
    dto: CreateAccountDto,
  ): Promise<AccountRow> {
    const id = randomUUID();

    try {
      const result = await this.databaseService.query<AccountRow>(
        `
          INSERT INTO accounts (
            id,
            tenant_id,
            organization_id,
            owner_user_id,
            name,
            legal_name,
            account_type,
            industry,
            website,
            phone,
            billing_address_line1,
            billing_address_line2,
            billing_city,
            billing_state_region,
            billing_postal_code,
            billing_country_code,
            status,
            source,
            external_id,
            metadata
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18,
            $19, $20
          )
          RETURNING ${this.selectColumns}
        `,
        [
          id,
          tenantId,
          dto.organizationId ?? null,
          dto.ownerUserId ?? null,
          dto.name,
          dto.legalName ?? null,
          dto.accountType ?? 'prospect',
          dto.industry ?? null,
          dto.website ?? null,
          dto.phone ?? null,
          dto.billingAddressLine1 ?? null,
          dto.billingAddressLine2 ?? null,
          dto.billingCity ?? null,
          dto.billingStateRegion ?? null,
          dto.billingPostalCode ?? null,
          dto.billingCountryCode ?? null,
          dto.status ?? 'active',
          dto.source ?? null,
          dto.externalId ?? null,
          dto.metadata ?? {},
        ],
      );

      return result.rows[0];
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(
    tenantId: string,
    accountId: string,
    dto: UpdateAccountDto,
  ): Promise<AccountRow> {
    try {
      const result = await this.databaseService.query<AccountRow>(
        `
          UPDATE accounts
          SET
            name = COALESCE($3, name),
            legal_name = COALESCE($4, legal_name),
            organization_id = COALESCE($5, organization_id),
            owner_user_id = COALESCE($6, owner_user_id),
            account_type = COALESCE($7, account_type),
            industry = COALESCE($8, industry),
            website = COALESCE($9, website),
            phone = COALESCE($10, phone),
            billing_address_line1 = COALESCE($11, billing_address_line1),
            billing_address_line2 = COALESCE($12, billing_address_line2),
            billing_city = COALESCE($13, billing_city),
            billing_state_region = COALESCE($14, billing_state_region),
            billing_postal_code = COALESCE($15, billing_postal_code),
            billing_country_code = COALESCE($16, billing_country_code),
            status = COALESCE($17, status),
            source = COALESCE($18, source),
            external_id = COALESCE($19, external_id),
            metadata = COALESCE($20::jsonb, metadata),
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = $1
            AND id = $2
            AND version = $21
          RETURNING ${this.selectColumns}
        `,
        [
          tenantId,
          accountId,
          dto.name ?? null,
          dto.legalName ?? null,
          dto.organizationId ?? null,
          dto.ownerUserId ?? null,
          dto.accountType ?? null,
          dto.industry ?? null,
          dto.website ?? null,
          dto.phone ?? null,
          dto.billingAddressLine1 ?? null,
          dto.billingAddressLine2 ?? null,
          dto.billingCity ?? null,
          dto.billingStateRegion ?? null,
          dto.billingPostalCode ?? null,
          dto.billingCountryCode ?? null,
          dto.status ?? null,
          dto.source ?? null,
          dto.externalId ?? null,
          dto.metadata ? JSON.stringify(dto.metadata) : null,
          dto.expectedVersion,
        ],
      );

      const account = result.rows[0];

      if (account) {
        return account;
      }

      const existing = await this.databaseService.query<{ version: number }>(
        `
          SELECT version
          FROM accounts
          WHERE tenant_id = $1
            AND id = $2
          LIMIT 1
        `,
        [tenantId, accountId],
      );

      if (!existing.rows[0]) {
        throw new NotFoundException('Account not found');
      }

      throw new ConflictException(
        `Account version conflict. Current version is ${existing.rows[0].version}.`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.handleDatabaseError(error);
    }
  }

  private handleDatabaseError(error: unknown): never {
    const dbError = error as {
      code?: string;
      constraint?: string;
    };

    if (dbError.code === '23503') {
      throw new BadRequestException(
        'A referenced tenant, organization, or user is invalid for this account.',
      );
    }

    throw error;
  }
}
