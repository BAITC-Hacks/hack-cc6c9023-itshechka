import { Controller, Get, Param, Post, Res, Body, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import * as path from "path";
import { CreateExportRequestSchema } from "@hackalem/contracts";
import { ExportsService } from "./exports.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@ApiTags("exports")
@Controller()
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Post("meetings/:id/export")
  @UsePipes(new ZodValidationPipe(CreateExportRequestSchema))
  create(@Param("id") id: string, @Body() dto: any) {
    return this.exports.create(id, dto.format);
  }

  @Get("exports/:id/download")
  async download(@Param("id") id: string, @Res() res: Response) {
    const record = await this.exports.download(id);
    res.download(path.resolve(record.fileUrl));
  }
}
