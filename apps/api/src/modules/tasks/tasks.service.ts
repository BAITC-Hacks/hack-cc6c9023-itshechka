import { Injectable } from "@nestjs/common";
import type { UpdateTaskRequest } from "@hackalem/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundError } from "../../common/api-error";
import { serializeTask } from "../../common/serialize";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listByMeeting(meetingId: string, topicId?: string) {
    const tasks = await this.prisma.task.findMany({
      where: { meetingId, ...(topicId ? { topicId } : {}) },
      include: { responsible: true },
      orderBy: { createdAt: "asc" },
    });
    return { data: tasks.map((task) => ({ ...serializeTask(task), responsibleRaw: task.responsibleRaw ?? task.responsible?.fullName ?? task.responsible?.speakerTag ?? null })) };
  }

  async listAll() {
    const tasks = await this.prisma.task.findMany({ include: { responsible: true }, orderBy: { createdAt: "desc" } });
    return { data: tasks.map((task) => ({ ...serializeTask(task), responsibleRaw: task.responsibleRaw ?? task.responsible?.fullName ?? task.responsible?.speakerTag ?? null })) };
  }

  async update(id: string, dto: UpdateTaskRequest) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Task", id);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        description: dto.description,
        responsibleId: dto.responsibleId,
        responsibleRaw: dto.responsibleRaw,
        dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
        dueRaw: dto.dueRaw,
        status: dto.status,
        priority: dto.priority,
        topicId: dto.topicId,
      },
    });
    return serializeTask(task);
  }
}
