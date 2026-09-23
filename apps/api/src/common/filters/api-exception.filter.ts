import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "object" && body !== null && "code" in body) {
        res.status(status).json(body);
        return;
      }
      res.status(status).json({
        statusCode: status,
        code: HttpStatus[status] ?? "ERROR",
        message: exception.message,
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Unexpected server error",
    });
  }
}
