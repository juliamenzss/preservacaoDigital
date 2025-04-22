import * as fs from 'fs';
import * as path from 'path';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArchivematicaService } from 'src/archivematica/archivematica.service';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferData } from './dto/transfer-data.dto';
import * as xml2js from 'xml2js';
import { MetadataDto } from './dto/metadata.dto';


@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly transferSourceDir = '/var/archivematica/sharedDirectory/watchedDirectories/standard';
  private readonly baseArchivematicaDir = '/var/archivematica/sharedDirectory';
  constructor(
    private readonly prisma: PrismaService,
    private readonly archivematicaService: ArchivematicaService,
  ) { }

  async createNewDocument(file: Express.Multer.File, dto: CreateDocumentDto, userId: string) {
    try {
      if (!fs.existsSync(this.transferSourceDir)) {
        fs.mkdirSync(this.transferSourceDir, { recursive: true });
        fs.chmodSync(this.transferSourceDir, 0o777);
      }

      const transferName = `transfer-${dto.name}-${Date.now()}`.replace(/[^\w-]/g, '_');
      const filename = file.originalname.replace(/[^\w.-]/g, '_');
      const transferDir = path.join(this.transferSourceDir, transferName);

      fs.mkdirSync(transferDir, { recursive: true });

      const filePath = path.join(transferDir, filename);
      fs.writeFileSync(filePath, file.buffer);

      fs.chmodSync(transferDir, 0o777);
      fs.chmodSync(filePath, 0o666);

      const transferData: TransferData = {
        name: transferName,
        type: 'standard',
        accession: Date.now().toString(),
        paths: [filePath],
        row_ids: [''],
      };
      const { transferId } = await this.archivematicaService.startTransfer(transferData);
      const sipUuid = await this.archivematicaService.waitForSipFromTransfer(transferId);

      const document = await this.prisma.document.create({
        data: {
          ...dto,
          userId,
          archivematicaId: transferId,
          status: 'INICIADA',
          filePath: path.relative(this.baseArchivematicaDir, filePath),
        },
      });

      return document;

    } catch (error) {
      this.logger.error(`Erro detalhado: ${error.stack}`);
      throw new BadRequestException(`Falha ao criar documento: ${error.message}`);
    }
  }

  async handleMetadata(documentId: string, metadataDto: MetadataDto) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }
    const metadataXml = this.generateMetadataXml(metadataDto);

    const sourceLocationUuid = process.env.SOURCE_LOCATION_UUID;
    if (!sourceLocationUuid) {
      throw new Error();
    }
    const sipUuid = document.archivematicaId;
    await this.archivematicaService.addMetadataFile(
      sipUuid,
      sourceLocationUuid,
      metadataXml,
    );
    return { success: true };
  }

  private generateMetadataXml(metadataDto: MetadataDto): string {
    const builder = new xml2js.Builder();
    const metadata = {
      metadata: {
        author: metadataDto.author,
        description: metadataDto.description,
        keyword: metadataDto.keywords,
        category: metadataDto.category,
      },
    };

    return builder.buildObject(metadata);
  }


  private async monitoringDocumentStatus(transferId: string, documentId: string) {
    this.archivematicaService.monitoringStatus(transferId, async (res) => {
      try {
        let currentStatus: 'PRESERVADO' | 'FALHA' | 'INICIADA';

        if (res.success) {
          currentStatus = 'PRESERVADO';
        } else if (res.error) {
          currentStatus = 'FALHA';
        } else {
          currentStatus = 'INICIADA';
        }

        await this.prisma.document.update({
          where: { id: documentId },
          data: { status: currentStatus }
        });
      } catch (error) {
        throw new BadRequestException(error)
      }
    });
  }

  async filterDocuments(filters: FilterDocumentDto) {
    const documents = await this.prisma.document.findMany({
      where: {
        userId: filters.userId,
        name: filters.name ? { contains: filters.name, mode: 'insensitive' } : undefined,
        category: filters.category ? { equals: filters.category } : undefined,
        keywords: filters.keywords ? { contains: filters.keywords, mode: 'insensitive' } : undefined,
        description: filters.description ? { contains: filters.description, mode: 'insensitive' } : undefined,
        uploadDate: filters.startDate && filters.endDate ? { gte: new Date(filters.startDate), lte: new Date(filters.endDate) } : undefined,
        status: filters.status ? { equals: filters.status } : undefined,
      },
      orderBy: { uploadDate: 'desc' }
    });
    return documents;
  }

  async getAll(userId: string) {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { uploadDate: 'desc' }
    })
    return documents;
  }

  async getDocumentById(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, userId }
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status === 'PRESERVADO' && document.archivematicaId) {
      const infoDocument = await this.archivematicaService.getTransferStatus(document.archivematicaId);
      return {
        ...document,
        infoDocument
      };
    }

    return document;
  }

  async update(id: string, userId: string, dto: UpdateDocumentDto) {
    return await this.prisma.document.update({
      where: { id, userId },
      data: dto
    });
  }

  async remove(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, userId }
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (document.archivematicaId) {
      await this.archivematicaService.remove(document.archivematicaId);
    }
    return this.prisma.document.delete({
      where: { id, userId }
    });
  }

  async dowloadDocument(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, userId }
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }
    if (document.status !== 'PRESERVADO' || !document.archivematicaId) {
      throw new BadRequestException('Documento não preservado ainda, por favor, tente mais tarde.');
    }

    return this.archivematicaService.dowloadAIP(document.archivematicaId);
  }

  async getDocumentStatus(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, userId }
    });
    if (!document) {
      throw new NotFoundException('Documento não encontrado')
    }
    return {
      status: document.status,
      archivematicaStatus: document.archivematicaId ? await this.archivematicaService.getTransferStatus(document.archivematicaId) : null
    };
  }
}
