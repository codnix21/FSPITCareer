import { Module } from '@nestjs/common';
import { FspService } from './fsp.service';
import { FspController } from './fsp.controller';

@Module({
  controllers: [FspController],
  providers: [FspService],
  exports: [FspService],
})
export class FspModule {}
