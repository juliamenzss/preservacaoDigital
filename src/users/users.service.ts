import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/enums/role.enum';

@Injectable()
export class UsersService {

  constructor(private readonly prisma: PrismaService) {
  }

  async create(data: CreateUserDto): Promise<User> {

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
      throw new Error('Email já cadastrado!');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(data.password, salt);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hash,
        role: data.role ?? Role.User,
      },
    });
    const { password, ...result } = user;
    return result;
  }

  async getAll(): Promise<User[]> {
    const users = this.prisma.user.findMany();
    return users;
  }

  async getById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    await this.exists(id);
    await this.getById(id);
    const updateData: Partial<UpdateUserDto> = { ...data };

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    await this.exists(id);
    return this.prisma.user.delete({
      where: {
        id,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }  

  async exists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw null;
    }
  }
}