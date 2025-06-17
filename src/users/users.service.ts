import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, tx?: Prisma.TransactionClient): Promise<User> {
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

  async bulkCreate(users: CreateUserDto[]): Promise<User[]> {
    try {
      const result = await this.prisma.$transaction(
        users.map((user) =>
          this.prisma.user.create({
            data: {
              ...user,
              trustScore: 0, // Default trust score for new users
            },
          })
        )
      );
      return result;
    } catch (error) {
      this.logger.error(`Error in bulk create: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves a paginated list of users with optional filtering.
   * 
   * @param paginationDto - Pagination and filtering parameters
   * @returns Object containing:
   *   - data: Array of user records
   *   - meta: Pagination metadata (total, page, limit, totalPages)
   * 
   * @example
   * // Get users with trust score between 0.5 and 0.8
   * const result = await findAll({
   *   page: 1,
   *   limit: 10,
   *   filters: {
   *     minTrustScore: 0.5,
   *     maxTrustScore: 0.8
   *   }
   * });
   * 
   * @example
   * // Search users by email domain
   * const result = await findAll({
   *   page: 1,
   *   limit: 10,
   *   filters: {
   *     email: 'example.com'
   *   }
   * });
   */
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, filters } = paginationDto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    
    if (filters) {
      if (filters.minTrustScore !== undefined || filters.maxTrustScore !== undefined) {
        where.trustScore = {
          ...(filters.minTrustScore !== undefined && { gte: filters.minTrustScore }),
          ...(filters.maxTrustScore !== undefined && { lte: filters.maxTrustScore }),
        };
      }
      
      if (filters.email) {
        where.email = { contains: filters.email, mode: 'insensitive' };
      }
      
      if (filters.panNumber) {
        where.panNumber = { contains: filters.panNumber, mode: 'insensitive' };
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
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

  /**
   * Calculates the trust score for a user based on various data points and validations.
   * 
   * Current Implementation:
   * - Starts with a base score of 1.0
   * - Deducts points for invalid or missing data:
   *   - Invalid email: -0.3 points
   *   - Invalid phone: -0.3 points
   *   - Invalid/Short full name: -0.2 points
   * 
   * Future Evolution Plans:
   * 1. Data Completeness (Q2 2024)
   *    - Additional points for complete profile information
   *    - Bonus for verified government IDs
   *    - Points for profile picture verification
   * 
   * 2. Historical Behavior (Q3 2024)
   *    - Transaction history analysis
   *    - Account age and activity metrics
   *    - Pattern recognition for suspicious activities
   * 
   * 3. External Verifications (Q4 2024)
   *    - Integration with credit bureaus
   *    - Social media verification
   *    - Professional network validation
   * 
   * 4. Machine Learning Integration (2025)
   *    - Anomaly detection
   *    - Risk prediction models
   *    - Dynamic scoring based on user behavior patterns
   * 
   * The final score is normalized between 0 and 1, where:
   * - 0.8-1.0: High trust
   * - 0.5-0.8: Medium trust
   * - 0.0-0.5: Low trust (flagged for review)
   */
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
