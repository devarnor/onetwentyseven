import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { TenantAccessGuard } from './tenant-access.guard';

@Global()
@Module({
  providers: [
    AuthService,
    AuthGuard,
    TenantAccessGuard,
  ],
  exports: [
    AuthService,
    AuthGuard,
    TenantAccessGuard,
  ],
})
export class AuthModule {}
