import { IsEmail } from 'class-validator';

export class InviteDto {
  @IsEmail()
  toEmail: string;
}
