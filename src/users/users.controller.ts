import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/enums/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';


@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {

  constructor(private readonly usersService: UsersService) { }
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    try {
      return this.usersService.create(createUserDto);
    } catch (error) {
      throw new BadRequestException('Erro ao criar usuário.');
    }
  }
  @Roles(Role.Admin)
  @Get()
  getAll() {
    return this.usersService.getAll();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    try {
      const user = this.usersService.getById(id);
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }
      return user;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const updateUser = this.usersService.update(id, updateUserDto);
      if (!updateUser) {
        throw new NotFoundException('Usuário não encontrado');
      }
      return updateUser;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(id);
    if (!result) {
      throw new NotFoundException('Usuário não encontrado');
    }
  }
}