import { Test, TestingModule } from '@nestjs/testing';
import { ProcessedFilesController } from './processed-files.controller';

describe('ProcessedFilesController', () => {
  let controller: ProcessedFilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessedFilesController],
    }).compile();

    controller = module.get<ProcessedFilesController>(ProcessedFilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
