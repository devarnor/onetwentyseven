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
import type { AuthPrincipal } from './auth.types';

type AuthenticatedRequest = {
  params?: Record<string, string>;
  user?: AuthPrincipal;
};

type TenantMembershipRow = {
  user_id: string;
  membership_id: string;
};

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException(
        'Authenticated user context is unavailable.',
      );
    }

    const tenantId = request.params?.tenantId;

    if (!tenantId || !isUUID(tenantId, '4')) {
      throw new BadRequestException(
        'Tenant identifier must be a valid UUID.',
      );
    }

    const result =
      await this.databaseService.query<TenantMembershipRow>(
        `
          SELECT
            u.id AS user_id,
            tm.id AS membership_id
          FROM users u
          INNER JOIN tenant_memberships tm
            ON tm.user_id = u.id
          WHERE u.entra_object_id = $1
            AND u.status = 'active'
            AND tm.tenant_id = $2::uuid
            AND tm.status = 'active'
          LIMIT 1
        `,
        [request.user.objectId, tenantId],
      );

    const membership = result.rows[0];

    if (!membership) {
      throw new ForbiddenException(
        'User is not authorized for this OneTwentySeven tenant.',
      );
    }

    request.user.applicationTenantId = tenantId;
    request.user.userId = membership.user_id;
    request.user.membershipId = membership.membership_id;

    return true;
  }
}
