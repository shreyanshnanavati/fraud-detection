import { IsOptional, IsInt, Min, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object for user filtering criteria.
 * Used to filter users based on trust score range and identification details.
 * 
 * @example
 * // Filter users with trust score between 0.5 and 0.8
 * {
 *   minTrustScore: 0.5,
 *   maxTrustScore: 0.8,
 *   email: 'example.com',
 *   panNumber: 'ABCDE1234'
 * }
 */
export class UserFiltersDto {
  /**
   * Minimum trust score threshold (inclusive)
   * @example 0.5
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minTrustScore?: number;

  /**
   * Maximum trust score threshold (inclusive)
   * @example 0.8
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxTrustScore?: number;

  /**
   * Email address to search for (case-insensitive partial match)
   * @example 'example.com'
   */
  @IsOptional()
  @IsString()
  email?: string;

  /**
   * PAN number to search for (case-insensitive partial match)
   * @example 'ABCDE1234'
   */
  @IsOptional()
  @IsString()
  panNumber?: string;
}

/**
 * Data Transfer Object for pagination and filtering.
 * Combines pagination parameters with optional user filters.
 * 
 * @example
 * // Get first page with 10 items and trust score filter
 * {
 *   page: 1,
 *   limit: 10,
 *   filters: {
 *     minTrustScore: 0.5,
 *     maxTrustScore: 0.8
 *   }
 * }
 */
export class PaginationDto {
  /**
   * Page number (1-based indexing)
   * @default 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page
   * @default 10
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  /**
   * Optional filters for user data
   */
  @IsOptional()
  filters?: UserFiltersDto;
} 