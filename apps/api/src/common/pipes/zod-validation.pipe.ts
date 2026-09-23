import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";
import { ZodSchema } from "zod";
import { ValidationError } from "../api-error";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Method-scoped pipes also receive route params and query values.
    if (metadata.type !== "body") return value;
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError(result.error.flatten());
    }
    return result.data;
  }
}
