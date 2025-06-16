import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IngestionError } from './interfaces/ingestion-error.interface';

@Injectable()
export class ErrorLoggingService {
  private readonly logger = new Logger(ErrorLoggingService.name);
  private readonly errorQueue: Array<{ filename: string; error: IngestionError }> = [];
  private isProcessingQueue = false;

  constructor() {
    // Start processing the queue
    this.processQueue();
  }

  async logError(filename: string, error: IngestionError): Promise<void> {
    this.errorQueue.push({ filename, error });
    this.logger.debug(`Error queued for logging: ${error.error}`);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const queueItem = this.errorQueue.shift();
      if (queueItem) {
        const { filename, error } = queueItem;
        await this.writeErrorToFile(filename, error);
      }
    } catch (error) {
      this.logger.error(`Error processing error queue: ${error.message}`);
    } finally {
      this.isProcessingQueue = false;
      // Continue processing if there are more items
      if (this.errorQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  private async writeErrorToFile(filename: string, error: IngestionError): Promise<void> {
    const errorLogPath = `logs/errors/${filename}_${new Date().toISOString()}.json`;
    const errorLog = {
      filename,
      processedAt: new Date(),
      error,
    };

    // Ensure logs directory exists
    const dir = path.dirname(errorLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write error log asynchronously
    await fs.promises.writeFile(errorLogPath, JSON.stringify(errorLog, null, 2));
    this.logger.debug(`Error log written to ${errorLogPath}`);
  }
} 