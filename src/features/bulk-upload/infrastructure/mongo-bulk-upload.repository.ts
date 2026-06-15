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
    const { data, error } = await httpClient.upload<Record<string, unknown>>('/admin/upload', formData, token);
    if (error || !data) throw new Error(error ?? 'Error desconocido al cargar los datos.');
    // Backend returns { ok, totalFilas, guardados, errores[] } — map to UploadResult
    return {
      total: (data.totalFilas as number) ?? 0,
      inserted: (data.guardados as number) ?? 0,
      failed: ((data.errores as unknown[])?.length) ?? 0,
      errors: (data.errores as unknown[])?.map((e: unknown, i: number) => ({
        index: i,
        row: (e as Record<string, unknown>)?.row ?? {},
        reason: (e as Record<string, unknown>)?.reason as string ?? 'Error desconocido',
      })) ?? [],
    };
  }
}

export const bulkUploadRepository = new MongoBulkUploadRepository();
