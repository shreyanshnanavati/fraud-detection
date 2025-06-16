import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { UsersService } from '../users/users.service';
import { ProcessedFilesService } from '../processed-files/processed-files.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionResult } from './interfaces/ingestion-result.interface';
import { IngestionError } from './interfaces/ingestion-error.interface';
import { ErrorLoggingService } from './error-logging.service';
import { IngestionConfigService } from './ingestion.config';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly processedFilesService: ProcessedFilesService,
    private readonly prisma: PrismaService,
    private readonly errorLoggingService: ErrorLoggingService,
    private readonly ingestionConfig: IngestionConfigService,
  ) {}

  async ingestFromSource(url: string) {
    try {
      const response = await axios.get(url, { 
        responseType: 'stream',
        timeout: this.ingestionConfig.timeout 
      });
      const filename = this.extractFilenameFromUrl(url);
      return this.processStream(response.data, filename);
    } catch (error) {
      this.logger.error(`Error during URL ingestion: ${error.message}`);
      throw error;
    }
  }

  async processFile(file: Express.Multer.File, mapping?: Record<string, number>) {
    try {
      const filename = file.originalname;
      const fileStream = Readable.from(file.buffer);
      return this.processStream(fileStream, filename, mapping);
    } catch (error) {
      this.logger.error(`Error during file processing: ${error.message}`);
      throw error;
    }
  }

  private async processStream(stream: Readable, filename: string, mapping?: Record<string, number>): Promise<IngestionResult> {
    // Check if file was already processed
    const existingFile = await this.processedFilesService.findByFilename(filename);
    if (existingFile) {
      this.logger.log(`File ${filename} was already processed`);
      return {
        success: [],
        errors: [],
        summary: {
          totalRows: 0,
          successfulRows: 0,
          failedRows: 0,
          filename,
          processedAt: new Date(),
        },
      };
    }

    const result = await this.processCsvStream(stream, filename, mapping);
    
    // Only create processed file record if we have successful results
    if (result.summary.successfulRows > 0) {
      await this.processedFilesService.create(filename);
    }

    return result;
  }

  private async processCsvStream(
    stream: Readable, 
    filename: string, 
    mapping?: Record<string, number>
  ): Promise<IngestionResult> {
    const errors: IngestionError[] = [];
    let rowNumber = 0;
    let totalSuccess = 0;
    let currentBatch: CreateUserDto[] = [];
    const csvOptions = mapping ? { headers: false } : undefined;

    return new Promise((resolve, reject) => {
      stream
        .pipe(csv(csvOptions))
        .on('data', async (data) => {
          rowNumber++;
          try {
            let userDto: CreateUserDto;
            if (mapping) {
              userDto = {
                fullName: data[mapping.fullName],
                email: data[mapping.email],
                phone: data[mapping.phone],
                sourceFile: filename,
              };
            } else {
              userDto = {
                fullName: data.Name || data.fullName,
                email: data.Email || data.email,
                phone: data.Phone || data.phone,
                sourceFile: filename,
              };
            }

            currentBatch.push(userDto);

            // Process batch when it reaches the batch size
            if (currentBatch.length >= this.ingestionConfig.batchSize) {
              await this.processBatchWithRetry(currentBatch, filename);
              totalSuccess += currentBatch.length;
              currentBatch = [];
            }
          } catch (error) {
            const ingestionError: IngestionError = {
              rowNumber,
              rawData: data,
              error: error.message,
              validationErrors: this.extractValidationErrors(error),
              timestamp: new Date(),
            };
            errors.push(ingestionError);
            await this.errorLoggingService.logError(filename, ingestionError);
          }
        })
        .on('end', async () => {
          // Process remaining batch
          if (currentBatch.length > 0) {
            await this.processBatchWithRetry(currentBatch, filename);
            totalSuccess += currentBatch.length;
          }

          resolve({
            success: [], // We don't keep success records in memory anymore
            errors,
            summary: {
              totalRows: rowNumber,
              successfulRows: totalSuccess,
              failedRows: errors.length,
              filename,
              processedAt: new Date(),
            },
          });
        })
        .on('error', (error) => reject(error));
    });
  }

  private async processBatchWithRetry(batch: CreateUserDto[], filename: string): Promise<void> {
    let retries = 0;
    while (retries < this.ingestionConfig.maxRetries) {
      try {
        await this.usersService.bulkCreate(batch);
        return;
      } catch (error) {
        retries++;
        if (retries === this.ingestionConfig.maxRetries) {
          this.logger.error(`Failed to process batch after ${retries} retries: ${error.message}`);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.ingestionConfig.retryDelay));
      }
    }
  }

  private extractValidationErrors(error: any): { field: string; message: string }[] {
    if (error.response?.data?.message) {
      // Handle class-validator errors
      const messages = error.response.data.message;
      if (Array.isArray(messages)) {
        return messages.map((msg: string) => {
          const [field, message] = msg.split(':').map(s => s.trim());
          return { field, message };
        });
      }
    }
    return [];
  }

  private extractFilenameFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
