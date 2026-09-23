import type { MeetingTask, MeetingView } from "./types";

export const demoMeeting: MeetingView = {
  id: "operational-review",
  title: "Развитие химической промышленности и техника безопасности",
  date: "2026-09-23T06:00:00.000Z",
  duration: "04:34",
  status: "ready",
  languages: ["ru", "kk", "mixed"],
  participants: ["Асхат Ерланович", "Гульмира Сериковна", "Тимур Болатович", "Айнур Каировна", "Нурлан Сагатович"],
  summary: [
    "Загрузка химических активов группы составляет 71%, а потери на логистике достигают 8% себестоимости.",
    "Проект модернизации Павлодарского завода готов на 60%; без решения по финансированию запуск сдвинется на полгода.",
    "После инцидента обнаружено, что датчики утечки газа не проходили поверку год. Нужен аудит всех 11 площадок.",
  ],
  tasks: [
    { id: "t1", title: "Разработать единую стратегию закупа сырья", assignee: "Гульмира Сериковна", dueDate: "2026-10-15", status: "in_progress", priority: "high", meetingId: "operational-review" },
    { id: "t2", title: "Согласовать график поставок с проектным институтом", assignee: "Айнур Каировна", dueDate: "2026-09-26", status: "in_progress", priority: "high", meetingId: "operational-review" },
    { id: "t3", title: "Подготовить финансовое решение по Павлодарскому заводу", assignee: "Тимур Болатович", dueDate: "2026-09-30", status: "new", priority: "normal", meetingId: "operational-review" },
    { id: "t4", title: "Провести полный аудит датчиков и СИЗ на 11 площадках", assignee: "Нурлан Сагатович", dueDate: "2026-10-15", status: "new", priority: "high", meetingId: "operational-review" },
    { id: "t5", title: "Провести внеплановый инструктаж по газоопасным работам", assignee: "Нурлан Сагатович", dueDate: "2026-09-30", status: "new", priority: "high", meetingId: "operational-review" },
    { id: "t6", title: "Получить заключение юристов по претензии к подрядчику", assignee: "Айнур Каировна", dueDate: "2026-09-24", status: "done", priority: "normal", meetingId: "operational-review" },
  ],
  transcript: [
    { id: "s1", speaker: "Асхат Ерланович", role: "Заместитель председателя правления", timestamp: "00:00", language: "ru", text: "Коллеги, начинаем. На повестке один вопрос — состояние и перспективы развития химической отрасли в рамках группы." },
    { id: "s2", speaker: "Гульмира Сериковна", role: "Директор департамента промышленной политики", timestamp: "00:14", language: "ru", text: "По итогам девяти месяцев загрузка мощностей держится на уровне 71%. Мы теряем на логистике до 8% от себестоимости продукции." },
    { id: "s3", speaker: "Тимур Болатович", role: "Директор департамента инвестиций", timestamp: "00:48", language: "mixed", text: "По проекту модернизации завода техникалық негіздеме готово на 60%. Нужно решение по финансированию до конца квартала." },
    { id: "s4", speaker: "Айнур Каировна", role: "Руководитель управления по работе с подрядчиками", timestamp: "01:17", language: "ru", text: "Предлагаю провести совместное совещание с институтом до конца недели и зафиксировать финальный график поставок." },
    { id: "s5", speaker: "Нурлан Сагатович", role: "Руководитель службы охраны труда", timestamp: "02:31", language: "kk", text: "Павлодар зауытында желіде герметизация бұзылды. Комиссия датчики утечки газа не проходили поверку с прошлого года деп анықтады." },
    { id: "s6", speaker: "Асхат Ерланович", role: "Заместитель председателя правления", timestamp: "03:02", language: "ru", text: "Мне нужен полный аудит по всем датчикам утечки и средствам индивидуальной защиты на всех одиннадцати площадках. К 15 октября жду сводный отчёт." },
  ],
};

export const meetings: MeetingView[] = [
  demoMeeting,
  { ...demoMeeting, id: "production-kpi", title: "Производственные показатели направлений", date: "2026-09-22T09:30:00.000Z", duration: "03:26", participants: ["Данияр Серикович", "Ботагоз Нурлановна", "Жандос Талгатович", "Ерболат Мухтарович", "Салтанат Ерболовна"], tasks: demoMeeting.tasks.slice(0, 4).map((task) => ({ ...task, id: `production-${task.id}`, meetingId: "production-kpi" })) },
  { ...demoMeeting, id: "investment-committee", title: "Инвестиционный комитет · сентябрь", date: "2026-09-19T05:00:00.000Z", duration: "42:18", languages: ["ru"], participants: ["Данияр Серикович", "Тимур Болатович"], tasks: demoMeeting.tasks.slice(2, 5).map((task) => ({ ...task, id: `investment-${task.id}`, meetingId: "investment-committee" })) },
];

export const allTasks: MeetingTask[] = meetings.flatMap((meeting) => meeting.tasks.map((task) => ({ ...task, meetingId: meeting.id })));
