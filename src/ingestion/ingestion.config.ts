import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IngestionConfigService {
  constructor(private readonly configService: ConfigService) {}

  get batchSize(): number {
    return this.configService.get<number>('INGESTION_BATCH_SIZE', 1000);
  }

  get maxRetries(): number {
    return this.configService.get<number>('INGESTION_MAX_RETRIES', 3);
  }

  get retryDelay(): number {
    return this.configService.get<number>('INGESTION_RETRY_DELAY', 1000);
  }

  get timeout(): number {
    return this.configService.get<number>('INGESTION_TIMEOUT', 30000);
  }
} 