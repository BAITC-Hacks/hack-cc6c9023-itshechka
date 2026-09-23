"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Circle, FileAudio, LoaderCircle, LockKeyhole, Mic, Pause, Play, RotateCcw, Square, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/features/demo/demo-store";
import { useCreateMeeting } from "@/features/meetings/hooks";
import { validateMeetingFile } from "@/features/meetings/demo-utils";
import { USE_MOCKS } from "@/features/meetings/api";
import { createMeetingFormSchema, type CreateMeetingForm } from "@/features/meetings/types";

const processingSteps = ["Загрузка в защищённый контур", "Распознавание речи и спикеров", "Выделение решений и поручений"];

function formatTimer(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const mutation = useCreateMeeting();
  const { addMeeting, outcome, setOutcome } = useDemoStore();
  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(0);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused" | "finished">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<CreateMeetingForm>({
    resolver: zodResolver(createMeetingFormSchema),
    defaultValues: { title: "Оперативное совещание по производственным показателям", language: "mixed", notifyParticipants: true, fileName: "", demoOutcome: outcome },
  });
  const language = useWatch({ control, name: "language" });
  const consent = useWatch({ control, name: "notifyParticipants" });

  useEffect(() => { setValue("demoOutcome", outcome); }, [outcome, setValue]);
  useEffect(() => {
    if (recordingState !== "recording") return;
    const interval = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recordingState]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    if (!mutation.isPending) return;
    const one = window.setTimeout(() => setStep(1), 700);
    const two = window.setTimeout(() => setStep(2), 1550);
    return () => { window.clearTimeout(one); window.clearTimeout(two); };
  }, [mutation.isPending]);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    const validationError = validateMeetingFile(selected);
    if (validationError) { setFileError(validationError); return; }
    setFileError(""); setFile(selected); setValue("fileName", selected.name, { shouldValidate: true });
  };

  const clearFile = () => {
    setFile(null); setFileError(""); setValue("fileName", "", { shouldValidate: true });
    setRecordingState("idle"); setRecordingSeconds(0);
  };

  const startRecording = async () => {
    if (!consent) { toast.error("Сначала подтвердите согласие участников"); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("Браузер не поддерживает запись с микрофона"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        selectFile(new File([blob], `Запись-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-")}.webm`, { type: blob.type }));
        stream.getTracks().forEach((track) => track.stop());
        setRecordingState("finished");
      };
      recorder.start(500); setRecordingSeconds(0); setRecordingState("recording");
    } catch {
      toast.error("Не удалось получить доступ к микрофону", { description: "Проверьте разрешение браузера и повторите попытку." });
    }
  };

  const pauseRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") { recorder.pause(); setRecordingState("paused"); }
    else if (recorder.state === "paused") { recorder.resume(); setRecordingState("recording"); }
  };
  const finishRecording = () => { if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop(); };

  const onSubmit = (values: CreateMeetingForm) => {
    if (!consent) { toast.error("Нужно подтвердить согласие участников"); return; }
    if (!file) { toast.error("Добавьте запись совещания"); return; }
    setStep(0);
    mutation.mutate({ values: { ...values, demoOutcome: outcome }, file, durationSec: recordingSeconds || undefined }, {
      onSuccess: (meeting) => {
        if (USE_MOCKS) addMeeting(meeting, URL.createObjectURL(file));
        toast.success(meeting.status === "ready" ? "Протокол создан" : "Запись принята в обработку", { description: meeting.status === "ready" ? "ИИ уже подготовил саммари и поручения" : "Готовый результат появится на странице автоматически" });
        router.push(`/meetings/${meeting.id}`);
      },
      onError: () => toast.error("Не удалось обработать запись", { description: "Переключите demo-сценарий или повторите попытку." }),
    });
  };
  const progress = mutation.isPending ? Math.min(92, 18 + step * 34) : mutation.isError ? 100 : 0;

  return <div className="page narrow-page"><section className="page-heading compact"><div><span className="eyebrow">Новый протокол</span><h1>Добавьте запись совещания</h1><p>Загрузите готовый файл или запишите встречу прямо в браузере.</p></div></section>
    <form onSubmit={handleSubmit(onSubmit)} className="new-meeting-layout">
      <div className="form-card">
        <div className="mode-switch" role="tablist" aria-label="Источник записи"><button type="button" role="tab" aria-selected={mode === "upload"} disabled={recordingState === "recording" || recordingState === "paused"} className={mode === "upload" ? "is-active" : ""} onClick={() => setMode("upload")}><UploadCloud size={17} />Загрузить файл</button><button type="button" role="tab" aria-selected={mode === "record"} className={mode === "record" ? "is-active" : ""} onClick={() => setMode("record")}><Mic size={17} />Записать встречу</button></div>
        <div className="form-section"><label htmlFor="meeting-title">Название совещания</label><input id="meeting-title" className="input" {...register("title")} aria-invalid={Boolean(errors.title)} />{errors.title && <span className="field-error" role="alert">{errors.title.message}</span>}</div>
        <fieldset className="form-section"><legend>Язык записи</legend><p className="helper">Для преимущественно казахской записи выберите «Қазақша»; смешанный режим определяет язык речи автоматически.</p><div className="segmented">{[{ value: "ru", label: "Русский" }, { value: "kk", label: "Қазақша" }, { value: "mixed", label: "Смешанный" }].map((item) => <button type="button" key={item.value} className={language === item.value ? "is-active" : ""} onClick={() => setValue("language", item.value as CreateMeetingForm["language"])}>{language === item.value && <Check size={15} />}{item.label}</button>)}</div></fieldset>
        <div className="form-section"><label>{mode === "upload" ? "Запись совещания" : "Запись с микрофона"}</label>
          {mode === "upload" ? (file ? <SelectedFile file={file} onClear={clearFile} /> : <label className={`dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}><UploadCloud size={30} /><strong>Перетащите файл или выберите на устройстве</strong><span>MP3, WAV, M4A, MP4, WEBM · до 2 ГБ</span><input type="file" accept=".mp3,.wav,.m4a,.mp4,.webm,audio/*,video/mp4" onChange={(event) => selectFile(event.target.files?.[0])} /></label>) : <div className="recorder-card"><div className={`recording-orb ${recordingState === "recording" ? "is-recording" : ""}`}><Mic size={26} /></div><strong>{recordingState === "idle" ? "Микрофон готов" : recordingState === "paused" ? "Запись на паузе" : recordingState === "finished" ? "Запись завершена" : "Идёт запись"}</strong><span className="recording-timer">{formatTimer(recordingSeconds)}</span><div className="recorder-actions">{recordingState === "idle" || recordingState === "finished" ? <Button type="button" onClick={startRecording}><Circle size={15} fill="currentColor" />{recordingState === "finished" ? "Записать заново" : "Начать запись"}</Button> : <><Button type="button" variant="secondary" onClick={pauseRecording}>{recordingState === "paused" ? <Play size={17} /> : <Pause size={17} />}{recordingState === "paused" ? "Продолжить" : "Пауза"}</Button><Button type="button" onClick={finishRecording}><Square size={15} fill="currentColor" />Завершить</Button></>}</div>{file && <SelectedFile file={file} onClear={clearFile} />}</div>}
          {(fileError || errors.fileName) && <span className="field-error" role="alert">{fileError || errors.fileName?.message}</span>}
        </div>
        <label className="checkbox-row"><input type="checkbox" {...register("notifyParticipants")} /><span><strong>Участники уведомлены о записи</strong><small>Подтверждаю согласие на запись и обработку совещания.</small></span></label>
        {mutation.isError && <div className="inline-error" role="alert"><AlertCircle size={19} /><div><strong>Обработка прервана</strong><span>Файл сохранён в форме — можно сразу повторить.</span></div><Button type="submit" size="sm" variant="secondary"><RotateCcw size={15} />Повторить</Button></div>}
        <div className="form-actions"><Button type="button" variant="ghost" onClick={() => router.back()}>Отмена</Button><Button type="submit" size="lg" disabled={mutation.isPending || !file || !consent}>{mutation.isPending ? <><LoaderCircle className="spin" size={18} />Обрабатываем…</> : <><UploadCloud size={18} />Начать обработку</>}</Button></div>
      </div>
      <aside className="processing-card"><div className="processing-card__head"><span><LockKeyhole size={21} /></span><div><h2>Локальное распознавание</h2><p>В GPT API передаётся текст транскрипта, без аудиофайла</p></div></div>{USE_MOCKS && <div className="demo-control"><div><strong>Demo-сценарий</strong><small>Проверка success/error состояния</small></div><select aria-label="Результат демонстрационной обработки" value={outcome} onChange={(event) => setOutcome(event.target.value as "success" | "error")}><option value="success">Успех</option><option value="error">Ошибка</option></select></div>}{mutation.isPending && <div className="progress-block"><div><span>Обработка</span><strong>{progress}%</strong></div><progress max="100" value={progress} /></div>}<ol>{processingSteps.map((label, index) => <li key={label} className={mutation.isPending && index <= step ? "is-active" : ""}><span>{mutation.isPending && index < step ? <Check size={15} /> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? "Загрузка и проверка файла" : index === 1 ? "RU · KZ · шала-қазақ" : "Ответственный · срок · суть"}</small></div></li>)}</ol><div className="processing-card__note"><LockKeyhole size={17} />Распознавание речи работает локально</div></aside>
    </form>
  </div>;
}

function SelectedFile({ file, onClear }: { file: File; onClear: () => void }) {
  return <div className="selected-file"><span className="selected-file__icon"><FileAudio size={22} /></span><div><strong>{file.name}</strong><span>{file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} КБ` : `${(file.size / 1024 / 1024).toFixed(1)} МБ`} · готов к обработке</span></div><button type="button" aria-label="Удалить файл" onClick={onClear}><X size={18} /></button></div>;
}
