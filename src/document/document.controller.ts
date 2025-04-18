import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { User } from 'src/auth/decorators/user.decorators';

@UseGuards(JwtAuthGuard)
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  create(@Body() dto: CreateDocumentDto, @User('userId') userId: string) {
    return this.documentService.createNewDocument(dto, userId);
  }

  @Get('filter')
  filter(@Query() filters: FilterDocumentDto) {
    return this.documentService.filterDocuments(filters);
  }

  @Get()
  getAll(@User('userId') userId: string) {
    return this.documentService.getAll(userId);
  }

  @Get(':id')
  getDocumentById(@Param('id') id: string, @User('userId') userId: string) {
    return this.documentService.getDocumentById(id, userId);
  }

  @Patch(':id')
  update(@Param('id')id: string,@User('userId') userId: string, @Body() dto: UpdateDocumentDto) {
    return this.documentService.update(id, userId, dto);
  }

  @Post(':id/dowload')
  dowload(@Param('id') id: string, @User('userId') userId: string) {
    return this.documentService.dowloadDocument(id, userId);
  }


  @Get(':id/status')
  getDocumentStatus(@Param('id') id: string, @User('userId') userId: string) {
    return this.documentService.getDocumentStatus(id, userId);
  }
}
