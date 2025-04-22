import {
  IsString,
  IsJSON,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNotEmpty,
  Length,
} from '@nestjs/class-validator';

export class CreateDocumentDto {
    
  @IsString()
  @IsNotEmpty()
  @Length(3, 45, { message: 'Nome deve ter entre 3 e 45 caracteres.' })
  name: string;

  @IsOptional()
  @IsString()
  keyword: string;

  @IsOptional()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  author: string;

}
