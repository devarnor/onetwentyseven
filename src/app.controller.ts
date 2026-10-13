import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller()
export class AppController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  root() {
    return {
      platform: '127',
      name: 'OneTwentySeven',
      service: '127 API',
      version: '0.1.0',
      status: 'online',
    };
  }

  @Get('health')
  health() {
    return {
      status: 'healthy',
      service: '127 API',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/db')
  async databaseHealth() {
    try {
      const database = await this.databaseService.testConnection();

      return {
        status: 'healthy',
        service: '127 PostgreSQL',
        database: database.database_name,
        serverTime: database.server_time,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'unhealthy',
        service: '127 PostgreSQL',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
