import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      platform: '127',
      name: 'OneTwentySeven',
      service: '127 API',
      version: '0.1.0',
      status: 'online'
    };
  }

  @Get('health')
  health() {
    return {
      status: 'healthy',
      service: '127 API',
      timestamp: new Date().toISOString()
    };
  }
}
