import { Logger, Module } from '@nestjs/common';
import { ArchivematicaService } from './archivematica.service';
import { ArchivematicaController } from './archivematica.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [ArchivematicaService],
  controllers: [ArchivematicaController],
  exports:[ArchivematicaService]
})
export class ArchivematicaModule {}
