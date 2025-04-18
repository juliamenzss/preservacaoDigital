import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArchivematicaService } from 'src/archivematica/archivematica.service';
import { FilterDocumentDto } from './dto/filter-document.dto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly archivematicaService: ArchivematicaService,
  ) {}

  async createNewDocument(dto: CreateDocumentDto, userId: string) {
    try{
      const { transferId  } = await this.archivematicaService.upload(dto);
      await this.archivematicaService.approveTransfer(transferId);

      const document = await this.prisma.document.create({
        data: {
          ...dto,
          userId,
          archivematicaId: transferId,
          status: 'INICIADA',
        }
      });
      this.monitoringDocumentStatus(transferId, document.id);
      return document;

    }catch(error){
      this.logger.error(`Error creating document: ${error.message}`);
      throw new BadRequestException('Failed to create document');
    }
  };

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
      } catch(error) {
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
        uploadDate: filters.startDate && filters.endDate ?{ gte: new Date(filters.startDate), lte: new Date(filters.endDate) } : undefined,
        status: filters.status ? { equals: filters.status } : undefined,
        },
      orderBy: {uploadDate: 'desc'}
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
    if(!document){
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

  async dowloadDocument(id: string, userId: string){
    const document = await this.prisma.document.findUnique({
      where: { id, userId }
    });

    if(!document){
      throw new NotFoundException('Documento não encontrado');
    }
    if(document.status !== 'PRESERVADO' || !document.archivematicaId){
      throw new BadRequestException('Documento não preservado ainda, por favor, tente mais tarde.');
    }

    return this.archivematicaService.dowloadAIP(document.archivematicaId);
  }

  async getDocumentStatus(id: string, userId: string){
    const document = await this.prisma.document.findUnique({
      where: { id, userId }
    });
    if(!document){
      throw new NotFoundException('Documento não encontrado')
    }
    return {
      status: document.status,
      archivematicaStatus: document.archivematicaId ? await this.archivematicaService.getTransferStatus(document.archivematicaId) : null
    };
  }
}
