import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../database.service';
import type { AuthPrincipal } from './auth.types';
import {
  REQUIRED_PERMISSION_KEY,
} from './require-permission.decorator';

type AuthenticatedRequest = {
  user?: AuthPrincipal;
};

type PermissionRow = {
  permission_code: string;
};

@Injectable()
export class PermissionGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
    private readonly databaseService:
      DatabaseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredPermission =
      this.reflector.getAllAndOverride<string>(
        REQUIRED_PERMISSION_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredPermission) {
      return true;
    }

    const request =
      context.switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const principal = request.user;

    if (
      !principal?.membershipId ||
      !principal.applicationTenantId
    ) {
      throw new UnauthorizedException(
        'Tenant membership context is unavailable.',
      );
    }

    const result =
      await this.databaseService
        .query<PermissionRow>(
          `
            SELECT
              p.code AS permission_code
            FROM membership_roles mr
            INNER JOIN roles r
              ON r.id = mr.role_id
             AND r.tenant_id = mr.tenant_id
            INNER JOIN role_permissions rp
              ON rp.role_id = r.id
            INNER JOIN permissions p
              ON p.id = rp.permission_id
            WHERE mr.tenant_id = $1::uuid
              AND mr.membership_id = $2::uuid
              AND p.code = $3
            LIMIT 1
          `,
          [
            principal.applicationTenantId,
            principal.membershipId,
            requiredPermission,
          ],
        );

    if (!result.rows[0]) {
      throw new ForbiddenException(
        'User does not have the required permission.',
      );
    }

    return true;
  }
}
