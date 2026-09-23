import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Every non-2xx response follows the contract in @hackalem/contracts:
 * { statusCode, code, message, details? }
 */
export class ApiException extends HttpException {
  constructor(
    statusCode: HttpStatus,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super({ statusCode, code, message, details }, statusCode);
  }
}

export class NotFoundError extends ApiException {
  constructor(resource: string, id: string) {
    super(HttpStatus.NOT_FOUND, "NOT_FOUND", `${resource} ${id} not found`);
  }
}

export class ValidationError extends ApiException {
  constructor(details: unknown) {
    super(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid request payload", details);
  }
}

export class ConflictError extends ApiException {
  constructor(message: string) {
    super(HttpStatus.CONFLICT, "CONFLICT", message);
  }
}
