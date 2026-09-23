"use client";

import { AlertTriangle, ArrowRight, AudioLines, CalendarClock, CheckCircle2, ChevronRight, Clock3, FileAudio, ListChecks, Plus, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/features/auth/auth-provider";
import { useMeetings, useTasks } from "@/features/meetings/hooks";
import { useDemoStore } from "@/features/demo/demo-store";
import { USE_MOCKS } from "@/features/meetings/api";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: meetings, isLoading, isError, refetch } = useMeetings();
  const { data: apiTasks = [], isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const store = useDemoStore();
  const visibleMeetings = USE_MOCKS ? (store.hydrated ? store.meetings : meetings) : meetings;
  const allTasks = USE_MOCKS ? store.meetings.flatMap((meeting) => meeting.tasks.map((task) => ({ ...task, meetingId: meeting.id }))) : apiTasks;
  const activeTasks = allTasks.filter((task) => task.status !== "done").length;
  const completedRate = allTasks.length ? Math.round(allTasks.filter((task) => task.status === "done").length / allTasks.length * 100) : 0;
  const readyMeetings = visibleMeetings?.filter((meeting) => meeting.status === "ready") ?? [];
  const upcomingTasks = allTasks.filter((task) => task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  const overdueTasks = allTasks.filter((task) => task.status === "overdue").length;
  const stats = [
    { label: "Всего совещаний", value: String(visibleMeetings?.length ?? 0), note: "единый архив записей", icon: AudioLines, tone: "blue" },
    { label: "Активных поручений", value: String(activeTasks), note: `${overdueTasks} требуют внимания`, icon: ListChecks, tone: "violet" },
    { label: "Исполнено", value: `${completedRate}%`, note: "по всем протоколам", icon: CheckCircle2, tone: "green" },
    { label: "Готовых протоколов", value: String(readyMeetings.length), note: "можно проверять", icon: Clock3, tone: "amber" },
  ];
  const firstName = user?.fullName.split(" ")[0] ?? "коллега";
  const today = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return <div className="page dashboard-page">
    <section className="page-heading dashboard-welcome"><div><span className="eyebrow">{today}</span><h1>Добро пожаловать, {firstName}</h1><p>Все важные решения, поручения и протоколы — в одном рабочем пространстве.</p></div><Button asChild size="lg"><Link href="/new"><Plus size={19} />Создать протокол</Link></Button></section>
    <section className="stats-grid" aria-label="Основные показатели">{stats.map((stat) => <Card key={stat.label} className="stat-card"><span className={`icon-box icon-box--${stat.tone}`}><stat.icon size={20} /></span><div className="stat-card__value">{stat.value}</div><div className="stat-card__label">{stat.label}</div><div className="stat-card__note">{stat.note}</div></Card>)}</section>
    <section className="focus-card"><div className="focus-card__glow" /><div className="focus-card__icon"><Sparkles size={23} /></div><div className="focus-card__copy"><span className="focus-card__label">{readyMeetings[0] ? "Готово к проверке" : "Быстрый старт"}</span><h2>{readyMeetings[0]?.title ?? "Создайте первый протокол"}</h2><p>{readyMeetings[0] ? "ИИ подготовил транскрипт, саммари и поручения. Проверьте результат перед рассылкой." : "Загрузите запись — HATTAMA автоматически соберёт понятный итог встречи."}</p></div><Button asChild variant="secondary"><Link href={readyMeetings[0] ? `/meetings/${readyMeetings[0].id}` : "/new"}>{readyMeetings[0] ? "Открыть протокол" : "Начать"}<ArrowRight size={18} /></Link></Button></section>
    <div className="dashboard-grid">
      <section className="section-panel recent-panel"><div className="section-header"><div><h2>Последние совещания</h2><p>Недавние записи и результаты обработки</p></div><Link href="/meetings" className="text-link">Все совещания<ChevronRight size={17} /></Link></div>
        {isLoading || tasksLoading || (USE_MOCKS && !store.hydrated) ? <div className="list-skeleton">{[1,2,3].map((n) => <div key={n} className="skeleton skeleton--row" />)}</div> : isError || tasksError ? <div className="error-state"><AlertTriangle /><div><strong>Не удалось загрузить данные</strong><span>Проверьте соединение и попробуйте снова.</span></div><Button variant="secondary" onClick={() => { void refetch(); void refetchTasks(); }}>Повторить</Button></div> : <div className="meeting-list">{visibleMeetings?.slice(0,3).map((meeting) => <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="meeting-row"><span className="meeting-row__icon"><FileAudio size={20} /></span><span className="meeting-row__main"><strong>{meeting.title}</strong><small>{formatDate(meeting.date)} · {meeting.duration} · {meeting.participantCount ?? meeting.participants.length} участников</small></span><span className="meeting-row__tasks"><ListChecks size={15} />{meeting.taskCount ?? meeting.tasks.length} поручений</span><span className={meeting.status === "error" ? "status status--overdue" : meeting.status === "ready" ? "ready-label" : "status status--in_progress"}><CheckCircle2 size={14} />{meeting.status === "ready" ? "Готов" : meeting.status === "error" ? "Ошибка" : "Обработка"}</span><ChevronRight className="meeting-row__chevron" size={18} /></Link>)}</div>}
      </section>
      <aside className="section-panel deadlines-panel"><div className="section-header"><div><h2>Ближайшие сроки</h2><p>Что требует внимания</p></div><Link href="/tasks" className="text-link">Все<ChevronRight size={17} /></Link></div><div className="deadline-list">{upcomingTasks.map((task) => <div className="deadline-item" key={task.id}><div className="date-tile"><strong>{new Date(task.dueDate).getDate()}</strong><span>{new Intl.DateTimeFormat("ru", { month: "short" }).format(new Date(task.dueDate)).replace(".", "")}</span></div><div className="deadline-item__copy"><strong>{task.title}</strong><span>{task.assignee}</span></div><StatusBadge status={task.status} /></div>)}</div>{upcomingTasks.length === 0 && <div className="empty-state"><CalendarClock size={24} /><h2>Нет задач со сроком</h2></div>}{overdueTasks > 0 && <div className="deadline-alert"><CalendarClock size={18} /><span><strong>{overdueTasks} {overdueTasks === 1 ? "срок требует" : "срока требуют"} внимания</strong>Откройте поручения для проверки</span></div>}</aside>
    </div>
    <footer className="privacy-note"><Users2 size={18} /><span><strong>Приватность по умолчанию.</strong> Записи и протоколы обрабатываются внутри защищённого контура.</span></footer>
  </div>;
}
