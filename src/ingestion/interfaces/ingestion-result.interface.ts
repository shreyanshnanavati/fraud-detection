import { IngestionError } from './ingestion-error.interface';

export interface IngestionResult {
  success: any[];
  errors: IngestionError[];
  summary: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    filename: string;
    processedAt: Date;
  };
} 