import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';

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

@Injectable()
export class AdministrationService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  async listUsers(
    tenantId: string,
  ): Promise<AdministrationUserRow[]> {
    const result =
      await this.databaseService
        .query<AdministrationUserRow>(
          `
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
}
