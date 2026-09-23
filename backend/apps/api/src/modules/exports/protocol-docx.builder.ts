import {
  Document,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
} from "docx";

export interface ProtocolTopic {
  title: string;
  utterances: { speakerName: string; speakerRole: string | null; text: string }[];
  tasks: { description: string; responsible: string; due: string }[];
  summary: string | null;
}

export interface ProtocolData {
  title: string;
  organization: string | null;
  createdAt: Date;
  topics: ProtocolTopic[];
  overallSummary: string | null;
}

const COLUMN_WIDTHS = [4500, 2500, 2000]; // поручение / ответственный / срок, sums to TABLE_WIDTH
const TABLE_WIDTH = COLUMN_WIDTHS.reduce((a, b) => a + b, 0);

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "E8E8E8" },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
  });
}

function bodyCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [new Paragraph(text)],
  });
}

function tasksTable(tasks: ProtocolTopic["tasks"]) {
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    rows: [
      new TableRow({
        children: [
          headerCell("Поручение", COLUMN_WIDTHS[0]),
          headerCell("Ответственный", COLUMN_WIDTHS[1]),
          headerCell("Срок", COLUMN_WIDTHS[2]),
        ],
      }),
      ...tasks.map(
        (t) =>
          new TableRow({
            children: [
              bodyCell(t.description, COLUMN_WIDTHS[0]),
              bodyCell(t.responsible, COLUMN_WIDTHS[1]),
              bodyCell(t.due, COLUMN_WIDTHS[2]),
            ],
          }),
      ),
    ],
  });
}

export function buildProtocolDocument(data: ProtocolData): Document {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: "Протокол совещания", heading: HeadingLevel.TITLE }),
  ];

  if (data.organization) {
    children.push(new Paragraph({ children: [new TextRun({ text: data.organization, italics: true })] }));
  }
  children.push(
    new Paragraph({ children: [new TextRun({ text: `Тема: ${data.title}`, bold: true })] }),
    new Paragraph({
      children: [
        new TextRun({ text: `Дата: ${data.createdAt.toLocaleDateString("ru-RU")}`, italics: true }),
      ],
    }),
  );

  data.topics.forEach((topic, idx) => {
    children.push(
      new Paragraph({
        text: data.topics.length > 1 ? `Часть ${idx + 1}. ${topic.title}` : topic.title,
        heading: HeadingLevel.HEADING_1,
      }),
    );

    for (const u of topic.utterances) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: u.speakerName, bold: true }),
            ...(u.speakerRole ? [new TextRun({ text: ` (${u.speakerRole})`, italics: true })] : []),
          ],
        }),
        new Paragraph(u.text),
      );
    }

    if (topic.tasks.length) {
      children.push(
        new Paragraph({ text: "Поручения", heading: HeadingLevel.HEADING_2 }),
        tasksTable(topic.tasks),
      );
    }

    if (topic.summary) {
      children.push(
        new Paragraph({ text: "Саммари", heading: HeadingLevel.HEADING_2 }),
        new Paragraph(topic.summary),
      );
    }
  });

  if (data.overallSummary) {
    children.push(
      new Paragraph({ text: "Общее саммари", heading: HeadingLevel.HEADING_1 }),
      new Paragraph(data.overallSummary),
    );
  }

  return new Document({
    sections: [{ properties: {}, children }],
  });
}
