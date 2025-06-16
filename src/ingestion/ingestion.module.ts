import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { UsersModule } from '../users/users.module';
import { ProcessedFilesModule } from '../processed-files/processed-files.module';
import { ErrorLoggingService } from './error-logging.service';
import { IngestionConfigService } from './ingestion.config';

@Module({
  imports: [UsersModule, ProcessedFilesModule],
  controllers: [IngestionController],
  providers: [IngestionService, ErrorLoggingService, IngestionConfigService],
  exports: [IngestionService],
})
export class IngestionModule {}
