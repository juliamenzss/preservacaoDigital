import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDTO){
    const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email},
    });
    if(existingUser){
        throw new BadRequestException('Email já em uso!')
    }

    const hashePassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
        data: {
            name: dto.name,
            email: dto.email,
            password: hashePassword,
            role: dto.role ?? 1, 
        },
    });
    return this.signToken(user.id, user.email);
}
  
    async login(dto: LoginDTO) {
        const user = await this.prisma.user.findUnique({
            where: {email: dto.email},
        });
        if(!user) {
            throw new UnauthorizedException('Credenciais inválidas');
        }
        const correctPassword = await bcrypt.compare(dto.password, user.password)
        if(!correctPassword){
            throw new UnauthorizedException('Credenciais inválidas');
        }
        return this.signToken(user.id, user.email);
    }
  

    private async signToken(userId: string, email: string): Promise<{ token: string }> {
        const payload = { sub: userId, email };
    
        const token = await this.jwtService.signAsync(payload, {
          expiresIn: '7d',
          issuer: 'login',
          audience: 'users',
        });
    
        return { token };
      }
    }