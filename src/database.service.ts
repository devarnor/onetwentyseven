import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Pool,
  PoolClient,
  QueryResult,
  QueryResultRow,
} from 'pg';

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

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async testConnection() {
    const result = await this.query<{
      server_time: Date;
      database_name: string;
    }>(
      'SELECT NOW() AS server_time, current_database() AS database_name',
    );

    return result.rows[0];
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
