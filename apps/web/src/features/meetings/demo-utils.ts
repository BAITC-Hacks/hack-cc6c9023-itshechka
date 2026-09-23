const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a", "mp4", "webm"];

export function validateMeetingFile(file: Pick<File, "name" | "size">): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) return "Поддерживаются MP3, WAV, M4A, MP4 и WEBM";
  if (file.size > MAX_FILE_SIZE) return "Файл превышает допустимый размер 2 ГБ";
  if (file.size === 0) return "Файл пустой — выберите другую запись";
  return null;
}

export function parseTimestamp(value: string): number {
  return value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}
