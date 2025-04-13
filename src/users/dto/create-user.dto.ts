import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, MinLength } from "@nestjs/class-validator";
import { Role } from "src/enums/role.enum";

export class CreateUserDto {
  
  @IsString()
  @IsNotEmpty()
  @Length(3, 45, { message: 'Nome deve ter entre 3 e 45 caracteres.' })
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role: Role;
}