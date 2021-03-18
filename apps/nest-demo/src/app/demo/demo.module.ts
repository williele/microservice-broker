import { Module } from '@nestjs/common';
import { Demo } from '../demo.service';
import { DemoService } from './demo.service';

@Module({
  imports: [],
  providers: [DemoService, Demo],
})
export class DemoModule {}
