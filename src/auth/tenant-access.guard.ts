import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { DatabaseService } from '../database.service';
import { TrackingService } from '../tracking/tracking.service';
import type { AuthPrincipal } from './auth.types';

type AuthenticatedRequest = {
  params?: Record<string, string>;
  user?: AuthPrincipal;
};

type TenantMembershipRow = {
  userId: string;
  membershipId: string;
};

type IdentityBindingCandidate = {
  userId: string;
  membershipId: string;
  email: string;
  entraObjectId: string | null;
  membershipVersion: number;
};

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly trackingService: TrackingService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException(
        'Authenticated user context is unavailable.',
      );
    }

    const tenantId =
      request.params?.tenantId;

    if (
      !tenantId ||
      !isUUID(tenantId, '4')
    ) {
      throw new BadRequestException(
        'Tenant identifier must be a valid UUID.',
      );
    }

    let membership =
      await this.findMembershipByObjectId(
        request.user.objectId,
        tenantId,
      );

    if (!membership) {
      membership =
        await this.bindPreProvisionedIdentity(
          request.user,
          tenantId,
        );
    }

    if (!membership) {
      throw new ForbiddenException(
        'User is not authorized for this OneTwentySeven tenant.',
      );
    }

    request.user.applicationTenantId =
      tenantId;

    request.user.userId =
      membership.userId;

    request.user.membershipId =
      membership.membershipId;

    return true;
  }

  private async findMembershipByObjectId(
    objectId: string,
    tenantId: string,
  ): Promise<TenantMembershipRow | null> {
    const result =
      await this.databaseService
        .query<TenantMembershipRow>(
          `
            SELECT
              u.id AS "userId",
              tm.id AS "membershipId"
            FROM users u
            INNER JOIN tenant_memberships tm
              ON tm.user_id = u.id
            WHERE u.entra_object_id = $1
              AND u.status = 'active'
              AND tm.tenant_id = $2::uuid
              AND tm.status = 'active'
            LIMIT 1
          `,
          [objectId, tenantId],
        );

    return result.rows[0] ?? null;
  }

  private async bindPreProvisionedIdentity(
    principal: AuthPrincipal,
    tenantId: string,
  ): Promise<TenantMembershipRow | null> {
    const normalizedUsername =
      principal.username
        ?.trim()
        .toLowerCase();

    if (!normalizedUsername) {
      return null;
    }

    return this.databaseService.transaction(
      async (client) => {
        const candidateResult =
          await client.query<IdentityBindingCandidate>(
            `
              SELECT
                u.id AS "userId",
                tm.id AS "membershipId",
                u.email,
                u.entra_object_id
                  AS "entraObjectId",
                tm.version
                  AS "membershipVersion"
              FROM users u
              INNER JOIN tenant_memberships tm
                ON tm.user_id = u.id
              WHERE LOWER(u.email) = $1
                AND u.status = 'active'
                AND tm.tenant_id = $2::uuid
                AND tm.status = 'active'
              FOR UPDATE OF u, tm
              LIMIT 1
            `,
            [
              normalizedUsername,
              tenantId,
            ],
          );

        const candidate =
          candidateResult.rows[0];

        if (!candidate) {
          return null;
        }

        if (
          candidate.entraObjectId !== null
        ) {
          if (
            candidate.entraObjectId ===
            principal.objectId
          ) {
            return {
              userId:
                candidate.userId,
              membershipId:
                candidate.membershipId,
            };
          }

          throw new ForbiddenException(
            'The pre-provisioned user is already linked to a different Microsoft identity.',
          );
        }

        const objectIdConflict =
          await client.query<{
            id: string;
          }>(
            `
              SELECT id
              FROM users
              WHERE entra_object_id = $1
                AND id <> $2::uuid
              LIMIT 1
            `,
            [
              principal.objectId,
              candidate.userId,
            ],
          );

        if (
          objectIdConflict.rows[0]
        ) {
          throw new ForbiddenException(
            'This Microsoft identity is already linked to another OneTwentySeven user.',
          );
        }

        const updateResult =
          await client.query<{
            id: string;
          }>(
            `
              UPDATE users
              SET
                entra_object_id = $1,
                updated_at =
                  CURRENT_TIMESTAMP
              WHERE id = $2::uuid
                AND entra_object_id
                  IS NULL
              RETURNING id
            `,
            [
              principal.objectId,
              candidate.userId,
            ],
          );

        if (!updateResult.rows[0]) {
          throw new ForbiddenException(
            'Unable to securely link the Microsoft identity.',
          );
        }

        await this.trackingService
          .recordMutation(
            client,
            {
              tenantId,
              entityType:
                'user_identity',
              entityId:
                candidate.userId,
              action: 'linked',
              version:
                candidate.membershipVersion,
              source: '127-api',
              actorUserId:
                candidate.userId,
              beforeData: {
                userId:
                  candidate.userId,
                email:
                  candidate.email,
                entraObjectId: null,
              },
              afterData: {
                userId:
                  candidate.userId,
                email:
                  candidate.email,
                entraObjectId:
                  principal.objectId,
              },
              metadata: {
                membershipId:
                  candidate.membershipId,
                bindingMethod:
                  'preferred_username',
              },
            },
          );

        return {
          userId:
            candidate.userId,
          membershipId:
            candidate.membershipId,
        };
      },
    );
  }
}
