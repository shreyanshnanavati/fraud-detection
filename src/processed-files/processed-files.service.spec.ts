import { Test, TestingModule } from '@nestjs/testing';
import { ProcessedFilesService } from './processed-files.service';

describe('ProcessedFilesService', () => {
  let service: ProcessedFilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessedFilesService],
    }).compile();

    service = module.get<ProcessedFilesService>(ProcessedFilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
