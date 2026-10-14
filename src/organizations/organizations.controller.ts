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
import { CurrentUser } from '../auth/current-user.decorator';
import { TenantAccessGuard } from '../auth/tenant-access.guard';
import type { AuthPrincipal } from '../auth/auth.types';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('tenants/:tenantId/organizations')
@UseGuards(AuthGuard, TenantAccessGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  list(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
  ) {
    return this.organizationsService.list(tenantId);
  }

  @Get(':organizationId')
  findOne(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
  ) {
    return this.organizationsService.findOne(
      tenantId,
      organizationId,
    );
  }

  @Post()
  create(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
    @CurrentUser() currentUser: AuthPrincipal,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(
      tenantId,
      currentUser.userId!,
      dto,
    );
  }

  @Patch(':organizationId')
  update(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @CurrentUser() currentUser: AuthPrincipal,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(
      tenantId,
      organizationId,
      currentUser.userId!,
      dto,
    );
  }
}
