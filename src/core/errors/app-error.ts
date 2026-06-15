export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  toUserMessage(): string {
    return this.message;
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR', cause?: unknown) {
    super(message, code, 401, cause);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Error de conexión. Verifica tu internet.', cause?: unknown) {
    super(message, 'NETWORK_ERROR', 0, cause);
    this.name = 'NetworkError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Error interno del servidor', statusCode: number = 500, cause?: unknown) {
    super(message, 'SERVER_ERROR', statusCode, cause);
    this.name = 'ServerError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'La solicitud excedió el tiempo de espera', cause?: unknown) {
    super(message, 'TIMEOUT', 0, cause);
    this.name = 'TimeoutError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado', code: string = 'NOT_FOUND') {
    super(message, code, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code, 422);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'No tienes permisos para realizar esta acción') {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

export function mapApiError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const err = error as Record<string, unknown>;
  const message = (err?.message as string) || 'Ha ocurrido un error inesperado';

  if (message.includes('buffering timed out')) {
    return new ServerError('Servidor temporalmente no disponible');
  }

  if (message.includes('Network request failed') || message.includes('Network Error')) {
    return new NetworkError();
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return new TimeoutError();
  }

  if (message.includes('JWT') || message.includes('token') || message.includes('session')) {
    return new AuthError('Sesión expirada, por favor inicia sesión nuevamente');
  }

  if (message.includes('duplicate key') || message.includes('already registered')) {
    return new ValidationError('El recurso ya existe');
  }

  return new AppError(message, 'UNKNOWN_ERROR', 500, error);
}

export function mapSupabaseError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const err = error as Record<string, unknown>;

  if (err?.code === 'PGRST116') {
    return new NotFoundError();
  }

  if (err?.code === '42501' || err?.code === 'P0001') {
    return new PermissionError();
  }

  return mapApiError(error);
}
