import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'candidate@example.ru' })
  @IsEmail({}, { message: 'Укажите корректный email' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Иван' })
  @IsString()
  @MinLength(1, { message: 'Укажите имя' })
  firstName: string;

  @ApiProperty({ example: 'Петров' })
  @IsString()
  @MinLength(1, { message: 'Укажите фамилию' })
  lastName: string;

  @ApiProperty({ enum: [UserRole.CANDIDATE, UserRole.EMPLOYER] })
  @IsEnum(UserRole, { message: 'Выберите тип аккаунта: соискатель или работодатель' })
  role: UserRole;

  @ApiPropertyOptional({ example: 'ООО «Технологии»' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Согласие с политикой конфиденциальности' })
  @IsBoolean({ message: 'Необходимо согласие с политикой конфиденциальности' })
  consentAccepted: boolean;
}

export class LoginDto {
  @ApiProperty({ example: 'employer@fsp-career.ru' })
  @IsEmail({}, { message: 'Укажите корректный email' })
  email: string;

  @ApiProperty({ example: 'Demo123!' })
  @IsString()
  @MinLength(1, { message: 'Введите пароль' })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'Demo123!' })
  @IsString()
  @MinLength(1, { message: 'Введите текущий пароль' })
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Новый пароль должен содержать минимум 8 символов' })
  @MaxLength(72)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Иван' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Укажите имя' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Петров' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Укажите фамилию' })
  lastName?: string;
}
