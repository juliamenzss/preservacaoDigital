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

  @IsString()
  filePath: string;

  @IsJSON()
  metadados: {
    keyword: string;
    category: string;
    description: string;
    author: string;
  };

  @IsOptional()
  @IsDateString()
  preservationDate?: string;

  @IsOptional()
  @IsDateString()
  uploadDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: 'INICIADA' | 'PRESERVADO' | 'FALHA';

  @IsOptional()
  @IsString()
  archivematicaId?: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  documentId: string;
}
