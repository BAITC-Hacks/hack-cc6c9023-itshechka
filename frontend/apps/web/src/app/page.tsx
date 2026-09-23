"use client";

import { AlertTriangle, ArrowRight, AudioLines, CalendarClock, CheckCircle2, ChevronRight, Clock3, FileAudio, ListChecks, Plus, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMeetings } from "@/features/meetings/hooks";
import { allTasks } from "@/features/meetings/mock-data";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: meetings, isLoading, isError, refetch } = useMeetings();
  const stats = [
    { label: "Совещаний в сентябре", value: "12", note: "+3 к августу", icon: AudioLines, tone: "blue" },
    { label: "Активных поручений", value: "18", note: "6 требуют внимания", icon: ListChecks, tone: "violet" },
    { label: "Выполнено в срок", value: "87%", note: "+9% за месяц", icon: CheckCircle2, tone: "green" },
    { label: "Сэкономлено времени", value: "14 ч", note: "на подготовке протоколов", icon: Clock3, tone: "amber" },
  ];

  return (
    <div className="page dashboard-page">
      <section className="page-heading">
        <div><span className="eyebrow">23 сентября 2026</span><h1>Доброе утро, Данияр</h1><p>Здесь всё важное по совещаниям и исполнительской дисциплине.</p></div>
        <Button asChild size="lg"><Link href="/new"><Plus size={19} />Создать протокол</Link></Button>
      </section>

      <section className="stats-grid" aria-label="Основные показатели">
        {stats.map((stat) => <Card key={stat.label} className="stat-card"><span className={`icon-box icon-box--${stat.tone}`}><stat.icon size={20} /></span><div className="stat-card__value">{stat.value}</div><div className="stat-card__label">{stat.label}</div><div className="stat-card__note">{stat.note}</div></Card>)}
      </section>

      <section className="focus-card">
        <div className="focus-card__glow" />
        <div className="focus-card__icon"><Sparkles size={23} /></div>
        <div className="focus-card__copy"><span className="focus-card__label">Готово к проверке</span><h2>Новый протокол обработан</h2><p>ИИ выделил 6 поручений и 3 ключевых решения из совещания по химической промышленности.</p></div>
        <Button asChild variant="secondary"><Link href="/meetings/operational-review">Открыть протокол<ArrowRight size={18} /></Link></Button>
      </section>

      <div className="dashboard-grid">
        <section className="section-panel recent-panel">
          <div className="section-header"><div><h2>Последние совещания</h2><p>Протоколы и результаты обработки</p></div><Link href="/meetings" className="text-link">Все совещания<ChevronRight size={17} /></Link></div>
          {isLoading ? <div className="list-skeleton">{[1,2,3].map((n) => <div key={n} className="skeleton skeleton--row" />)}</div> : isError ? <div className="error-state"><AlertTriangle /><div><strong>Не удалось загрузить совещания</strong><span>Проверьте соединение и попробуйте ещё раз.</span></div><Button variant="secondary" onClick={() => refetch()}>Повторить</Button></div> : (
            <div className="meeting-list">{meetings?.slice(0,3).map((meeting) => <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="meeting-row"><span className="meeting-row__icon"><FileAudio size={20} /></span><span className="meeting-row__main"><strong>{meeting.title}</strong><small>{formatDate(meeting.date)} · {meeting.duration} · {meeting.participants.length} участников</small></span><span className="meeting-row__tasks"><ListChecks size={15} />{meeting.tasks.length} поручений</span><span className="ready-label"><CheckCircle2 size={14} />Готов</span><ChevronRight className="meeting-row__chevron" size={18} /></Link>)}</div>
          )}
        </section>

        <aside className="section-panel deadlines-panel">
          <div className="section-header"><div><h2>Ближайшие сроки</h2><p>На этой неделе</p></div><Link href="/tasks" className="text-link">Все<ChevronRight size={17} /></Link></div>
          <div className="deadline-list">{allTasks.slice(0,4).map((task, index) => <div className="deadline-item" key={`${task.id}-${index}`}><div className="date-tile"><strong>{new Date(task.dueDate).getDate()}</strong><span>{new Intl.DateTimeFormat("ru", { month: "short" }).format(new Date(task.dueDate)).replace(".", "")}</span></div><div className="deadline-item__copy"><strong>{task.title}</strong><span>{task.assignee}</span></div><StatusBadge status={index === 0 ? "overdue" : task.status} /></div>)}</div>
          <div className="deadline-alert"><CalendarClock size={18} /><span><strong>2 срока требуют внимания</strong>Напоминания ответственным отправлены</span></div>
        </aside>
      </div>

      <footer className="privacy-note"><Users2 size={18} /><span><strong>Приватность по умолчанию.</strong> Аудио, транскрипты и протоколы обрабатываются внутри защищённого контура.</span></footer>
    </div>
  );
}

