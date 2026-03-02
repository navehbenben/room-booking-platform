import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsUUID()
  holdId?: string;

  @ValidateIf((o) => !o.holdId)
  @IsUUID()
  roomId?: string;

  @ValidateIf((o) => !o.holdId)
  @IsDateString()
  start?: string;

  @ValidateIf((o) => !o.holdId)
  @IsDateString()
  end?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
