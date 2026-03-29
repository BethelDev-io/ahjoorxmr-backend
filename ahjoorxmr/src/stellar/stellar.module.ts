import { Module } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { WinstonLogger } from '../common/logger/winston.logger';

@Module({
  providers: [StellarService, WinstonLogger],
  exports: [StellarService],
})
export class StellarModule {}
