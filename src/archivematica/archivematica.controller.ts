import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ArchivematicaService } from './archivematica.service';
import { CreateDocumentDto } from 'src/document/dto/create-document.dto';
import { TransferData } from 'src/document/dto/transfer-data.dto';

@Controller('archivematica')
export class ArchivematicaController {
  constructor(private readonly archivematicaService: ArchivematicaService) {}

  @Post('upload')
  startTransfer(@Body() dto: TransferData) {
    return this.archivematicaService.startTransfer(dto);
  }

  @Post('approve/:directory')
  async approve(@Param('directory') directory: string) {
    return this.archivematicaService.approveTransfer(directory);
  }

  @Get('status/:id')
  getStatus(@Param('id') id: string) {
    return this.archivematicaService.getTransferStatus(id);
  }

  @Post('process/:id')
  async process(@Param('id') id: string) {
    return this.archivematicaService.processSIP(id);
  }

  @Get('download/:id')
  async download(@Param('id') id: string) {
    return this.archivematicaService.dowloadAIP(id);
  }
  
  @Delete('remove/:id')
  remove(@Param('id') id: string) {
    return this.archivematicaService.remove(id);
  }

  @Get('status/unapproved')
  getUnapproved() {
    return this.archivematicaService.getUnapproved();
  }

  @Get('status/completed')
  getCompleted() {
    return this.archivematicaService.getCompleted();

  }
}
