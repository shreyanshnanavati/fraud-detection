import { IsEmail, IsString, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone: string;

  // @IsString()
  // @IsOptional()
  // @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
  //   message: 'PAN number must be in the format: ABCDE1234F',
  // })
  // panNumber?: string;

  @IsString()
  @IsNotEmpty()
  sourceFile: string;
} 