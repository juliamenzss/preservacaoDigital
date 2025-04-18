import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentModule } from './document/document.module';
import { ArchivematicaModule } from './archivematica/archivematica.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, DocumentModule, ArchivematicaModule],
  controllers: [],
  providers: [AppService, PrismaService],
})
export class AppModule {}
