"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Copy, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoginRequestSchema, type LoginRequest } from "@hackalem/contracts";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

const demoAccounts = [
  { label: "Аккаунт жюри", email: "jury@hattama.kz", password: "Jury2026!" },
  { label: "Администратор", email: "admin@hattama.kz", password: "Admin2026!" },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginRequest>({ resolver: zodResolver(LoginRequestSchema), defaultValues: { email: "", password: "" } });

  const submit = async (values: LoginRequest) => {
    try {
      await signIn(values);
      toast.success("Добро пожаловать в HATTAMA");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось войти");
    }
  };

  return <main id="main-content" className="auth-page"><section className="auth-story"><Brand inverse /><div className="auth-story__content"><span className="landing-kicker"><ShieldCheck size={15} />Защищённое рабочее пространство</span><h1>Каждая встреча<br />заканчивается <em>ясностью.</em></h1><p>Транскрипт, итог и поручения — в одном рабочем пространстве.</p><ul><li><Check size={17} />Русская, казахская и смешанная речь</li><li><Check size={17} />Единый реестр поручений</li><li><Check size={17} />Локальное распознавание аудио</li></ul></div><small>HATTAMA AI · Қазақстанда жасалған</small></section>
    <section className="auth-form-side"><div className="auth-form-wrap"><Link href="/" className="auth-back"><ArrowLeft size={17} />На главную</Link><div className="auth-form-heading"><span>С возвращением</span><h2>Войдите в HATTAMA</h2><p>Используйте рабочий аккаунт или доступ для жюри.</p></div>
      <form onSubmit={handleSubmit(submit)} className="auth-form"><label>Email<input className="input" type="email" autoComplete="email" placeholder="name@company.kz" {...register("email")} aria-invalid={Boolean(errors.email)} />{errors.email && <small className="field-error" role="alert">{errors.email.message}</small>}</label><label>Пароль<div className="password-field"><input className="input" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Введите пароль" {...register("password")} aria-invalid={Boolean(errors.password)} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password && <small className="field-error" role="alert">{errors.password.message}</small>}</label><Button size="lg" type="submit" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="spin" size={18} />Входим…</> : <>Войти<ArrowRight size={18} /></>}</Button></form>
      <div className="demo-access"><div><span><LockKeyhole size={16} /></span><div><strong>Доступ для демонстрации</strong><small>Выберите аккаунт — данные подставятся автоматически</small></div></div>{demoAccounts.map((account) => <button type="button" key={account.email} onClick={() => { setValue("email", account.email, { shouldValidate: true }); setValue("password", account.password, { shouldValidate: true }); }}><span><strong>{account.label}</strong><small>{account.email}</small></span><Copy size={16} /></button>)}</div>
      <p className="auth-switch">Нет аккаунта? <Link href="/register">Зарегистрироваться</Link></p></div></section>
  </main>;
}
