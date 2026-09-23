"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { RegisterRequestSchema, type RegisterRequest } from "@hackalem/contracts";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterRequest>({ resolver: zodResolver(RegisterRequestSchema), defaultValues: { fullName: "", email: "", organization: "", password: "" } });

  const submit = async (values: RegisterRequest) => {
    try {
      await signUp(values);
      toast.success("Рабочее пространство создано");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось зарегистрироваться");
    }
  };

  return <main id="main-content" className="auth-page"><section className="auth-story"><Brand inverse /><div className="auth-story__content"><span className="landing-kicker"><ShieldCheck size={15} />Быстрый старт</span><h1>Соберите знания<br />команды <em>в одном месте.</em></h1><p>Создание аккаунта занимает меньше минуты. Сложные настройки не понадобятся.</p><ul><li><Check size={17} />Понятный интерфейс без обучения</li><li><Check size={17} />Запись прямо из браузера</li><li><Check size={17} />Экспорт в DOCX и PDF</li></ul></div><small>HATTAMA AI · Қазақстанда жасалған</small></section>
    <section className="auth-form-side"><div className="auth-form-wrap"><Link href="/" className="auth-back"><ArrowLeft size={17} />На главную</Link><div className="auth-form-heading"><span>Новый аккаунт</span><h2>Создайте пространство</h2><p>Для вас и вашей команды.</p></div><form onSubmit={handleSubmit(submit)} className="auth-form"><div className="auth-field-grid"><label>Имя и фамилия<input className="input" autoComplete="name" placeholder="Айдана Касымова" {...register("fullName")} aria-invalid={Boolean(errors.fullName)} />{errors.fullName && <small className="field-error" role="alert">{errors.fullName.message}</small>}</label><label>Организация <i>необязательно</i><input className="input" autoComplete="organization" placeholder="Название компании" {...register("organization")} />{errors.organization && <small className="field-error" role="alert">{errors.organization.message}</small>}</label></div><label>Email<input className="input" type="email" autoComplete="email" placeholder="name@company.kz" {...register("email")} aria-invalid={Boolean(errors.email)} />{errors.email && <small className="field-error" role="alert">{errors.email.message}</small>}</label><label>Пароль<div className="password-field"><input className="input" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Минимум 8 символов" {...register("password")} aria-invalid={Boolean(errors.password)} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password ? <small className="field-error" role="alert">{errors.password.message}</small> : <small className="field-hint">Заглавная и строчная буквы, минимум одна цифра</small>}</label><Button size="lg" type="submit" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="spin" size={18} />Создаём…</> : <>Создать аккаунт<ArrowRight size={18} /></>}</Button><small className="auth-terms">Продолжая, вы соглашаетесь с правилами безопасной обработки данных.</small></form><p className="auth-switch">Уже есть аккаунт? <Link href="/login">Войти</Link></p></div></section>
  </main>;
}
