export interface IngestionError {
  rowNumber: number;
  rawData: any;
  error: string;
  validationErrors?: {
    field: string;
    message: string;
  }[];
  timestamp: Date;
} 