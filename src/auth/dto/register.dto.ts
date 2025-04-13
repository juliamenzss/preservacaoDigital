import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from "@nestjs/class-validator";
import { Role } from "src/enums/role.enum";

export class RegisterDTO{
    @IsString()
    @IsNotEmpty()
    @Length(3, 45, { message: 'Nome deve ter entre 3 e 45 caracteres.' })
    name: string;
  
    @IsNotEmpty()
    @IsEmail()
    email: string;
    
    @IsNotEmpty()
    @IsString()
    @Length(6, 30, { message: 'A senha deve ter entre 6 e 30 caracteres.' })
    password: string

    @IsEnum(Role)
    @IsOptional()
    role?: Role;
}