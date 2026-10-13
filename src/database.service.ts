import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const sslEnabled =
      this.configService.get<string>('DB_SSL')?.toLowerCase() === 'true';

    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST'),
      database: this.configService.get<string>('DB_NAME'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      port: 5432,
      ssl: sslEnabled
        ? {
            rejectUnauthorized: true,
          }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  async testConnection() {
    const result = await this.pool.query(
      'SELECT NOW() AS server_time, current_database() AS database_name',
    );

    return result.rows[0];
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
