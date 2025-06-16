import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const trustScore = this.calculateTrustScore(createUserDto);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        trustScore,
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

  private calculateTrustScore(user: CreateUserDto): number {
    // Simple trust score calculation based on data quality
    let score = 1.0;

    // Validate email format
    if (!user.email?.includes('@')) {
      score -= 0.2;
    }

    // Validate phone number format
    if (!user.phone || !user.phone.match(/^\+?[1-9]\d{1,14}$/)) {
      score -= 0.2;
    }

    // Validate PAN number format
    // if (!user.panNumber || typeof user.panNumber !== 'string' || !user.panNumber.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
    //   score -= 0.3;
    // }

    return Math.max(0, score);
  }
}
