import type { AiProcessResult } from "@hackalem/contracts";

/**
 * Демо-фикстура в точной схеме AiProcessResult — используется, когда
 * self-hosted AI worker недоступен (например, backend разрабатывается
 * отдельно от worker'а). Структура намеренно повторяет формат эталонного
 * протокола (два спикера, одна тема, поручения с ответственным и сроком),
 * чтобы дальше по пайплайну (persist -> export) ничего не отличалось от
 * настоящего результата worker'а.
 */
export function buildDemoResult(meetingId: string): AiProcessResult {
  return {
    meetingId,
    durationSec: 300,
    speakers: [
      { speakerTag: "SPEAKER_00", fullNameGuess: "Асхат Ерланович", roleGuess: "заместитель председателя правления" },
      { speakerTag: "SPEAKER_01", fullNameGuess: "Гульмира Сериковна", roleGuess: "директор департамента промышленной политики" },
    ],
    utterances: [
      {
        speakerTag: "SPEAKER_00",
        text: "Коллеги, начинаем. На повестке один вопрос — состояние и перспективы развития химической отрасли в рамках группы.",
        startMs: 0,
        endMs: 6500,
        order: 0,
      },
      {
        speakerTag: "SPEAKER_01",
        text: "По итогам девяти месяцев загрузка мощностей на химических активах группы держится на уровне семьдесят один процент.",
        startMs: 6600,
        endMs: 13000,
        order: 1,
      },
    ],
    topics: [{ title: "Развитие химической промышленности", order: 0, startUtteranceOrder: 0, endUtteranceOrder: 1 }],
    tasks: [
      {
        description: "Разработать единую стратегию закупа сырья для химических активов группы",
        responsibleSpeakerTag: "SPEAKER_01",
        dueRaw: "15 октября",
        topicOrder: 0,
        sourceUtteranceOrder: 1,
      },
    ],
    summaries: [
      {
        topicOrder: 0,
        text: "Загрузка мощностей группы — 71%. Основная проблема — устаревшее оборудование и отсутствие единой стратегии закупа сырья.",
      },
      {
        topicOrder: null,
        text: "[DEMO DATA] AI worker недоступен — показан фикстурный результат в реальной схеме AiProcessResult.",
      },
    ],
  };
}
