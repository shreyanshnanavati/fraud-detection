import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Get a paginated list of users with optional filtering.
   * 
   * @param paginationDto - Pagination parameters (page, limit)
   * @param minTrustScore - Optional minimum trust score filter
   * @param maxTrustScore - Optional maximum trust score filter
   * @param email - Optional email search (case-insensitive partial match)
   * @param panNumber - Optional PAN number search (case-insensitive partial match)
   * 
   * @example
   * // Get first page with 10 items
   * GET /users?page=1&limit=10
   * 
   * @example
   * // Filter users by trust score range
   * GET /users?filters[minTrustScore]=0.5&filters[maxTrustScore]=0.8
   * 
   * @example
   * // Search users by email domain
   * GET /users?filters[email]=example.com
   * 
   * @returns Object containing:
   *   - data: Array of user records
   *   - meta: Pagination metadata (total, page, limit, totalPages)
   */
  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('minTrustScore') minTrustScore?: number,
    @Query('maxTrustScore') maxTrustScore?: number,
    @Query('email') email?: string,
    @Query('panNumber') panNumber?: string,
  ) {
    return this.usersService.findAll({
      ...paginationDto,
      filters: {
        minTrustScore,
        maxTrustScore,
        email,
        panNumber,
      },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('stats/summary')
  getStats() {
    return this.usersService.getStats();
  }
}
