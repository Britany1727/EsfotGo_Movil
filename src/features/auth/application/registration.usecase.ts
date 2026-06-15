import { IAuthRepository, RegistrationResult } from '../domain/auth.repository';
import type { RegisterInput } from '../domain/auth.schema';
import { AppError, ValidationError, AuthError } from '@/core/errors/app-error';
import {
  REGISTRATION_ERROR_CODES,
  REGISTRATION_ERROR_MESSAGES,
} from '../domain/registration.entity';

export class RegisterUserUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: RegisterInput, role: 'estudiante' | 'docente' = 'estudiante'): Promise<RegistrationResult> {
    this.validateDomain(input.email);
    this.validatePasswordStrength(input.password);

    try {
      const result =
        role === 'docente'
          ? await this.authRepository.signUpDocente(input)
          : await this.authRepository.signUp(input);
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw this.mapToRegistrationError(error);
      }
      throw new AppError(
        REGISTRATION_ERROR_MESSAGES[REGISTRATION_ERROR_CODES.UNKNOWN],
        REGISTRATION_ERROR_CODES.UNKNOWN
      );
    }
  }

  private validateDomain(email: string): void {
    const normalized = email.toLowerCase().trim();

    if (!normalized.endsWith('@epn.edu.ec')) {
      throw new ValidationError(
        REGISTRATION_ERROR_MESSAGES[REGISTRATION_ERROR_CODES.INVALID_DOMAIN]
      );
    }

    const localPart = normalized.split('@')[0];
    if (localPart.includes('+')) {
      throw new ValidationError('No se permiten alias de correo (formato usuario+alias@epn.edu.ec)');
    }

    if (localPart.length < 3) {
      throw new ValidationError('La parte local del correo debe tener al menos 3 caracteres');
    }
  }

  private validatePasswordStrength(password: string): void {
    const checks = [
      { test: () => password.length >= 12, msg: 'Mínimo 12 caracteres' },
      { test: () => /[A-Z]/.test(password), msg: 'Al menos una mayúscula' },
      { test: () => /[a-z]/.test(password), msg: 'Al menos una minúscula' },
      { test: () => /[0-9]/.test(password), msg: 'Al menos un número' },
    ];

    const failures = checks.filter((c) => !c.test()).map((c) => c.msg);

    if (failures.length > 0) {
      throw new ValidationError(`Contraseña débil: ${failures.join(', ')}`);
    }
  }

  private mapToRegistrationError(error: AppError): AppError {
    switch (error.code) {
      case 'EMAIL_ALREADY_EXISTS':
        return new AuthError(
          REGISTRATION_ERROR_MESSAGES[REGISTRATION_ERROR_CODES.EMAIL_ALREADY_EXISTS],
          REGISTRATION_ERROR_CODES.EMAIL_ALREADY_EXISTS
        );
      case 'AUTH_ERROR':
        if (error.message.includes('rate') || error.message.includes('too many')) {
          return new AuthError(
            REGISTRATION_ERROR_MESSAGES[REGISTRATION_ERROR_CODES.RATE_LIMITED],
            REGISTRATION_ERROR_CODES.RATE_LIMITED
          );
        }
        return error;
      default:
        return error;
    }
  }
}

export class ResendVerificationUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(email: string): Promise<void> {
    return this.authRepository.resendVerificationEmail(email);
  }
}

export class CheckVerificationUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(email: string): Promise<boolean> {
    return this.authRepository.checkEmailVerification(email);
  }
}
