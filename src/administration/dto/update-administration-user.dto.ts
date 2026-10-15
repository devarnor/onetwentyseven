import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateAdministrationUserDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsUUID('4')
  primaryOrganizationId?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  membershipStatus?: 'active' | 'inactive';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  roleCodes?: string[];
}
