import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcessedFilesService {
  constructor(private prisma: PrismaService) {}

  async create(filename: string) {
    return this.prisma.processedFile.create({
      data: {
        filename,
      },
    });
  }

  async findByFilename(filename: string) {
    return this.prisma.processedFile.findUnique({
      where: { filename },
    });
  }

  async findAll() {
    return this.prisma.processedFile.findMany({
      orderBy: { processedAt: 'desc' },
    });
  }
}
