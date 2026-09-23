import { ArrowRight, AudioLines, Check, CheckCircle2, FileAudio, Languages, ListChecks, LockKeyhole, Mic2, Play, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

const features = [
  { icon: AudioLines, title: "Точный транскрипт", text: "Русская, казахская и смешанная речь с разделением по спикерам и таймкодами." },
  { icon: Sparkles, title: "Суть без лишнего", text: "Краткое саммари, ключевые решения и контекст вместо часов переслушивания." },
  { icon: ListChecks, title: "Поручения под контролем", text: "Ответственные, сроки и статусы автоматически попадают в единый реестр." },
];

export default function LandingPage() {
  return <div className="landing-page">
    <header className="landing-nav"><Brand /><nav aria-label="Навигация по странице"><a href="#product">Продукт</a><a href="#workflow">Как работает</a><a href="#security">Безопасность</a></nav><div className="landing-nav__actions"><Link href="/login" className="button button--ghost">Войти</Link><Link href="/register" className="button button--primary">Начать работу<ArrowRight size={17} /></Link></div></header>

    <main id="main-content">
      <section className="landing-hero">
        <div className="landing-hero__copy"><span className="landing-kicker"><span /><Sparkles size={15} />AI meeting intelligence для команд</span><h1>Из разговора —<br /><em>в понятный результат.</em></h1><p>HATTAMA превращает запись совещания в структурированный протокол, транскрипт и список поручений. На русском, қазақша и в смешанной речи.</p><div className="landing-hero__actions"><Link href="/register" className="button button--primary button--lg">Создать протокол<ArrowRight size={18} /></Link><a href="#workflow" className="button button--secondary button--lg"><Play size={17} fill="currentColor" />Посмотреть как работает</a></div><div className="landing-proof"><span><CheckCircle2 size={16} />Локальное развёртывание</span><span><CheckCircle2 size={16} />Без передачи в публичные облака</span></div></div>

        <div className="product-preview" aria-label="Пример интерфейса HATTAMA"><div className="product-preview__bar"><div className="preview-brand"><span><AudioLines size={16} /></span>HATTAMA</div><div className="preview-search">Поиск по совещаниям</div><div className="preview-avatar">AK</div></div><div className="product-preview__body"><aside><span className="is-active"><span>01</span> Обзор</span><span><span>02</span> Совещания</span><span><span>03</span> Поручения</span></aside><div className="preview-content"><div className="preview-heading"><div><small>СЕГОДНЯ</small><strong>Добро пожаловать, Айдана</strong></div><i><Mic2 size={16} />Новая запись</i></div><div className="preview-metrics"><span><small>ПРОТОКОЛЫ</small><b>24</b><em>+4 за неделю</em></span><span><small>ПОРУЧЕНИЯ</small><b>17</b><em>5 в работе</em></span><span><small>ИСПОЛНЕНО</small><b>82%</b><em>за этот месяц</em></span></div><div className="preview-panel"><header><div><small>ГОТОВО К ПРОВЕРКЕ</small><strong>Операционное совещание</strong></div><span>18:42</span></header><div className="preview-summary"><span><Sparkles size={16} /></span><p>Команда согласовала план запуска и зафиксировала три поручения со сроками.</p></div><div className="preview-task"><Check size={15} /><span><strong>Подготовить финальную смету</strong><small>А. Касымова · до 28 сентября</small></span><i>В работе</i></div></div></div></div></div>
      </section>

      <section className="trust-strip" aria-label="Возможности"><span><Languages size={21} /><b>RU · KZ · MIX</b><small>понимает живую речь</small></span><span><ShieldCheck size={21} /><b>ON-PREMISE</b><small>данные внутри контура</small></span><span><FileAudio size={21} /><b>5 ФОРМАТОВ</b><small>аудио и видео</small></span><span><Users2 size={21} /><b>ДЛЯ КОМАНД</b><small>единая картина решений</small></span></section>

      <section id="product" className="landing-section"><div className="landing-section__intro"><span className="section-number">01 / ВОЗМОЖНОСТИ</span><h2>Всё важное после встречи — уже собрано.</h2><p>Никаких разрозненных заметок, потерянных договорённостей и ручной расшифровки.</p></div><div className="feature-grid">{features.map((item, index) => <article key={item.title}><span className="feature-index">0{index + 1}</span><item.icon size={25} /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>

      <section id="workflow" className="workflow-section"><div className="workflow-copy"><span className="section-number">02 / ПРОЦЕСС</span><h2>Протокол за три понятных шага.</h2><p>Интерфейс ведёт пользователя от записи до проверенного документа без сложных настроек.</p><Link href="/register" className="text-cta">Попробовать на своей встрече<ArrowRight size={18} /></Link></div><ol className="workflow-steps"><li><span>1</span><div><strong>Загрузите или запишите</strong><p>Добавьте MP3, WAV, M4A, MP4, WEBM или начните запись прямо в браузере.</p></div></li><li><span>2</span><div><strong>Дождитесь обработки</strong><p>ИИ разделит спикеров, распознает речь и выделит решения с поручениями.</p></div></li><li><span>3</span><div><strong>Проверьте и экспортируйте</strong><p>Уточните имена и сроки, затем скачайте готовый DOCX или PDF.</p></div></li></ol></section>

      <section id="security" className="security-section"><div className="security-mark"><LockKeyhole size={34} /></div><div><span className="section-number">03 / БЕЗОПАСНОСТЬ</span><h2>Встречи остаются вашими.</h2><p>HATTAMA поддерживает локальное развёртывание: аудио, транскрипты и документы не обязаны покидать инфраструктуру организации.</p></div><ul><li><Check size={17} />HttpOnly-сессии</li><li><Check size={17} />Контроль доступа</li><li><Check size={17} />Локальное хранение</li></ul></section>

      <section className="landing-cta"><span>HATTAMA · ХАТТАМА · ПРОТОКОЛ</span><h2>Пусть решения не теряются<br />после окончания встречи.</h2><p>Создайте рабочее пространство и получите первый структурированный протокол.</p><Link href="/register" className="button button--light button--lg">Начать работу<ArrowRight size={18} /></Link></section>
    </main>

    <footer className="landing-footer"><Brand /><p>AI-секретарь для команд, которые ценят ясность.</p><div><Link href="/login">Вход</Link><a href="#security">Безопасность</a><span>© 2026 HATTAMA AI</span></div></footer>
  </div>;
}
