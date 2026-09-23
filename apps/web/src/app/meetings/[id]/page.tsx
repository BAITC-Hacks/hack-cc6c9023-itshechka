"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3, Copy, ListChecks, MessageSquareText, Pencil, Send, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDemoStore } from "@/features/demo/demo-store";
import { AudioPlayer } from "@/features/meetings/audio-player";
import { parseTimestamp } from "@/features/meetings/demo-utils";
import { ExportControls } from "@/features/meetings/export-controls";
import { useMeeting } from "@/features/meetings/hooks";
import type { MeetingTask } from "@/features/meetings/types";
import { formatDate } from "@/lib/utils";

type Tab = "summary" | "tasks" | "transcript";
export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: apiMeeting, isLoading } = useMeeting(id);
  const store = useDemoStore();
  const meeting = store.getMeeting(id) ?? apiMeeting;
  const confirmed = store.confirmedMeetingIds.includes(id);
  const [tab, setTab] = useState<Tab>("summary");
  const [taskDraft, setTaskDraft] = useState<MeetingTask | null>(null);
  const [speakerDraft, setSpeakerDraft] = useState<{ original: string; name: string } | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const activeSegmentId = useMemo(() => {
    if (!meeting) return undefined;
    return [...meeting.transcript].reverse().find((segment) => parseTimestamp(segment.timestamp) <= currentTime)?.id;
  }, [meeting, currentTime]);

  if ((isLoading && !meeting) || !store.hydrated) return <div className="page"><div className="skeleton skeleton--title" /><div className="skeleton skeleton--panel" /></div>;
  if (!meeting) return <div className="page"><div className="error-state"><div><strong>Протокол не найден</strong><span>Вернитесь к списку совещаний и выберите доступную запись.</span></div></div></div>;

  const saveTask = () => {
    if (!taskDraft?.title.trim() || !taskDraft.assignee.trim() || !taskDraft.dueDate) { toast.error("Заполните текст, ответственного и срок"); return; }
    store.updateTask({ ...taskDraft, title: taskDraft.title.trim(), assignee: taskDraft.assignee.trim() });
    setTaskDraft(null); toast.success("Поручение обновлено");
  };
  const saveSpeaker = () => {
    if (!speakerDraft?.name.trim()) { toast.error("Укажите имя спикера"); return; }
    const name = speakerDraft.name.trim();
    store.updateMeeting(id, (current) => ({ ...current, participants: current.participants.map((item) => item === speakerDraft.original ? name : item), transcript: current.transcript.map((segment) => segment.speaker === speakerDraft.original ? { ...segment, speaker: name } : segment) }));
    setSpeakerDraft(null); toast.success("Имя спикера обновлено во всём транскрипте");
  };
  const distribute = () => {
    if (!confirmed) { toast.error("Сначала подтвердите проверку протокола"); return; }
    toast.success("Поручения готовы к отправке", { description: "В demo-режиме внешняя рассылка не выполняется." });
  };

  return <div className="page meeting-detail-page"><div className="breadcrumbs"><Link href="/meetings"><ArrowLeft size={17} />Совещания</Link><ChevronRight size={15} /><span>Протокол</span></div>
    <section className="meeting-hero"><div className="meeting-hero__main"><div className="meeting-hero__status"><span className="ready-label"><CheckCircle2 size={14} />Обработка завершена</span><span>№ ХТ-2026-0923</span></div><h1>{meeting.title}</h1><div className="meeting-meta"><span><CalendarDays size={16} />{formatDate(meeting.date)}</span><span><Clock3 size={16} />{meeting.duration}</span><span><Users2 size={16} />{meeting.participants.length} участников</span><span className="lang-tags">{meeting.languages.map((language) => <i key={language}>{language === "mixed" ? "MIX" : language.toUpperCase()}</i>)}</span></div></div><div className="meeting-hero__actions"><ExportControls meeting={meeting} /></div></section>
    <div className={`review-banner ${confirmed ? "is-confirmed" : ""}`}><ShieldCheck size={20} /><div><strong>{confirmed ? "Протокол проверен" : "Проверьте результат ИИ"}</strong><span>{confirmed ? "Документ подтверждён и готов к распространению." : "Уточните имена, ответственных и сроки до рассылки."}</span></div><label><input type="checkbox" checked={confirmed} onChange={(event) => store.setConfirmed(id, event.target.checked)} />Подтверждаю проверку</label></div>
    <nav className="content-tabs" aria-label="Разделы протокола">{([{ value: "summary", label: "Саммари", icon: Sparkles }, { value: "tasks", label: `Поручения · ${meeting.tasks.length}`, icon: ListChecks }, { value: "transcript", label: "Транскрипт", icon: MessageSquareText }] as const).map((item) => <button key={item.value} onClick={() => setTab(item.value)} className={tab === item.value ? "is-active" : ""} aria-current={tab === item.value ? "page" : undefined}><item.icon size={17} />{item.label}</button>)}</nav>

    {tab === "summary" && <div className="detail-grid"><section className="section-panel summary-panel"><div className="section-header"><div><span className="ai-label"><Sparkles size={15} />Сформировано ИИ</span><h2>Краткое содержание</h2></div><button className="icon-action" aria-label="Скопировать саммари" onClick={() => { void navigator.clipboard.writeText(meeting.summary.join("\n")); toast.success("Саммари скопировано"); }}><Copy size={18} /></button></div><div className="summary-points">{meeting.summary.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div><div className="decisions"><h3>Ключевое решение</h3><p>Провести единый аудит безопасности и синхронизировать закупки с инвестиционным планом, чтобы исключить дублирование бюджета.</p></div></section><aside className="detail-aside"><div className="section-panel"><h2>Участники</h2><div className="participants">{meeting.participants.map((participant, index) => <div key={participant}><span className={`avatar avatar--${index + 1}`}>{participant.split(" ").map((word) => word[0]).join("").slice(0,2)}</span><div><strong>{participant}</strong><small>{index === 0 ? "Председатель" : "Спикер"}</small></div></div>)}</div></div><div className="confidence-card"><span>96%</span><div><strong>Точность распознавания</strong><small>Высокое качество записи</small></div></div></aside></div>}

    {tab === "tasks" && <section className="section-panel task-detail-panel"><div className="section-header"><div><h2>Выделенные поручения</h2><p>Проверьте ответственных и сроки перед рассылкой.</p></div><Button onClick={distribute} disabled={!confirmed}><Send size={16} />Разослать поручения</Button></div><div className="task-cards">{meeting.tasks.map((task, index) => <article key={task.id}><span className="task-index">{String(index + 1).padStart(2, "0")}</span><div className="task-card-copy"><h3>{task.title}</h3><div><span><Users2 size={15} />{task.assignee}</span><span><CalendarDays size={15} />до {formatDate(task.dueDate)}</span></div></div><StatusBadge status={task.status} /><button type="button" className="icon-action" aria-label={`Редактировать: ${task.title}`} onClick={() => setTaskDraft({ ...task })}><Pencil size={16} /></button></article>)}</div></section>}

    {tab === "transcript" && <div className="detail-grid transcript-layout"><section className="section-panel transcript-panel"><AudioPlayer src={store.audioUrls[id]} seekTo={seekTo} onTimeChange={setCurrentTime} /><div className="transcript-list">{meeting.transcript.map((segment, index) => <article key={segment.id} className={activeSegmentId === segment.id && store.audioUrls[id] ? "is-active" : ""}><button className="timestamp" onClick={() => { setSeekTo(parseTimestamp(segment.timestamp)); if (!store.audioUrls[id]) toast.info("Загрузите запись в текущей сессии, чтобы перейти к таймкоду"); }}>{segment.timestamp}</button><span className={`speaker-dot speaker-dot--${(index % 5) + 1}`} /><div><header><strong>{segment.speaker}</strong><span>{segment.role}</span><i>{segment.language === "mixed" ? "MIX" : segment.language.toUpperCase()}</i></header><p>{segment.text}</p></div></article>)}</div></section><aside className="detail-aside transcript-aside"><div className="section-panel"><h2>Спикеры</h2><p className="muted">Переименование применяется ко всему транскрипту</p>{meeting.participants.map((name, index) => <div className="speaker-key" key={name}><span className={`speaker-dot speaker-dot--${(index % 5) + 1}`} /><strong>{name}</strong><button type="button" className="icon-action" onClick={() => setSpeakerDraft({ original: name, name })} aria-label={`Переименовать ${name}`}><Pencil size={14} /></button></div>)}</div></aside></div>}

    <Sheet open={Boolean(taskDraft)} title="Редактировать поручение" description="Изменения сохраняются в demo-данных" onClose={() => setTaskDraft(null)}>{taskDraft && <div className="sheet-form"><label>Текст поручения<textarea value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} /></label><label>Ответственный<input className="input" value={taskDraft.assignee} onChange={(event) => setTaskDraft({ ...taskDraft, assignee: event.target.value })} /></label><div className="field-grid"><label>Срок<input className="input" type="date" value={taskDraft.dueDate.slice(0, 10)} onChange={(event) => setTaskDraft({ ...taskDraft, dueDate: event.target.value })} /></label><label>Приоритет<select className="input" value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value as MeetingTask["priority"] })}><option value="normal">Обычный</option><option value="high">Высокий</option></select></label></div><label>Статус<select className="input" value={taskDraft.status} onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value as MeetingTask["status"] })}><option value="new">Новое</option><option value="in_progress">В работе</option><option value="overdue">Просрочено</option><option value="done">Выполнено</option></select></label><div className="sheet-actions"><Button type="button" variant="ghost" onClick={() => setTaskDraft(null)}>Отмена</Button><Button type="button" onClick={saveTask}>Сохранить</Button></div></div>}</Sheet>
    <Sheet open={Boolean(speakerDraft)} title="Переименовать спикера" description="Имя изменится во всех репликах этого участника" onClose={() => setSpeakerDraft(null)}>{speakerDraft && <div className="sheet-form"><label>Имя спикера<input className="input" autoFocus value={speakerDraft.name} onChange={(event) => setSpeakerDraft({ ...speakerDraft, name: event.target.value })} /></label><div className="sheet-actions"><Button type="button" variant="ghost" onClick={() => setSpeakerDraft(null)}>Отмена</Button><Button type="button" onClick={saveSpeaker}>Сохранить</Button></div></div>}</Sheet>
  </div>;
}
