import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true
  });

  const port = Number(process.env.PORT || 8080);

  await app.listen(port, '0.0.0.0');

  console.log(`127 API listening on port ${port}`);
}

bootstrap();
