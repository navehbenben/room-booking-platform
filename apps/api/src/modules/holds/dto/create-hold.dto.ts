import { IsDateString, IsUUID } from 'class-validator';

export class CreateHoldDto {
  @IsUUID()
  roomId!: string;

  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;
}
