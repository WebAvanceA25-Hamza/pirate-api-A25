// Fait à l'aide de ChatGPT

// ErrorCode est pratiquement un enum avec les types d'erreur possibles

// AppErrorOptions contient statusCode (le code HTTP), code (le code de plus tôt),
// isOperational pour savoir si l'erreur était attendue, details pour des détails
// supplémentaires et cause pour l'erreur de base qui l'a causée

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_INVALID_CREDENTIALS"
  | "INTERNAL_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "CANNOT_REGISTER_WHEN_LOGGED_IN"
  | "REMOTE_SERVICE_ERROR";

interface AppErrorOptions {
  statusCode?: number;
  code?: ErrorCode;
  isOperational?: boolean;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public isOperational: boolean;
  public details?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    if (options.cause) (this as any).cause = options.cause;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
