import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import * as qs from 'qs';
import { catchError, firstValueFrom, take } from 'rxjs';
import { TransferData } from 'src/document/dto/transfer-data.dto';

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

  async startTransfer(transferData: TransferData): Promise<{ transferId: string }> {
    const url = `${this.apiDashboard}/api/transfer/start_transfer/`;

    if (!transferData.name || !transferData.paths || transferData.paths.length === 0) {
      throw new Error('Parâmetros obrigatórios faltando: name ou paths');
    }

    const params = new URLSearchParams();
    params.append('username', 'test');
    params.append('api_key', 'test');
    params.append('name', transferData.name);
    params.append('type', transferData.type || 'standard');
    params.append('accession', transferData.accession || '');

    transferData.paths.forEach((path, index) => {
      params.append(`paths[${index}]`, path);
    });

    (transferData.row_ids || ['']).forEach((rowId, index) => {
      params.append(`row_ids[${index}]`, rowId);
    });

    this.logger.debug(`Enviando para Archivematica: ${url}`);
    this.logger.debug(`Dados da requisição: ${params.toString()}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          maxRedirects: 0
        })
      );

      if (response.data.error) {
        throw new Error(response.data.message || 'Erro desconhecido no Archivematica');
      }

      if (!response.data.uuid) {
        throw new Error('Resposta inválida do Archivematica - UUID ausente');
      }

      return { transferId: response.data.uuid };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Erro completo: ${JSON.stringify({
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
        config: {
          url: axiosError.config?.url,
          data: axiosError.config?.data
        }
      }, null, 2)}`);
      throw new Error('Falha ao iniciar transferência');
    }
  }

  async approveTransfer(transferId: string, type = 'standard'): Promise<any> {
    const url = this.dashboardUrl('/api/transfer/approve/');

    const approvalData = qs.stringify({
      type,
      directory: transferId,
    });

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, approvalData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }).pipe(
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

  async addMetadataFile(sipUuid: string, sourceLocationUuid: string, filePath: string) {
    const url = `${this.dashboardUrl}/api/ingest/copy_metadata_files/`;

    const sourcePath = `${sourceLocationUuid}:${filePath}`;
    const sourcePathBase64 = Buffer.from(sourcePath).toString('base64');

    const payload = {
      sip_uuid: sipUuid,
      source_paths: [sourcePathBase64],
    };
    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url + `?username=${this.username}&api_key=${this.apiKey}`, payload, { headers }),
      );
      return data;
    } catch (error) {
      this.logger.error('Erro ao adicionar metadados:', error.response?.data || error.message);
      throw new Error('Erro ao adicionar metadados');
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

  async monitoringStatus(id: string, callback: (status: any) => void): Promise<void> {
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

  async waitForSipFromTransfer(transferId: string): Promise<string> {
    const statusUrl = `${this.dashboardUrl}/ingest/status/${transferId}/?username=${this.username}&api_key=${this.apiKey}`;

    let attempts = 0;
    const maxAttempts = 20;
    const delay = 5000;

    while (attempts < maxAttempts) {
      try {
        const { data } = await firstValueFrom(this.httpService.get(statusUrl));
        if (data && data.uuid && data.status !== 'PROCESSING') {
          this.logger.log(`SIP encontrado: ${data.uuid}`);
          return data.uuid;
        }
      } catch (err) {
        this.logger.warn(`Tentativa ${attempts + 1}: SIP ainda não disponível.`);
      }

      attempts++;
      await new Promise((res) => setTimeout(res, delay));
    }

    throw new Error('Tempo limite excedido aguardando criação do SIP');
  }

}
