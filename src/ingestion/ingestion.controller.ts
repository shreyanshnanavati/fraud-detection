import { Controller, Post, Body, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from './ingestion.service';

@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mapping?: string,
  ) {
    let parsedMapping: Record<string, number> | undefined = undefined;
    if (mapping) {
      try {
        parsedMapping = JSON.parse(mapping);
      } catch (e) {
        throw new Error('Invalid mapping JSON');
      }
    }
    return this.ingestionService.processFile(file, parsedMapping);
  }

  @Post('url')
  async ingestFromUrl(@Body('url') url: string) {
    return this.ingestionService.ingestFromSource(url);
  }
}
