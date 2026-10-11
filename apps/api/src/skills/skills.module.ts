import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { ReferenceModule } from '../reference/reference.module';

@Module({
  imports: [ReferenceModule],
  controllers: [SkillsController],
})
export class SkillsModule {}
