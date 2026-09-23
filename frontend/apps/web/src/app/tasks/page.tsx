"use client";

import type { MeetingTask } from "@repo/contracts";
import { CalendarDays, Check, ChevronDown, ListChecks, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { allTasks } from "@/features/meetings/mock-data";
import { formatDate } from "@/lib/utils";

const filters: { value: "all" | MeetingTask["status"]; label: string }[] = [{ value: "all", label: "Все" }, { value: "new", label: "Новые" }, { value: "in_progress", label: "В работе" }, { value: "overdue", label: "Просрочено" }, { value: "done", label: "Выполнено" }];

export default function TasksPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [tasks, setTasks] = useState(allTasks.slice(0, 8).map((task, index) => index === 3 ? { ...task, status: "overdue" as const } : task));
  const filtered = useMemo(() => filter === "all" ? tasks : tasks.filter((task) => task.status === filter), [filter, tasks]);
  const markDone = (id: string) => { setTasks((current) => current.map((task) => task.id === id ? { ...task, status: "done" } : task)); toast.success("Поручение отмечено выполненным"); };
  return <div className="page"><section className="page-heading compact"><div><span className="eyebrow">Контроль исполнения</span><h1>Поручения</h1><p>Единый список задач из всех протоколов.</p></div></section>
    <div className="task-summary"><div><span className="summary-dot summary-dot--blue" /><strong>18</strong><small>активных</small></div><div><span className="summary-dot summary-dot--red" /><strong>3</strong><small>просрочено</small></div><div><span className="summary-dot summary-dot--green" /><strong>87%</strong><small>в срок</small></div></div>
    <div className="toolbar"><label className="search-field"><Search size={18} /><input placeholder="Найти поручение" /></label><div className="filter-tabs">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={filter === item.value ? "is-active" : ""}>{item.label}</button>)}</div></div>
    <section className="tasks-table-wrap"><table className="tasks-table"><thead><tr><th>Поручение</th><th>Ответственный</th><th>Срок</th><th>Статус</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>{filtered.map((task, index) => <tr key={`${task.id}-${index}`}><td><div className="task-title"><span className={task.priority === "high" ? "priority-mark is-high" : "priority-mark"} /><div><strong>{task.title}</strong><span>Протокол: производственные показатели</span></div></div></td><td>{task.assignee}</td><td><span className="date-cell"><CalendarDays size={15} />{formatDate(task.dueDate)}</span></td><td><StatusBadge status={task.status} /></td><td>{task.status !== "done" && <button className="icon-action" onClick={() => markDone(task.id)} aria-label={`Отметить выполненным: ${task.title}`}><Check size={18} /></button>}<button className="icon-action" aria-label="Дополнительные действия"><ChevronDown size={18} /></button></td></tr>)}</tbody></table>
      {filtered.length === 0 && <div className="empty-state"><ListChecks size={28} /><h2>В этой категории нет поручений</h2><p>Все задачи уже распределены по другим статусам.</p></div>}
    </section>
  </div>;
}

