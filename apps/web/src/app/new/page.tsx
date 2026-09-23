"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, FileAudio, LoaderCircle, LockKeyhole, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateMeeting } from "@/features/meetings/hooks";
import { createMeetingFormSchema, type CreateMeetingForm } from "@/features/meetings/types";

const processingSteps = ["Загрузка в защищённый контур", "Распознавание речи и спикеров", "Выделение решений и поручений"];

export default function NewMeetingPage() {
  const router = useRouter();
  const mutation = useCreateMeeting();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState(0);
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<CreateMeetingForm>({
    resolver: zodResolver(createMeetingFormSchema),
    defaultValues: { title: "Оперативное совещание по производственным показателям", language: "mixed", notifyParticipants: true, fileName: "" },
  });
  const language = useWatch({ control, name: "language" });

  useEffect(() => {
    if (!mutation.isPending) return;
    const one = window.setTimeout(() => setStep(1), 700);
    const two = window.setTimeout(() => setStep(2), 1550);
    return () => { window.clearTimeout(one); window.clearTimeout(two); };
  }, [mutation.isPending]);

  const onSubmit = (values: CreateMeetingForm) => {
    setStep(0);
    mutation.mutate(values, {
      onSuccess: (meeting) => { toast.success("Протокол создан", { description: "Запись принята в обработку" }); router.push(`/meetings/${meeting.id}`); },
      onError: () => toast.error("Не удалось обработать запись", { description: "Попробуйте загрузить файл ещё раз" }),
    });
  };

  const selectFile = (selected?: File) => {
    if (!selected) return;
    setFile(selected);
    setValue("fileName", selected.name, { shouldValidate: true });
  };

  return <div className="page narrow-page"><section className="page-heading compact"><div><span className="eyebrow">Новый протокол</span><h1>Добавьте запись совещания</h1><p>Система распознает участников, сформирует саммари и выделит поручения.</p></div></section>
    <form onSubmit={handleSubmit(onSubmit)} className="new-meeting-layout">
      <div className="form-card">
        <div className="form-section"><label htmlFor="meeting-title">Название совещания</label><input id="meeting-title" className="input" {...register("title")} aria-invalid={Boolean(errors.title)} />{errors.title && <span className="field-error" role="alert">{errors.title.message}</span>}</div>
        <fieldset className="form-section"><legend>Язык записи</legend><p className="helper">Можно выбрать смешанную речь на русском и казахском.</p><div className="segmented">{[{ value: "ru", label: "Русский" }, { value: "kk", label: "Қазақша" }, { value: "mixed", label: "Смешанный" }].map((item) => <button type="button" key={item.value} className={language === item.value ? "is-active" : ""} onClick={() => setValue("language", item.value as CreateMeetingForm["language"])}>{language === item.value && <Check size={15} />}{item.label}</button>)}</div></fieldset>
        <div className="form-section"><label>Запись совещания</label>{file ? <div className="selected-file"><span className="selected-file__icon"><FileAudio size={22} /></span><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(1)} МБ · готов к загрузке</span></div><button type="button" aria-label="Удалить файл" onClick={() => { setFile(null); setValue("fileName", ""); }}><X size={18} /></button></div> : <label className="dropzone"><UploadCloud size={30} /><strong>Перетащите файл или выберите на устройстве</strong><span>MP3, WAV, M4A, MP4 · до 2 ГБ</span><input type="file" accept="audio/*,video/*" onChange={(event) => selectFile(event.target.files?.[0])} /></label>}{errors.fileName && <span className="field-error" role="alert">{errors.fileName.message}</span>}</div>
        <label className="checkbox-row"><input type="checkbox" {...register("notifyParticipants")} /><span><strong>Участники уведомлены о записи</strong><small>Подтверждаю согласие на запись и обработку совещания.</small></span></label>
        <div className="form-actions"><Button type="button" variant="ghost" onClick={() => router.back()}>Отмена</Button><Button type="submit" size="lg" disabled={mutation.isPending}>{mutation.isPending ? <><LoaderCircle className="spin" size={18} />Обрабатываем…</> : <><UploadCloud size={18} />Начать обработку</>}</Button></div>
      </div>
      <aside className="processing-card"><div className="processing-card__head"><span><LockKeyhole size={21} /></span><div><h2>Локальная обработка</h2><p>Файл не передаётся во внешние облака</p></div></div><ol>{processingSteps.map((label, index) => <li key={label} className={mutation.isPending && index <= step ? "is-active" : ""}><span>{mutation.isPending && index < step ? <Check size={15} /> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? "Шифрование и проверка файла" : index === 1 ? "RU · KZ · шала-қазақ" : "Ответственный · срок · суть"}</small></div></li>)}</ol><div className="processing-card__note"><LockKeyhole size={17} />Совместимо с развёртыванием on-premise</div></aside>
    </form>
  </div>;
}
