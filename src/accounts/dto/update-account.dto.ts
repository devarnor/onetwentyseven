import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAccountDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @IsOptional()
  @IsUUID('4')
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingAddressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingAddressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  billingCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  billingStateRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  billingPostalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  billingCountryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
