"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const speeds = [0.75, 1, 1.5, 2];

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type AudioPlayerProps = {
  src?: string;
  seekTo: number | null;
  onTimeChange: (seconds: number) => void;
};

export function AudioPlayer({ src, seekTo, onTimeChange }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTo === null) return;
    audio.currentTime = Math.min(seekTo, audio.duration || seekTo);
    setCurrent(audio.currentTime);
    void audio.play().catch(() => undefined);
  }, [seekTo]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) await audio.play(); else audio.pause();
  };

  return <div className="audio-player audio-player--real">
    <audio
      ref={audioRef}
      src={src}
      preload="metadata"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      onTimeUpdate={(event) => { setCurrent(event.currentTarget.currentTime); onTimeChange(event.currentTarget.currentTime); }}
    />
    <button type="button" aria-label={playing ? "Пауза" : "Воспроизвести запись"} onClick={toggle} disabled={!src}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
    <span>{formatTime(current)}</span>
    <input aria-label="Позиция воспроизведения" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(current, duration || 1)} disabled={!src} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrent(value); onTimeChange(value); }} />
    <span>{formatTime(duration)}</span>
    <label className="speed-control"><Volume2 size={15} /><span className="sr-only">Скорость</span><select aria-label="Скорость воспроизведения" value={speed} onChange={(event) => { const value = Number(event.target.value); setSpeed(value); if (audioRef.current) audioRef.current.playbackRate = value; }}>{speeds.map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
    {!src && <small>Аудио доступно после загрузки или записи в текущей сессии</small>}
  </div>;
}
