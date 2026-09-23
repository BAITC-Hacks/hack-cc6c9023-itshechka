"use client";

import { CalendarDays, CheckSquare2, LayoutDashboard, LogOut, Plus, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/meetings", label: "Совещания", icon: CalendarDays },
  { href: "/tasks", label: "Поручения", icon: CheckSquare2 },
];
const publicPaths = new Set(["/", "/login", "/register"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isError, signOut, refresh } = useAuth();
  const [globalQuery, setGlobalQuery] = useState("");
  const isPublic = publicPaths.has(pathname);

  useEffect(() => {
    if (!isPublic && !isLoading && !user && !isError) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isError, isLoading, isPublic, pathname, router, user]);

  if (isPublic) return <>{children}</>;
  if (isLoading || (!user && !isError)) {
    return <div className="auth-gate"><Brand /><div className="auth-gate__loader" /><span>Открываем рабочее пространство…</span></div>;
  }
  if (isError || !user) {
    return <div className="auth-gate"><Brand /><h1>Не удалось проверить сессию</h1><p>Убедитесь, что backend запущен, и повторите попытку.</p><button className="button button--primary" onClick={refresh}>Повторить</button></div>;
  }

  const initials = user.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Основная навигация">
        <Brand href="/dashboard" inverse />
        <nav className="sidebar__nav">
          <span className="sidebar__eyebrow">Рабочее пространство</span>
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return <Link key={item.href} href={item.href} className={cn("nav-link", active && "is-active")}><item.icon size={19} aria-hidden="true" /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebar__security">
          <ShieldCheck size={20} aria-hidden="true" />
          <div><strong>Защищённый контур</strong><span>Записи остаются внутри инфраструктуры</span></div>
        </div>
        <div className="profile">
          <span className="avatar">{initials}</span>
          <span className="profile__copy"><strong>{user.fullName}</strong><small>{user.organization ?? (user.role === "ADMIN" ? "Администратор" : "Участник")}</small></span>
          <button type="button" className="profile__logout" aria-label="Выйти" title="Выйти" onClick={() => { void signOut().then(() => router.push("/")); }}><LogOut size={17} /></button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <Brand href="/dashboard" compact />
          <form className="search" onSubmit={(event) => { event.preventDefault(); router.push(`/meetings?q=${encodeURIComponent(globalQuery)}`); }}><Search size={18} aria-hidden="true" /><input aria-label="Поиск" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Поиск по совещаниям" /></form>
          <Link href="/new" className="button button--primary button--md"><Plus size={18} aria-hidden="true" /><span>Новое совещание</span></Link>
        </header>
        <main id="main-content" className="main-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return <Link key={item.href} href={item.href} className={cn("bottom-nav__item", active && "is-active")}><item.icon size={20} /><span>{item.label}</span></Link>;
        })}
        <Link href="/new" className={cn("bottom-nav__item", pathname === "/new" && "is-active")}><Plus size={20} /><span>Запись</span></Link>
      </nav>
    </div>
  );
}
