import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { Packer } from "docx";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundError } from "../../common/api-error";
import { serializeExport } from "../../common/serialize";
import { buildProtocolDocument, ProtocolTopic } from "./protocol-docx.builder";
import type { Env } from "../../config/env.schema";

const execFileAsync = promisify(execFile);

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(meetingId: string, format: "PDF" | "DOCX") {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundError("Meeting", meetingId);

    const [topics, tasks, utterances, participants, summaries] = await Promise.all([
      this.prisma.topic.findMany({ where: { meetingId }, orderBy: { order: "asc" } }),
      this.prisma.task.findMany({ where: { meetingId }, include: { responsible: true } }),
      this.prisma.utterance.findMany({
        where: { meetingId },
        orderBy: { order: "asc" },
        include: { participant: true },
      }),
      this.prisma.participant.findMany({ where: { meetingId } }),
      this.prisma.summary.findMany({ where: { meetingId } }),
    ]);

    const topicList: ProtocolTopic[] =
      topics.length > 0
        ? topics.map((t) => ({
            title: t.title,
            utterances: utterances
              .filter((u) => isUtteranceInTopicRange(u.order, t.startOrder, t.endOrder))
              .map((u) => ({
                speakerName: u.participant?.fullName ?? u.participant?.speakerTag ?? "Неизвестный",
                speakerRole: u.participant?.role ?? null,
                text: u.text,
              })),
            tasks: tasks
              .filter((task) => task.topicId === t.id)
              .map((task) => ({
                description: task.description,
                responsible: task.responsible?.fullName ?? task.responsibleRaw ?? "—",
                due: task.dueRaw ?? (task.dueDate ? task.dueDate.toLocaleDateString("ru-RU") : "—"),
              })),
            summary: summaries.find((s) => s.topicId === t.id)?.text ?? null,
          }))
        : [
            {
              title: meeting.title,
              utterances: utterances.map((u) => ({
                speakerName: u.participant?.fullName ?? u.participant?.speakerTag ?? "Неизвестный",
                speakerRole: u.participant?.role ?? null,
                text: u.text,
              })),
              tasks: tasks.map((task) => ({
                description: task.description,
                responsible: task.responsible?.fullName ?? task.responsibleRaw ?? "—",
                due: task.dueRaw ?? (task.dueDate ? task.dueDate.toLocaleDateString("ru-RU") : "—"),
              })),
              summary: null,
            },
          ];

    const overallSummary = summaries.find((s) => s.topicId === null)?.text ?? null;

    const doc = buildProtocolDocument({
      title: meeting.title,
      organization: meeting.organization,
      createdAt: meeting.createdAt,
      topics: topicList,
      overallSummary,
    });

    const dir = this.config.get("EXPORT_STORAGE_DIR", { infer: true });
    fs.mkdirSync(dir, { recursive: true });
    const docxPath = path.join(dir, `${meetingId}.docx`);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);

    let fileUrl = docxPath;
    if (format === "PDF") {
      fileUrl = await this.convertToPdf(docxPath, dir);
    }

    const exportRecord = await this.prisma.export.create({
      data: { meetingId, format: fileUrl.endsWith(".pdf") ? "PDF" : "DOCX", fileUrl },
    });
    return serializeExport(exportRecord);
  }

  private async convertToPdf(docxPath: string, dir: string): Promise<string> {
    try {
      // Требует libreoffice (soffice) на хосте, как и docx-skill в этом окружении.
      await execFileAsync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, docxPath]);
      const pdfPath = docxPath.replace(/\.docx$/, ".pdf");
      if (!fs.existsSync(pdfPath)) throw new Error("soffice did not produce a PDF");
      return pdfPath;
    } catch (err) {
      this.logger.warn(`PDF conversion failed (soffice not available?): ${(err as Error).message}`);
      // Fallback: отдаём DOCX, если PDF-конвертер недоступен в окружении.
      return docxPath;
    }
  }

  async download(exportId: string) {
    const exportRecord = await this.prisma.export.findUnique({ where: { id: exportId } });
    if (!exportRecord) throw new NotFoundError("Export", exportId);
    return exportRecord;
  }
}

function isUtteranceInTopicRange(order: number, startOrder: number | null, endOrder: number | null): boolean {
  // Topic.startOrder/endOrder приходят от AI worker'а (см. AiTopicSchema) и
  // задают диапазон Utterance.order, относящийся к теме — так собираем
  // "Часть 1 / Часть 2" ровно как в эталонном протоколе.
  if (startOrder == null || endOrder == null) return true; // нет диапазона -> не фильтруем (одна тема на всю встречу)
  return order >= startOrder && order <= endOrder;
}
