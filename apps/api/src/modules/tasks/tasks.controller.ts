import { Body, Controller, Get, Param, Patch, Query, UsePipes } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UpdateTaskRequestSchema } from "@hackalem/contracts";
import { TasksService } from "./tasks.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@ApiTags("tasks")
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get("tasks")
  listAll() {
    return this.tasks.listAll();
  }

  @Get("meetings/:id/tasks")
  listByMeeting(@Param("id") id: string, @Query("topicId") topicId?: string) {
    return this.tasks.listByMeeting(id, topicId);
  }

  @Patch("tasks/:id")
  @UsePipes(new ZodValidationPipe(UpdateTaskRequestSchema))
  update(@Param("id") id: string, @Body() dto: any) {
    return this.tasks.update(id, dto);
  }
}
