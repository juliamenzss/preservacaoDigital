import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, take } from 'rxjs';
import { CreateDocumentDto } from 'src/document/dto/create-document.dto';

export interface TransferStatus {
  status: 'INICIADA' | 'PRESERVADO' | 'FALHA';
  name: string;
  sip_uuid?: string;
  microservice: string;
  directory: string;
  path: string;
  message: string;
  type: string;
  uuid: string;
}

@Injectable()
export class ArchivematicaService {
  private readonly apiDashboard?: string;
  private readonly apiStorage?: string;
  private readonly username?: string;
  private readonly apiKey?: string;

  private readonly logger = new Logger(ArchivematicaService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiDashboard = this.configService.get<string>('ARCHIVEMATICA_DASHBOARD_URL');
    this.apiStorage = this.configService.get<string>('ARCHIVEMATICA_STORAGE_URL');
    this.username = this.configService.get<string>('ARCHIVEMATICA_USERNAME');
    this.apiKey = this.configService.get<string>('ARCHIVEMATICA_API_KEY');
  }

  private dashboardUrl(endpoint: string): string {
    return `${this.apiDashboard}${endpoint}?username=${this.username}&api_key=${this.apiKey}`;
  }
  
  private storageUrl(endpoint: string): string {
    return `${this.apiStorage}${endpoint}?username=${this.username}&api_key=${this.apiKey}`;
  }
  
  async startTransfer(dto: CreateDocumentDto): Promise<{ transferId: string }> {
    const url = this.dashboardUrl('/api/transfer/start_transfer/');
    const transferData = {
      name: dto.name,
      type: 'standard',
      accession: dto.documentId || Date.now().toString(),
      paths: [dto.filePath],
    };
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, transferData).pipe(
          take(1),
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data || error.message);
            throw new Error('Erro ao iniciar transferência');
          }),
        ),
      );
      return { transferId: data.uuid };
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('Erro ao iniciar o upload');
    }
  }

  async approveTransfer(directory: string, type = 'standard'): Promise<any> {
    const url = this.dashboardUrl('/api/transfer/approve/');

    const approvalData = {
      type,
      directory,
    };
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, approvalData).pipe(
          take(1),
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data || error.message);
            throw new Error('Erro ao aprovar transferência');
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('Erro ao aprovar a transferência');
    }
  }

  async getTransferStatus(id: string): Promise<TransferStatus> {
    const url = this.dashboardUrl(`/api/transfer/status/${id}/`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          take(1),
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data || error.message);
            throw new Error('Erro ao buscar status de transferência');
          }),
        ),
      );
      return data;
    } catch (error) {
      throw new Error('Erro ao buscar status da transferência');
    }
  }

  async dowloadAIP(id: string): Promise<any> {
    const url = this.storageUrl(`/api/v2beta/file/${id}/download/`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, { responseType: 'arraybuffer' }).pipe(
          take(1),
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data || error.message);
            throw new Error('Erro ao baixar o arquivo preservado');
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('Erro ao fazer download do arquivo');
    }
  }

  async processSIP(
    id: string,
    processingConfig: string = 'default',
  ): Promise<any> {
    const url = this.dashboardUrl(`/api/ingest/process/${id}/`);

    const processingData = {
      processing_config: processingConfig,
    };
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, processingData).pipe(
          take(1),
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data || error.message);
            throw new Error('Erro ao processar AIP');
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(error.message);
      throw new Error('Erro ao processar o AIP');
    }
  }

  async getUnapproved(): Promise<any> {
    const url = this.dashboardUrl('/api/transfer/unapproved/');

    const response = await firstValueFrom(
      this.httpService.get(url).pipe(
        take(1),
        catchError((error: AxiosError) => {
          this.logger.error(error.response?.data || error.message);
          throw new Error('Erro ao buscar status de transferência');
        }),
      ),
    );
    const status = response.data?.status;
    if (status === 'FALHA') {
      return status;
    }
    return null;
  }

  async getCompleted(): Promise<any> {
    const url = this.dashboardUrl('/api/transfer/completed/');

    const response = await firstValueFrom(
      this.httpService.get(url).pipe(
        take(1),
        catchError((error: AxiosError) => {
          this.logger.error(error.response?.data || error.message);
          throw new Error('Erro ao buscar status de transferência');
        }),
      ),
    );
    const status = response.data?.status;
    if (status === 'PRESERVADO') {
      return status;
    }
    return null;
  }

  async remove(id: string) {
    const transfersUnnaproved = await this.getUnapproved();
    const foundTransfer = transfersUnnaproved?.results?.find(
      (x) => x.uuid == id,
    );

    if (!foundTransfer) {
      throw new Error('Transferência não encontrada');
    }
    const url = this.dashboardUrl(`/api/transfer/${id}/delete/`);

    await firstValueFrom(
      this.httpService.delete(url).pipe(
        take(1),
        catchError((error: AxiosError) => {
          this.logger.error(error.response?.data || error.message);
          throw new Error('Erro ao remover transferência');
        }),
      ),
    );
    return { message: 'Transferência removida com sucesso' };
  }

  async monitoringStatus( id: string, callback: (status: any) => void): Promise<void> {//analisar se status de iniciado cai aqui
    const checkStatus = async () => {
      try {
        const statusData = await this.getTransferStatus(id);

        if (statusData.status === 'PRESERVADO') {
          callback({ success: true, status: statusData });
          return;
        } else if (statusData.status === 'FALHA') {
          callback({ success: false, status: statusData });
          return;
        }
        setTimeout(checkStatus, 1000);
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    };
    checkStatus();
  }
}
