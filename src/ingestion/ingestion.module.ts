import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { UsersModule } from '../users/users.module';
import { ProcessedFilesModule } from '../processed-files/processed-files.module';

@Module({
  imports: [UsersModule, ProcessedFilesModule],
  providers: [IngestionService],
  controllers: [IngestionController]
})
export class IngestionModule {}
