import { httpClient } from '@/services/http-client';
import type { BulkUploadRepository } from '../domain/bulk-upload.repository';
import type { BulkUploadTarget, UploadResult } from '../domain/bulk-upload.entity';
import type { UserRowInput, PoiRowInput } from '../domain/bulk-upload.schema';

const TIPO_MAP: Record<BulkUploadTarget, string> = {
  usuarios: 'estudiante',
  pois: 'poi',
};

export class MongoBulkUploadRepository implements BulkUploadRepository {
  async uploadUsers(rows: UserRowInput[], token: string, fileUri: string, fileName: string, fileMimeType: string): Promise<UploadResult> {
    return this._send('usuarios', rows, token, fileUri, fileName, fileMimeType);
  }

  async uploadPois(rows: PoiRowInput[], token: string, fileUri: string, fileName: string, fileMimeType: string): Promise<UploadResult> {
    return this._send('pois', rows, token, fileUri, fileName, fileMimeType);
  }

  async upload(target: BulkUploadTarget, rows: (UserRowInput | PoiRowInput)[], token: string, fileUri: string, fileName: string, fileMimeType: string): Promise<UploadResult> {
    return this._send(target, rows, token, fileUri, fileName, fileMimeType);
  }

  private async _send(target: BulkUploadTarget, _rows: unknown[], token: string, fileUri: string, fileName: string, fileMimeType: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('tipo', TIPO_MAP[target]);
    const blob = await fetch(fileUri).then((r) => r.blob());
    formData.append('file', blob, fileName);
    const { data, error } = await httpClient.upload<UploadResult>('/admin/upload', formData, token);
    if (error || !data) throw new Error(error ?? 'Error desconocido al cargar los datos.');
    return data;
  }
}

export const bulkUploadRepository = new MongoBulkUploadRepository();
