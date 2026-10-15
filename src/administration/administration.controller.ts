import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { TenantAccessGuard } from '../auth/tenant-access.guard';
import { AdministrationService } from './administration.service';

@Controller('tenants/:tenantId/administration')
@UseGuards(
  AuthGuard,
  TenantAccessGuard,
  PermissionGuard,
)
@RequirePermission(
  'administration.users.manage',
)
export class AdministrationController {
  constructor(
    private readonly administrationService:
      AdministrationService,
  ) {}

  @Get('users')
  listUsers(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
  ) {
    return this.administrationService
      .listUsers(tenantId);
  }

  @Get('roles')
  listRoles(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
  ) {
    return this.administrationService
      .listRoles(tenantId);
  }
}
