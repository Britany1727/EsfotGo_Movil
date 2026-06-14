import { parseFile, pickFile } from '../infrastructure/file-parser';
import { UserRowSchema, PoiRowSchema } from '../domain/bulk-upload.schema';
import type { BulkRow, BulkUploadTarget, UploadResult } from '../domain/bulk-upload.entity';
import type { BulkUploadRepository } from '../domain/bulk-upload.repository';

export interface PickAndParseResult {
  rows: BulkRow[];
  fileName: string;
  fileUri: string;
  fileMimeType: string;
}

export async function pickAndParseFile(
  target: BulkUploadTarget
): Promise<PickAndParseResult | null> {
  const picked = await pickFile();
  if (!picked.ok) {
    if (picked.cancelled) return null;
    throw new Error(picked.error);
  }

  const parsed = await parseFile(picked.uri, picked.name);
  const schema = target === 'usuarios' ? UserRowSchema : PoiRowSchema;

  const rows: BulkRow[] = parsed.rows.map((raw, index) => {
    const result = schema.safeParse(raw);
    if (result.success) {
      return { index, raw, status: 'valid', errors: [] };
    }
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    return { index, raw, status: 'invalid', errors };
  });

  return { rows, fileName: parsed.fileName, fileUri: picked.uri, fileMimeType: picked.mimeType };
}

export async function submitValidRows(
  rows: BulkRow[],
  target: BulkUploadTarget,
  token: string,
  repository: BulkUploadRepository,
  fileUri: string,
  fileName: string,
  fileMimeType: string
): Promise<UploadResult> {
  return repository.upload(target, rows as unknown as Parameters<typeof repository.upload>[1], token, fileUri, fileName, fileMimeType);
}
