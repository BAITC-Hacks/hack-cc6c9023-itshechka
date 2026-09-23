import type { MeetingTask } from "@repo/contracts";
import { AlertCircle, CheckCircle2, CircleDot, Clock3 } from "lucide-react";

const labels: Record<MeetingTask["status"], string> = {
  new: "Новое",
  in_progress: "В работе",
  overdue: "Просрочено",
  done: "Выполнено",
};

export function StatusBadge({ status }: { status: MeetingTask["status"] }) {
  const Icon = status === "done" ? CheckCircle2 : status === "overdue" ? AlertCircle : status === "in_progress" ? Clock3 : CircleDot;
  return <span className={`status status--${status}`}><Icon size={14} aria-hidden="true" />{labels[status]}</span>;
}

