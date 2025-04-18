import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { ArchivematicaModule } from 'src/archivematica/archivematica.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports:[ArchivematicaModule, PrismaModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
