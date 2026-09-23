import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/password";

const prisma = new PrismaClient();
const seedMeetingId = "seed-demo-meeting";

async function main() {
  const [adminPasswordHash, juryPasswordHash] = await Promise.all([
    hashPassword("Admin2026!"),
    hashPassword("Jury2026!"),
  ]);
  await prisma.user.upsert({
    where: { email: "admin@hattama.kz" },
    update: { passwordHash: adminPasswordHash, fullName: "Данияр Серикович", organization: "HATTAMA AI", role: "ADMIN" },
    create: { email: "admin@hattama.kz", passwordHash: adminPasswordHash, fullName: "Данияр Серикович", organization: "HATTAMA AI", role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "jury@hattama.kz" },
    update: { passwordHash: juryPasswordHash, fullName: "Аккаунт жюри", organization: "Hackathon Jury", role: "MEMBER" },
    create: { email: "jury@hattama.kz", passwordHash: juryPasswordHash, fullName: "Аккаунт жюри", organization: "Hackathon Jury", role: "MEMBER" },
  });

  // Seed можно безопасно запускать повторно: заменяется только принадлежащая ему demo-встреча.
  await prisma.meeting.deleteMany({ where: { id: seedMeetingId } });
  const meeting = await prisma.meeting.create({
    data: {
      id: seedMeetingId,
      title: "Развитие химической промышленности и техника безопасности",
      organization: "АО «Самрук-Қазына Ондеу»",
      sourceType: "FILE",
      status: "READY",
      audioUrl: "seed://meeting-1.mp3",
      durationSec: 900,
    },
  });

  const askhat = await prisma.participant.create({
    data: {
      meetingId: meeting.id,
      speakerTag: "SPEAKER_00",
      fullName: "Асхат Ерланович",
      role: "заместитель председателя правления",
    },
  });
  const gulmira = await prisma.participant.create({
    data: {
      meetingId: meeting.id,
      speakerTag: "SPEAKER_01",
      fullName: "Гульмира Сериковна",
      role: "директор департамента промышленной политики",
    },
  });
  const timur = await prisma.participant.create({
    data: {
      meetingId: meeting.id,
      speakerTag: "SPEAKER_02",
      fullName: "Тимур Болатович",
      role: "директор департамента инвестиций",
    },
  });

  const topic1 = await prisma.topic.create({
    data: { meetingId: meeting.id, title: "Развитие химической промышленности", order: 0, startOrder: 0, endOrder: 2 },
  });
  const topic2 = await prisma.topic.create({
    data: { meetingId: meeting.id, title: "Техника безопасности", order: 1, startOrder: 3, endOrder: 3 },
  });

  await prisma.utterance.createMany({
    data: [
      {
        meetingId: meeting.id,
        participantId: askhat.id,
        order: 0,
        startMs: 0,
        endMs: 6500,
        text: "Коллеги, начинаем. На повестке один вопрос — состояние и перспективы развития химической отрасли в рамках группы.",
      },
      {
        meetingId: meeting.id,
        participantId: gulmira.id,
        order: 1,
        startMs: 6600,
        endMs: 15000,
        text: "По итогам девяти месяцев загрузка мощностей на химических активах группы держится на уровне семьдесят один процент.",
      },
      {
        meetingId: meeting.id,
        participantId: timur.id,
        order: 2,
        startMs: 15100,
        endMs: 24000,
        text: "По проекту модернизации завода в Павлодарской области — техническое обоснование готово на шестьдесят процентов.",
      },
      {
        meetingId: meeting.id,
        participantId: askhat.id,
        order: 3,
        startMs: 24100,
        endMs: 30000,
        text: "Переходим ко второму вопросу — техника безопасности на производственных площадках.",
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        meetingId: meeting.id,
        topicId: topic1.id,
        description: "Разработать единую стратегию закупа сырья для химических активов группы",
        responsibleId: gulmira.id,
        responsibleRaw: "Гульмира Сериковна",
        dueDate: new Date("2026-10-15T00:00:00.000Z"),
        dueRaw: "15 октября",
        status: "OPEN",
      },
      {
        meetingId: meeting.id,
        topicId: topic1.id,
        description: "Подготовить финансовое решение по проекту модернизации завода в Павлодарской области",
        responsibleId: timur.id,
        responsibleRaw: "Тимур Болатович",
        dueDate: new Date("2026-09-30T00:00:00.000Z"),
        dueRaw: "30 сентября",
        status: "OPEN",
      },
    ],
  });

  await prisma.summary.createMany({
    data: [
      {
        meetingId: meeting.id,
        topicId: topic1.id,
        text: "Загрузка мощностей группы — 71%, потери на логистике до 8% себестоимости. ТЭО по Павлодарскому заводу готово на 60%.",
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded demo meeting: ${meeting.id}; demo accounts: admin@hattama.kz, jury@hattama.kz`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
