import { PipeTransform, Injectable } from "@nestjs/common";
import { ZodSchema } from "zod";
import { ValidationError } from "../api-error";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError(result.error.flatten());
    }
    return result.data;
  }
}
