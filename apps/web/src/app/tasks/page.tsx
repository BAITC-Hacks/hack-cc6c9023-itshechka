"use client";

import { CalendarDays, Check, ListChecks, Pencil, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDemoStore } from "@/features/demo/demo-store";
import type { MeetingTask } from "@/features/meetings/types";
import { formatDate } from "@/lib/utils";

const statusFilters: { value: "all" | MeetingTask["status"]; label: string }[] = [{ value: "all", label: "Все" }, { value: "new", label: "Новые" }, { value: "in_progress", label: "В работе" }, { value: "overdue", label: "Просрочено" }, { value: "done", label: "Выполнено" }];
const today = new Date("2026-09-23T00:00:00");

export default function TasksPage() {
  const store = useDemoStore();
  const [status, setStatus] = useState<(typeof statusFilters)[number]["value"]>("all");
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [deadline, setDeadline] = useState<"all" | "overdue" | "week">("all");
  const [sort, setSort] = useState<"due" | "priority" | "status">("due");
  const [taskDraft, setTaskDraft] = useState<MeetingTask | null>(null);
  const [completeTask, setCompleteTask] = useState<MeetingTask | null>(null);
  const tasks = useMemo(() => store.meetings.flatMap((meeting) => meeting.tasks.map((task) => ({ ...task, meetingId: meeting.id }))), [store.meetings]);
  const assignees = useMemo(() => Array.from(new Set(tasks.map((task) => task.assignee))).sort(), [tasks]);
  const overdueCount = tasks.filter((task) => task.status === "overdue").length;
  const activeCount = tasks.filter((task) => task.status !== "done").length;
  const completionRate = tasks.length ? Math.round(tasks.filter((task) => task.status === "done").length / tasks.length * 100) : 0;
  const filtered = useMemo(() => tasks.filter((task) => {
    const searchable = `${task.title} ${task.assignee}`.toLowerCase();
    const due = new Date(`${task.dueDate.slice(0, 10)}T00:00:00`);
    const inWeek = due >= today && due <= new Date("2026-09-30T23:59:59");
    return (status === "all" || task.status === status)
      && (!query || searchable.includes(query.toLowerCase()))
      && (assignee === "all" || task.assignee === assignee)
      && (deadline === "all" || (deadline === "overdue" ? task.status === "overdue" || due < today && task.status !== "done" : inWeek));
  }).sort((a, b) => {
    if (sort === "priority") return Number(b.priority === "high") - Number(a.priority === "high");
    if (sort === "status") return a.status.localeCompare(b.status);
    return a.dueDate.localeCompare(b.dueDate);
  }), [tasks, status, query, assignee, deadline, sort]);

  const saveTask = () => {
    if (!taskDraft?.title.trim() || !taskDraft.assignee.trim() || !taskDraft.dueDate) { toast.error("Заполните обязательные поля"); return; }
    store.updateTask({ ...taskDraft, title: taskDraft.title.trim(), assignee: taskDraft.assignee.trim() });
    setTaskDraft(null); toast.success("Поручение обновлено");
  };
  const markDone = () => {
    if (!completeTask) return;
    store.updateTask({ ...completeTask, status: "done" });
    setCompleteTask(null); toast.success("Поручение отмечено выполненным");
  };
  const reset = () => { store.reset(); setQuery(""); setStatus("all"); setAssignee("all"); setDeadline("all"); toast.success("Demo-данные восстановлены"); };

  if (!store.hydrated) return <div className="page"><div className="skeleton skeleton--title" /><div className="skeleton skeleton--panel" /></div>;
  return <div className="page"><section className="page-heading compact"><div><span className="eyebrow">Контроль исполнения</span><h1>Поручения</h1><p>Единый список задач из всех протоколов. Все изменения сохраняются после обновления страницы.</p></div><Button variant="secondary" onClick={reset}><RotateCcw size={16} />Сбросить demo</Button></section>
    <div className="task-summary"><div><span className="summary-dot summary-dot--blue" /><strong>{activeCount}</strong><small>активных</small></div><div><span className="summary-dot summary-dot--red" /><strong>{overdueCount}</strong><small>просрочено</small></div><div><span className="summary-dot summary-dot--green" /><strong>{completionRate}%</strong><small>выполнено</small></div></div>
    <div className="toolbar tasks-toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти поручение или ответственного" /></label><div className="filter-tabs">{statusFilters.map((item) => <button key={item.value} onClick={() => setStatus(item.value)} className={status === item.value ? "is-active" : ""}>{item.label}</button>)}</div></div>
    <div className="advanced-filters"><span><SlidersHorizontal size={16} />Фильтры</span><label><span className="sr-only">Ответственный</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="all">Все ответственные</option>{assignees.map((name) => <option key={name}>{name}</option>)}</select></label><label><span className="sr-only">Срок</span><select value={deadline} onChange={(event) => setDeadline(event.target.value as typeof deadline)}><option value="all">Любой срок</option><option value="overdue">Срок прошёл</option><option value="week">До конца недели</option></select></label><label><span className="sr-only">Сортировка</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="due">Сначала ближайшие</option><option value="priority">Сначала важные</option><option value="status">По статусу</option></select></label><strong>{filtered.length} из {tasks.length}</strong></div>
    <section className="tasks-table-wrap"><table className="tasks-table"><thead><tr><th>Поручение</th><th>Ответственный</th><th>Срок</th><th>Статус</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>{filtered.map((task) => <tr key={`${task.meetingId}-${task.id}`}><td><div className="task-title"><span className={task.priority === "high" ? "priority-mark is-high" : "priority-mark"} /><div><strong>{task.title}</strong><span>Протокол: {store.getMeeting(task.meetingId)?.title ?? "Совещание"}</span></div></div></td><td data-label="Ответственный">{task.assignee}</td><td data-label="Срок"><span className="date-cell"><CalendarDays size={15} />{formatDate(task.dueDate)}</span></td><td data-label="Статус"><StatusBadge status={task.status} /></td><td><div className="row-actions">{task.status !== "done" && <button className="icon-action" onClick={() => setCompleteTask(task)} aria-label={`Отметить выполненным: ${task.title}`}><Check size={18} /></button>}<button className="icon-action" onClick={() => setTaskDraft({ ...task })} aria-label={`Редактировать: ${task.title}`}><Pencil size={17} /></button></div></td></tr>)}</tbody></table>
      {filtered.length === 0 && <div className="empty-state"><ListChecks size={28} /><h2>Ничего не найдено</h2><p>Измените фильтры или поисковый запрос.</p></div>}
    </section>
    <Sheet open={Boolean(taskDraft)} title="Редактировать поручение" description="Поля обновятся и в исходном протоколе" onClose={() => setTaskDraft(null)}>{taskDraft && <div className="sheet-form"><label>Текст поручения<textarea value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} /></label><label>Ответственный<input className="input" value={taskDraft.assignee} onChange={(event) => setTaskDraft({ ...taskDraft, assignee: event.target.value })} /></label><div className="field-grid"><label>Срок<input className="input" type="date" value={taskDraft.dueDate.slice(0, 10)} onChange={(event) => setTaskDraft({ ...taskDraft, dueDate: event.target.value })} /></label><label>Приоритет<select className="input" value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value as MeetingTask["priority"] })}><option value="normal">Обычный</option><option value="high">Высокий</option></select></label></div><label>Статус<select className="input" value={taskDraft.status} onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value as MeetingTask["status"] })}><option value="new">Новое</option><option value="in_progress">В работе</option><option value="overdue">Просрочено</option><option value="done">Выполнено</option></select></label><div className="sheet-actions"><Button type="button" variant="ghost" onClick={() => setTaskDraft(null)}>Отмена</Button><Button type="button" onClick={saveTask}>Сохранить</Button></div></div>}</Sheet>
    <ConfirmDialog open={Boolean(completeTask)} title="Завершить поручение?" description={completeTask ? `«${completeTask.title}» будет отмечено выполненным.` : ""} confirmLabel="Да, завершить" onClose={() => setCompleteTask(null)} onConfirm={markDone} />
  </div>;
}
