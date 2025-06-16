import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, tx?: Prisma.TransactionClient) {
    // Validate the data before creating
    this.validateUserData(createUserDto);
    
    const trustScore = this.calculateTrustScore(createUserDto);
    const prisma = tx || this.prisma;
    
    return prisma.user.create({
      data: {
        ...createUserDto,
        trustScore,
        ingestedAt: new Date(),
      },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async getStats() {
    const [totalUsers, avgTrustScore, flaggedUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.aggregate({
        _avg: {
          trustScore: true,
        },
      }),
      this.prisma.user.count({
        where: {
          trustScore: {
            lt: 0.5,
          },
        },
      }),
    ]);

    return {
      totalUsers,
      averageTrustScore: avgTrustScore._avg.trustScore || 0,
      flaggedUsers,
    };
  }

  private validateUserData(user: CreateUserDto) {
    // Email validation
    if (!user.email || !this.isValidEmail(user.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Phone validation
    if (!user.phone || !this.isValidPhone(user.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Full name validation
    if (!user.fullName || user.fullName.trim().length < 2) {
      throw new BadRequestException('Full name is required and must be at least 2 characters');
    }
  }

  private calculateTrustScore(user: CreateUserDto): number {
    let score = 1.0;
    const deductions: number[] = [];

    // Email validation
    if (!this.isValidEmail(user.email)) {
      deductions.push(0.3);
    }

    // Phone validation
    if (!this.isValidPhone(user.phone)) {
      deductions.push(0.3);
    }

    // Full name validation
    if (!user.fullName || user.fullName.trim().length < 2) {
      deductions.push(0.2);
    }

    // Apply deductions
    score -= deductions.reduce((sum, deduction) => sum + deduction, 0);

    return Math.max(0, Math.min(1, score));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - allows international format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}
