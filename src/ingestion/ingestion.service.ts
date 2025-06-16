import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { UsersService } from '../users/users.service';
import { ProcessedFilesService } from '../processed-files/processed-files.service';
import { CreateUserDto } from '../common/dto/create-user.dto';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly processedFilesService: ProcessedFilesService,
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

  private async processStream(stream: Readable, filename: string, mapping?: Record<string, number>) {
    // Check if file was already processed
    const existingFile = await this.processedFilesService.findByFilename(filename);
    if (existingFile) {
      this.logger.log(`File ${filename} was already processed`);
      return { message: 'File already processed', filename };
    }

    const results = await this.processCsvStream(stream, filename, mapping);
    await this.processedFilesService.create(filename);

    return {
      message: 'Processing completed successfully',
      filename,
      processedRecords: results.length,
    };
  }

  private async processCsvStream(stream: Readable, filename: string, mapping?: Record<string, number>): Promise<any[]> {
    const results: any[] = [];
    const csvOptions = mapping ? { headers: false } : undefined;

    return new Promise((resolve, reject) => {
      stream
        .pipe(csv(csvOptions))
        .on('data', async (data) => {
          try {
            let userDto: CreateUserDto;
            if (mapping) {
              userDto = {
                fullName: data[mapping.fullName],
                email: data[mapping.email],
                phone: data[mapping.phone],
                // panNumber: mapping.panNumber !== undefined ? data[mapping.panNumber] : '',
                sourceFile: filename,
              };
            } else {
              userDto = {
                fullName: data.Name || data.fullName,
                email: data.Email || data.email,
                phone: data.Phone || data.phone,
                // panNumber: data.panNumber || '',
                sourceFile: filename,
              };
            }
            await this.usersService.create(userDto);
            results.push(data);
          } catch (error) {
            this.logger.error(`Error processing row: ${error.message}`);
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private extractFilenameFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
