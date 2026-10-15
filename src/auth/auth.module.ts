import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { TenantAccessGuard } from './tenant-access.guard';

@Global()
@Module({
  providers: [
    AuthService,
    AuthGuard,
    TenantAccessGuard,
    PermissionGuard,
  ],
  exports: [
    AuthService,
    AuthGuard,
    TenantAccessGuard,
    PermissionGuard,
  ],
})
export class AuthModule {}
