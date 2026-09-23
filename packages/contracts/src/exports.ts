import { z } from "zod";

export const ExportFormatSchema = z.enum(["PDF", "DOCX"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const CreateExportRequestSchema = z.object({
  format: ExportFormatSchema,
});
export type CreateExportRequest = z.infer<typeof CreateExportRequestSchema>;

export const ExportSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  format: ExportFormatSchema,
  fileUrl: z.string(),
  createdAt: z.string(),
});
export type Export = z.infer<typeof ExportSchema>;
