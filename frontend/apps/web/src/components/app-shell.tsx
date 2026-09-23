"use client";

import { CalendarDays, CheckSquare2, LayoutDashboard, Plus, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Обзор", icon: LayoutDashboard },
  { href: "/meetings", label: "Совещания", icon: CalendarDays },
  { href: "/tasks", label: "Поручения", icon: CheckSquare2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Основная навигация">
        <Link href="/" className="brand" aria-label="Хаттама — главная">
          <span className="brand__mark"><Sparkles size={19} aria-hidden="true" /></span>
          <span><strong>Хаттама</strong><small>ИИ-секретарь</small></span>
        </Link>
        <nav className="sidebar__nav">
          <span className="sidebar__eyebrow">Рабочее пространство</span>
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={cn("nav-link", active && "is-active")}><item.icon size={19} aria-hidden="true" /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebar__security">
          <ShieldCheck size={20} aria-hidden="true" />
          <div><strong>Защищённый контур</strong><span>Данные не покидают инфраструктуру</span></div>
        </div>
        <div className="profile">
          <span className="avatar">ДС</span>
          <span><strong>Данияр Серикович</strong><small>Администратор</small></span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <Link href="/" className="mobile-brand"><span className="brand__mark"><Sparkles size={18} /></span><strong>Хаттама</strong></Link>
          <div className="search"><Search size={18} aria-hidden="true" /><input aria-label="Поиск" placeholder="Найти совещание или поручение" /></div>
          <Link href="/new" className="button button--primary button--md"><Plus size={18} aria-hidden="true" /><span>Новое совещание</span></Link>
        </header>
        <main id="main-content" className="main-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={cn("bottom-nav__item", active && "is-active")}><item.icon size={20} /><span>{item.label}</span></Link>;
        })}
        <Link href="/new" className={cn("bottom-nav__item", pathname === "/new" && "is-active")}><Plus size={20} /><span>Запись</span></Link>
      </nav>
    </div>
  );
}

