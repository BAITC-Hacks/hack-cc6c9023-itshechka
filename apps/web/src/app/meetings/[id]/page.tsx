"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3, Copy, ListChecks, MessageSquareText, MoreHorizontal, Play, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExportControls } from "@/features/meetings/export-controls";
import { useMeeting } from "@/features/meetings/hooks";
import { formatDate } from "@/lib/utils";

type Tab = "summary" | "tasks" | "transcript";

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meeting, isLoading } = useMeeting(id);
  const [tab, setTab] = useState<Tab>("summary");
  if (isLoading || !meeting) return <div className="page"><div className="skeleton skeleton--title" /><div className="skeleton skeleton--panel" /></div>;

  return <div className="page meeting-detail-page"><div className="breadcrumbs"><Link href="/meetings"><ArrowLeft size={17} />Совещания</Link><ChevronRight size={15} /><span>Протокол</span></div>
    <section className="meeting-hero"><div className="meeting-hero__main"><div className="meeting-hero__status"><span className="ready-label"><CheckCircle2 size={14} />Обработка завершена</span><span>№ ХТ-2026-0923</span></div><h1>{meeting.title}</h1><div className="meeting-meta"><span><CalendarDays size={16} />{formatDate(meeting.date)}</span><span><Clock3 size={16} />{meeting.duration}</span><span><Users2 size={16} />{meeting.participants.length} участников</span><span className="lang-tags"><i>RU</i><i>KZ</i><i>MIX</i></span></div></div><div className="meeting-hero__actions"><ExportControls meeting={meeting} /><Button aria-label="Другие действия" size="icon" variant="ghost"><MoreHorizontal size={20} /></Button></div></section>
    <nav className="content-tabs" aria-label="Разделы протокола">{([{ value: "summary", label: "Саммари", icon: Sparkles }, { value: "tasks", label: `Поручения · ${meeting.tasks.length}`, icon: ListChecks }, { value: "transcript", label: "Транскрипт", icon: MessageSquareText }] as const).map((item) => <button key={item.value} onClick={() => setTab(item.value)} className={tab === item.value ? "is-active" : ""}><item.icon size={17} />{item.label}</button>)}</nav>

    {tab === "summary" && <div className="detail-grid"><section className="section-panel summary-panel"><div className="section-header"><div><span className="ai-label"><Sparkles size={15} />Сформировано ИИ</span><h2>Краткое содержание</h2></div><button className="icon-action" aria-label="Скопировать саммари" onClick={() => { navigator.clipboard.writeText(meeting.summary.join("\n")); toast.success("Саммари скопировано"); }}><Copy size={18} /></button></div><div className="summary-points">{meeting.summary.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div><div className="decisions"><h3>Ключевое решение</h3><p>Провести единый аудит безопасности и синхронизировать закупки с инвестиционным планом, чтобы исключить дублирование бюджета.</p></div></section><aside className="detail-aside"><div className="section-panel"><h2>Участники</h2><div className="participants">{meeting.participants.map((participant, index) => <div key={participant}><span className={`avatar avatar--${index + 1}`}>{participant.split(" ").map((word) => word[0]).join("").slice(0,2)}</span><div><strong>{participant}</strong><small>{index === 0 ? "Председатель" : "Спикер"}</small></div></div>)}</div></div><div className="confidence-card"><span>96%</span><div><strong>Точность распознавания</strong><small>Высокое качество записи</small></div></div></aside></div>}

    {tab === "tasks" && <section className="section-panel task-detail-panel"><div className="section-header"><div><h2>Выделенные поручения</h2><p>Проверьте ответственных и сроки перед рассылкой.</p></div><Button onClick={() => toast.success("Выдержки отправлены ответственным")}>Разослать поручения</Button></div><div className="task-cards">{meeting.tasks.map((task, index) => <article key={task.id}><span className="task-index">{String(index + 1).padStart(2, "0")}</span><div className="task-card-copy"><h3>{task.title}</h3><div><span><Users2 size={15} />{task.assignee}</span><span><CalendarDays size={15} />до {formatDate(task.dueDate)}</span></div></div><StatusBadge status={task.status} /></article>)}</div></section>}

    {tab === "transcript" && <div className="detail-grid transcript-layout"><section className="section-panel transcript-panel"><div className="audio-player"><button aria-label="Воспроизвести запись"><Play size={19} fill="currentColor" /></button><span>00:00</span><div><i /></div><span>{meeting.duration}</span></div><div className="transcript-list">{meeting.transcript.map((segment, index) => <article key={segment.id}><button className="timestamp" onClick={() => toast.info(`Переход к ${segment.timestamp}`)}>{segment.timestamp}</button><span className={`speaker-dot speaker-dot--${(index % 5) + 1}`} /><div><header><strong>{segment.speaker}</strong><span>{segment.role}</span><i>{segment.language === "mixed" ? "MIX" : segment.language.toUpperCase()}</i></header><p>{segment.text}</p></div></article>)}</div></section><aside className="detail-aside transcript-aside"><div className="section-panel"><h2>Спикеры</h2><p className="muted">Распознано автоматически</p>{meeting.participants.map((name, index) => <div className="speaker-key" key={name}><span className={`speaker-dot speaker-dot--${(index % 5) + 1}`} /><strong>{name}</strong></div>)}</div></aside></div>}
  </div>;
}

