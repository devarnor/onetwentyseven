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
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('tenants/:tenantId/accounts')
@UseGuards(AuthGuard, TenantAccessGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
  ) {
    return this.accountsService.list(tenantId);
  }

  @Get(':accountId')
  findOne(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
    @Param('accountId', new ParseUUIDPipe({ version: '4' }))
    accountId: string,
  ) {
    return this.accountsService.findOne(tenantId, accountId);
  }

  @Post()
  create(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
    @CurrentUser() currentUser: AuthPrincipal,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(
      tenantId,
      currentUser.userId!,
      dto,
    );
  }

  @Patch(':accountId')
  update(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' }))
    tenantId: string,
    @Param('accountId', new ParseUUIDPipe({ version: '4' }))
    accountId: string,
    @CurrentUser() currentUser: AuthPrincipal,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(
      tenantId,
      accountId,
      currentUser.userId!,
      dto,
    );
  }
}
