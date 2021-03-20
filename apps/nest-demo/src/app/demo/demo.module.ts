import { Module } from '@nestjs/common';
import { DemoService } from './demo.service';

@Module({
  imports: [],
  providers: [DemoService],
})
export class DemoModule {}
