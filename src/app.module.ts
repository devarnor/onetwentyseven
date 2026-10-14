import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TrackingModule } from './tracking/tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    FacilitiesModule,
    AuthModule,
    TrackingModule,
    AccountsModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
