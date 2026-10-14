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
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilitiesService } from './facilities.service';

@Controller('tenants/:tenantId/facilities')
@UseGuards(AuthGuard, TenantAccessGuard)
export class FacilitiesController {
  constructor(
    private readonly facilitiesService:
      FacilitiesService,
  ) {}

  @Get()
  list(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
  ) {
    return this.facilitiesService.list(
      tenantId,
    );
  }

  @Get(':facilityId')
  findOne(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
    @Param(
      'facilityId',
      new ParseUUIDPipe({ version: '4' }),
    )
    facilityId: string,
  ) {
    return this.facilitiesService.findOne(
      tenantId,
      facilityId,
    );
  }

  @Post()
  create(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
    @CurrentUser()
    currentUser: AuthPrincipal,
    @Body() dto: CreateFacilityDto,
  ) {
    return this.facilitiesService.create(
      tenantId,
      currentUser.userId!,
      dto,
    );
  }

  @Patch(':facilityId')
  update(
    @Param(
      'tenantId',
      new ParseUUIDPipe({ version: '4' }),
    )
    tenantId: string,
    @Param(
      'facilityId',
      new ParseUUIDPipe({ version: '4' }),
    )
    facilityId: string,
    @CurrentUser()
    currentUser: AuthPrincipal,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(
      tenantId,
      facilityId,
      currentUser.userId!,
      dto,
    );
  }
}
