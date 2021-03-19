/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { BrokerServer } from '@williele/broker-nest';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();

  app.connectMicroservice<MicroserviceOptions>({
    strategy: app.get(BrokerServer),
  });
  await app.startAllMicroservicesAsync();
}

bootstrap();
