import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Disable2faDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}
