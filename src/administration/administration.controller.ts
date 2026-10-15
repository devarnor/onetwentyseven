import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { TenantAccessGuard } from '../auth/tenant-access.guard';
import { AdministrationService } from './administration.service';
import { CreateAdministrationUserDto } from './dto/create-administration-user.dto';
import { UpdateAdministrationUserDto } from './dto/update-administration-user.dto';

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

  @Post('users')
  createUser(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
    @CurrentUser()
    currentUser: AuthPrincipal,
    @Body()
    dto: CreateAdministrationUserDto,
  ) {
    return this.administrationService
      .createUser(
        tenantId,
        currentUser.userId!,
        dto,
      );
  }

  @Patch('users/:membershipId')
  updateUser(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
    @Param(
      'membershipId',
      new ParseUUIDPipe({ version: '4' }),
    )
    membershipId: string,
    @CurrentUser()
    currentUser: AuthPrincipal,
    @Body()
    dto: UpdateAdministrationUserDto,
  ) {
    return this.administrationService
      .updateUser(
        tenantId,
        membershipId,
        currentUser.userId!,
        dto,
      );
  }
}
