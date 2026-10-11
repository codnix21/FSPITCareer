import { Module } from '@nestjs/common';
import { FspService } from './fsp.service';
import { FspController } from './fsp.controller';
import { FSP_PROVIDER } from './providers/fsp-provider';
import { LocalFspProvider } from './providers/local-fsp.provider';
import { ExternalFspProvider } from './providers/external-fsp.provider';
import { PrivacyModule } from '../privacy/privacy.module';

@Module({
  imports: [PrivacyModule],
  controllers: [FspController],
  providers: [
    LocalFspProvider,
    ExternalFspProvider,
    {
      provide: FSP_PROVIDER,
      useFactory: (local: LocalFspProvider, external: ExternalFspProvider) => {
        const mode = (process.env.FSP_PROVIDER || 'local').toLowerCase();
        return mode === 'external' ? external : local;
      },
      inject: [LocalFspProvider, ExternalFspProvider],
    },
    FspService,
  ],
  exports: [FspService, FSP_PROVIDER],
})
export class FspModule {}
