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
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly processedFilesService: ProcessedFilesService,
    private readonly prisma: PrismaService,
  ) {}

  async ingestFromSource(url: string) {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
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
    
    // Log errors to a file
    if (result.errors.length > 0) {
      await this.logErrorsToFile(filename, result.errors);
    }

    // Only create processed file record if we have successful results
    if (result.success.length > 0) {
      await this.processedFilesService.create(filename);
    }

    return result;
  }

  private async processCsvStream(
    stream: Readable, 
    filename: string, 
    mapping?: Record<string, number>
  ): Promise<IngestionResult> {
    const success: any[] = [];
    const errors: IngestionError[] = [];
    let rowNumber = 0;
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

            const user = await this.usersService.create(userDto);
            success.push(user);
          } catch (error) {
            const ingestionError: IngestionError = {
              rowNumber,
              rawData: data,
              error: error.message,
              validationErrors: this.extractValidationErrors(error),
              timestamp: new Date(),
            };
            errors.push(ingestionError);
            
            // Log detailed error information
            this.logger.error(
              `Error processing row ${rowNumber} in file ${filename}: ${error.message}. Data: ${JSON.stringify(data)}, Validation Errors: ${JSON.stringify(ingestionError.validationErrors)}`
            );
          }
        })
        .on('end', () => {
          resolve({
            success,
            errors,
            summary: {
              totalRows: rowNumber,
              successfulRows: success.length,
              failedRows: errors.length,
              filename,
              processedAt: new Date(),
            },
          });
        })
        .on('error', (error) => reject(error));
    });
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

  private async logErrorsToFile(filename: string, errors: IngestionError[]): Promise<void> {
    const errorLogPath = `logs/errors/${filename}_${new Date().toISOString()}.json`;
    const errorLog = {
      filename,
      processedAt: new Date(),
      errors,
    };

    // Ensure logs directory exists
    const dir = path.dirname(errorLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write error log to file
    fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
    
    this.logger.log(`Error log written to ${errorLogPath}`);
  }

  private extractFilenameFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
