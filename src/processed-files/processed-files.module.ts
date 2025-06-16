import { Module } from '@nestjs/common';
import { ProcessedFilesService } from './processed-files.service';
import { ProcessedFilesController } from './processed-files.controller';

@Module({
  providers: [ProcessedFilesService],
  controllers: [ProcessedFilesController],
  exports: [ProcessedFilesService]
})
export class ProcessedFilesModule {}
