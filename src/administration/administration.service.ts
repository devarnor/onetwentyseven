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
import { CreateAdministrationUserDto } from './dto/create-administration-user.dto';
import { UpdateAdministrationUserDto } from './dto/update-administration-user.dto';

interface UserRole {
  id: string;
  name: string;
  code: string;
}

interface AdministrationUserRow {
  membershipId: string;
  userId: string;
  entraObjectId: string | null;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  userStatus: string;
  membershipStatus: string;
  primaryOrganizationId: string | null;
  primaryOrganizationName: string | null;
  jobTitle: string | null;
  roles: UserRole[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AdministrationRoleRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
}

interface ExistingUserRow {
  id: string;
  status: string;
}

interface MembershipLockRow {
  id: string;
  userId: string;
  membershipStatus: string;
  userStatus: string;
  version: number;
}

interface RoleRow {
  id: string;
  code: string;
}

@Injectable()
export class AdministrationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly trackingService: TrackingService,
  ) {}

  private readonly userSelect = `
    SELECT
      tm.id AS "membershipId",
      u.id AS "userId",
      u.entra_object_id AS "entraObjectId",
      u.email,
      u.display_name AS "displayName",
      u.first_name AS "firstName",
      u.last_name AS "lastName",
      u.status AS "userStatus",
      tm.status AS "membershipStatus",
      tm.primary_organization_id
        AS "primaryOrganizationId",
      o.name AS "primaryOrganizationName",
      tm.job_title AS "jobTitle",
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'code', r.code
          )
          ORDER BY r.name
        ) FILTER (
          WHERE r.id IS NOT NULL
        ),
        '[]'::jsonb
      ) AS roles,
      tm.version,
      tm.created_at AS "createdAt",
      tm.updated_at AS "updatedAt"
    FROM tenant_memberships tm
    INNER JOIN users u
      ON u.id = tm.user_id
    LEFT JOIN organizations o
      ON o.id = tm.primary_organization_id
     AND o.tenant_id = tm.tenant_id
    LEFT JOIN membership_roles mr
      ON mr.membership_id = tm.id
     AND mr.tenant_id = tm.tenant_id
    LEFT JOIN roles r
      ON r.id = mr.role_id
     AND r.tenant_id = tm.tenant_id
  `;

  async listUsers(
    tenantId: string,
  ): Promise<AdministrationUserRow[]> {
    const result =
      await this.databaseService
        .query<AdministrationUserRow>(
          `
            ${this.userSelect}
            WHERE tm.tenant_id = $1::uuid
            GROUP BY
              tm.id,
              u.id,
              o.id,
              o.name
            ORDER BY
              u.display_name NULLS LAST,
              u.email
          `,
          [tenantId],
        );

    return result.rows;
  }

  async listRoles(
    tenantId: string,
  ): Promise<AdministrationRoleRow[]> {
    const result =
      await this.databaseService
        .query<AdministrationRoleRow>(
          `
            SELECT
              id,
              name,
              code,
              description,
              is_system AS "isSystem"
            FROM roles
            WHERE tenant_id = $1::uuid
            ORDER BY
              CASE code
                WHEN 'administrator' THEN 1
                WHEN 'manager' THEN 2
                WHEN 'user' THEN 3
                ELSE 100
              END,
              name
          `,
          [tenantId],
        );

    return result.rows;
  }

  async createUser(
    tenantId: string,
    actorUserId: string,
    dto: CreateAdministrationUserDto,
  ): Promise<AdministrationUserRow> {
    const normalizedEmail =
      dto.email.trim().toLowerCase();

    const roleCodes =
      this.normalizeRoleCodes(dto.roleCodes);

    try {
      return await this.databaseService.transaction(
        async (client) => {
          if (dto.primaryOrganizationId) {
            await this.assertOrganizationExists(
              client,
              tenantId,
              dto.primaryOrganizationId,
            );
          }

          const roles = await this.resolveRoles(
            client,
            tenantId,
            roleCodes,
          );

          const existingUserResult =
            await client.query<ExistingUserRow>(
              `
                SELECT
                  id,
                  status
                FROM users
                WHERE LOWER(email) = $1
                LIMIT 1
              `,
              [normalizedEmail],
            );

          let userId =
            existingUserResult.rows[0]?.id;

          if (userId) {
            if (
              existingUserResult.rows[0].status !==
              'active'
            ) {
              throw new ConflictException(
                'The existing platform user is inactive.',
              );
            }

            const existingMembership =
              await client.query<{ id: string }>(
                `
                  SELECT id
                  FROM tenant_memberships
                  WHERE tenant_id = $1::uuid
                    AND user_id = $2::uuid
                  LIMIT 1
                `,
                [tenantId, userId],
              );

            if (existingMembership.rows[0]) {
              throw new ConflictException(
                'This user already belongs to the tenant.',
              );
            }
          } else {
            userId = randomUUID();

            const derivedDisplayName =
              dto.displayName?.trim() ||
              [
                dto.firstName?.trim(),
                dto.lastName?.trim(),
              ]
                .filter(Boolean)
                .join(' ') ||
              normalizedEmail;

            await client.query(
              `
                INSERT INTO users (
                  id,
                  email,
                  display_name,
                  first_name,
                  last_name,
                  status,
                  metadata
                )
                VALUES (
                  $1,
                  $2,
                  $3,
                  $4,
                  $5,
                  'active',
                  $6::jsonb
                )
              `,
              [
                userId,
                normalizedEmail,
                derivedDisplayName,
                dto.firstName?.trim() || null,
                dto.lastName?.trim() || null,
                JSON.stringify({
                  provisionedByAdministration: true,
                }),
              ],
            );
          }

          const membershipId = randomUUID();

          await client.query(
            `
              INSERT INTO tenant_memberships (
                id,
                tenant_id,
                user_id,
                primary_organization_id,
                job_title,
                status,
                metadata
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'active',
                $6::jsonb
              )
            `,
            [
              membershipId,
              tenantId,
              userId,
              dto.primaryOrganizationId ?? null,
              dto.jobTitle?.trim() || null,
              JSON.stringify({
                provisionedByAdministration: true,
              }),
            ],
          );

          await this.replaceRoles(
            client,
            tenantId,
            membershipId,
            roles,
          );

          const created =
            await this.fetchUserByMembership(
              client,
              tenantId,
              membershipId,
            );

          await this.trackingService.recordMutation(
            client,
            {
              tenantId,
              entityType: 'tenant_membership',
              entityId: membershipId,
              action: 'created',
              version: created.version,
              source: '127-api',
              actorUserId,
              afterData: created,
              metadata: {
                email: created.email,
                roleCodes,
              },
            },
          );

          return created;
        },
      );
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async updateUser(
    tenantId: string,
    membershipId: string,
    actorUserId: string,
    dto: UpdateAdministrationUserDto,
  ): Promise<AdministrationUserRow> {
    try {
      return await this.databaseService.transaction(
        async (client) => {
          await client.query(
            `
              SELECT pg_advisory_xact_lock(
                hashtext($1)::bigint
              )
            `,
            [`127-admin:${tenantId}`],
          );

          const lockResult =
            await client.query<MembershipLockRow>(
              `
                SELECT
                  tm.id,
                  tm.user_id AS "userId",
                  tm.status AS "membershipStatus",
                  u.status AS "userStatus",
                  tm.version
                FROM tenant_memberships tm
                INNER JOIN users u
                  ON u.id = tm.user_id
                WHERE tm.tenant_id = $1::uuid
                  AND tm.id = $2::uuid
                FOR UPDATE
              `,
              [tenantId, membershipId],
            );

          const locked = lockResult.rows[0];

          if (!locked) {
            throw new NotFoundException(
              'Tenant user membership not found.',
            );
          }

          if (
            locked.version !== dto.expectedVersion
          ) {
            throw new ConflictException(
              `User membership version conflict. Current version is ${locked.version}.`,
            );
          }

          if (dto.primaryOrganizationId) {
            await this.assertOrganizationExists(
              client,
              tenantId,
              dto.primaryOrganizationId,
            );
          }

          const before =
            await this.fetchUserByMembership(
              client,
              tenantId,
              membershipId,
            );

          const currentRoleCodes =
            before.roles.map(
              (role) => role.code,
            );

          const nextRoleCodes =
            dto.roleCodes === undefined
              ? currentRoleCodes
              : this.normalizeRoleCodes(
                  dto.roleCodes,
                );

          const roles =
            dto.roleCodes === undefined
              ? null
              : await this.resolveRoles(
                  client,
                  tenantId,
                  nextRoleCodes,
                );

          const nextMembershipStatus =
            dto.membershipStatus ??
            locked.membershipStatus;

          const currentlyActiveAdmin =
            locked.userStatus === 'active' &&
            locked.membershipStatus === 'active' &&
            currentRoleCodes.includes(
              'administrator',
            );

          const remainsActiveAdmin =
            locked.userStatus === 'active' &&
            nextMembershipStatus === 'active' &&
            nextRoleCodes.includes(
              'administrator',
            );

          if (
            currentlyActiveAdmin &&
            !remainsActiveAdmin
          ) {
            await this.assertAnotherAdministratorExists(
              client,
              tenantId,
              membershipId,
            );
          }

          const updateResult =
            await client.query<{ version: number }>(
              `
                UPDATE tenant_memberships
                SET
                  primary_organization_id =
                    COALESCE(
                      $3::uuid,
                      primary_organization_id
                    ),
                  job_title =
                    COALESCE(
                      $4,
                      job_title
                    ),
                  status =
                    COALESCE(
                      $5,
                      status
                    ),
                  version = version + 1,
                  updated_at = CURRENT_TIMESTAMP
                WHERE tenant_id = $1::uuid
                  AND id = $2::uuid
                  AND version = $6
                RETURNING version
              `,
              [
                tenantId,
                membershipId,
                dto.primaryOrganizationId ??
                  null,
                dto.jobTitle ?? null,
                dto.membershipStatus ?? null,
                dto.expectedVersion,
              ],
            );

          if (!updateResult.rows[0]) {
            throw new ConflictException(
              'User membership was modified by another request.',
            );
          }

          if (roles) {
            await this.replaceRoles(
              client,
              tenantId,
              membershipId,
              roles,
            );
          }

          const updated =
            await this.fetchUserByMembership(
              client,
              tenantId,
              membershipId,
            );

          await this.trackingService.recordMutation(
            client,
            {
              tenantId,
              entityType: 'tenant_membership',
              entityId: membershipId,
              action: 'updated',
              version: updated.version,
              source: '127-api',
              actorUserId,
              beforeData: before,
              afterData: updated,
              metadata: {
                previousVersion:
                  before.version,
                currentVersion:
                  updated.version,
                roleCodes:
                  updated.roles.map(
                    (role) => role.code,
                  ),
              },
            },
          );

          return updated;
        },
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.handleDatabaseError(error);
    }
  }

  private normalizeRoleCodes(
    roleCodes: string[],
  ): string[] {
    const normalized = [
      ...new Set(
        roleCodes.map(
          (code) =>
            code.trim().toLowerCase(),
        ),
      ),
    ].filter(Boolean);

    if (normalized.length === 0) {
      throw new BadRequestException(
        'At least one role is required.',
      );
    }

    return normalized;
  }

  private async resolveRoles(
    client: PoolClient,
    tenantId: string,
    roleCodes: string[],
  ): Promise<RoleRow[]> {
    const result =
      await client.query<RoleRow>(
        `
          SELECT
            id,
            code
          FROM roles
          WHERE tenant_id = $1::uuid
            AND code = ANY($2::text[])
        `,
        [tenantId, roleCodes],
      );

    if (
      result.rows.length !== roleCodes.length
    ) {
      throw new BadRequestException(
        'One or more selected roles are invalid for this tenant.',
      );
    }

    return result.rows;
  }

  private async replaceRoles(
    client: PoolClient,
    tenantId: string,
    membershipId: string,
    roles: RoleRow[],
  ): Promise<void> {
    await client.query(
      `
        DELETE FROM membership_roles
        WHERE tenant_id = $1::uuid
          AND membership_id = $2::uuid
      `,
      [tenantId, membershipId],
    );

    for (const role of roles) {
      await client.query(
        `
          INSERT INTO membership_roles (
            membership_id,
            role_id,
            tenant_id
          )
          VALUES (
            $1,
            $2,
            $3
          )
        `,
        [
          membershipId,
          role.id,
          tenantId,
        ],
      );
    }
  }

  private async assertOrganizationExists(
    client: PoolClient,
    tenantId: string,
    organizationId: string,
  ): Promise<void> {
    const result =
      await client.query<{ id: string }>(
        `
          SELECT id
          FROM organizations
          WHERE tenant_id = $1::uuid
            AND id = $2::uuid
          LIMIT 1
        `,
        [tenantId, organizationId],
      );

    if (!result.rows[0]) {
      throw new BadRequestException(
        'Primary organization does not exist in this tenant.',
      );
    }
  }

  private async assertAnotherAdministratorExists(
    client: PoolClient,
    tenantId: string,
    membershipId: string,
  ): Promise<void> {
    const result =
      await client.query<{ count: number }>(
        `
          SELECT
            COUNT(
              DISTINCT tm.id
            )::int AS count
          FROM tenant_memberships tm
          INNER JOIN users u
            ON u.id = tm.user_id
          INNER JOIN membership_roles mr
            ON mr.membership_id = tm.id
           AND mr.tenant_id = tm.tenant_id
          INNER JOIN roles r
            ON r.id = mr.role_id
           AND r.tenant_id = tm.tenant_id
          WHERE tm.tenant_id = $1::uuid
            AND tm.id <> $2::uuid
            AND tm.status = 'active'
            AND u.status = 'active'
            AND r.code = 'administrator'
        `,
        [tenantId, membershipId],
      );

    if (
      (result.rows[0]?.count ?? 0) < 1
    ) {
      throw new ConflictException(
        'The last active Administrator cannot be disabled or have the Administrator role removed.',
      );
    }
  }

  private async fetchUserByMembership(
    client: PoolClient,
    tenantId: string,
    membershipId: string,
  ): Promise<AdministrationUserRow> {
    const result =
      await client.query<AdministrationUserRow>(
        `
          ${this.userSelect}
          WHERE tm.tenant_id = $1::uuid
            AND tm.id = $2::uuid
          GROUP BY
            tm.id,
            u.id,
            o.id,
            o.name
          LIMIT 1
        `,
        [tenantId, membershipId],
      );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException(
        'Tenant user membership not found.',
      );
    }

    return user;
  }

  private handleDatabaseError(
    error: unknown,
  ): never {
    const dbError = error as {
      code?: string;
      constraint?: string;
    };

    if (dbError.code === '23505') {
      throw new ConflictException(
        'A user with this email or tenant membership already exists.',
      );
    }

    if (dbError.code === '23503') {
      throw new BadRequestException(
        'A referenced tenant, organization, role, or user is invalid.',
      );
    }

    throw error;
  }
}
