"use client";

import { CalendarDays, CheckCircle2, FileAudio, ListChecks, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/features/demo/demo-store";
import { formatDate } from "@/lib/utils";

export default function MeetingsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "ready" | "processing">("all");
  const store = useDemoStore();
  useEffect(() => {
    // Hydration-safe sync with a query entered in the global search.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);
  const filtered = useMemo(() => store.meetings.filter((meeting) => meeting.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (status === "all" || meeting.status === status)), [store.meetings, query, status]);

  return <div className="page"><section className="page-heading compact"><div><span className="eyebrow">Архив</span><h1>Совещания</h1><p>Записи, транскрипты и сформированные протоколы.</p></div><Button asChild><Link href="/new"><Plus size={18} />Новое совещание</Link></Button></section>
    <div className="toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию" /></label><button onClick={() => setStatus("all")} className={`filter-chip ${status === "all" ? "is-active" : ""}`}>Все</button><button onClick={() => setStatus("ready")} className={`filter-chip ${status === "ready" ? "is-active" : ""}`}>Готовы</button><button onClick={() => setStatus("processing")} className={`filter-chip ${status === "processing" ? "is-active" : ""}`}>В обработке</button></div>
    <section className="meetings-cards">{!store.hydrated ? [1,2,3].map((n) => <div key={n} className="skeleton skeleton--card-lg" />) : filtered.map((meeting) => <Link href={`/meetings/${meeting.id}`} key={meeting.id} className="meeting-card"><div className="meeting-card__top"><span className="meeting-card__icon"><FileAudio size={22} /></span><span className="ready-label"><CheckCircle2 size={14} />Готов</span></div><h2>{meeting.title}</h2><p><CalendarDays size={15} />{formatDate(meeting.date)} · {meeting.duration}</p><div className="meeting-card__footer"><span>{meeting.participants.length} участников</span><span><ListChecks size={15} />{meeting.tasks.length} поручений</span></div></Link>)}</section>
    {store.hydrated && filtered.length === 0 && <div className="empty-state"><Search size={28} /><h2>Ничего не найдено</h2><p>Попробуйте изменить запрос или фильтр.</p></div>}
  </div>;
}
