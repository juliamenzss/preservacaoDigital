import { IsEmail, IsNotEmpty, IsString, Length } from "@nestjs/class-validator";
export class LoginDTO {

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 30, { message: 'A senha deve ter entre 6 e 30 caracteres.' })
  password: string;
}