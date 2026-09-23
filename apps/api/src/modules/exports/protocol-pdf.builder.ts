import PdfPrinter = require("pdfmake");
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import type { ProtocolData } from "./protocol-docx.builder";

// pdfmake ships embeddable Roboto fonts, including Cyrillic glyphs.
const fonts = require("pdfmake/build/vfs_fonts") as Record<string, string>;
const printer = new PdfPrinter({
  Roboto: {
    normal: Buffer.from(fonts["Roboto-Regular.ttf"], "base64"),
    bold: Buffer.from(fonts["Roboto-Medium.ttf"], "base64"),
    italics: Buffer.from(fonts["Roboto-Italic.ttf"], "base64"),
    bolditalics: Buffer.from(fonts["Roboto-MediumItalic.ttf"], "base64"),
  },
});

export async function writeProtocolPdf(data: ProtocolData, filePath: string): Promise<void> {
  const content: Content[] = [
    { text: "Протокол совещания", style: "title" },
  ];
  if (data.organization) content.push({ text: data.organization, italics: true });
  content.push(
    { text: `Тема: ${data.title}`, bold: true, margin: [0, 8, 0, 0] },
    { text: `Дата: ${data.createdAt.toLocaleDateString("ru-RU")}`, italics: true },
  );
  data.topics.forEach((topic, index) => {
    content.push({
      text: data.topics.length > 1 ? `Часть ${index + 1}. ${topic.title}` : topic.title,
      style: "heading",
    });
    for (const utterance of topic.utterances) {
      content.push({
        text: [
          { text: utterance.speakerName, bold: true },
          ...(utterance.speakerRole ? [{ text: ` (${utterance.speakerRole})`, italics: true }] : []),
        ],
        margin: [0, 5, 0, 2],
      });
      content.push({ text: utterance.text });
    }
    if (topic.tasks.length) {
      content.push({ text: "Поручения", style: "subheading" });
      content.push({
        table: {
          headerRows: 1,
          widths: ["*", 125, 80],
          body: [
            ["Поручение", "Ответственный", "Срок"],
            ...topic.tasks.map(task => [task.description, task.responsible, task.due]),
          ],
        },
      });
    }
    if (topic.summary) {
      content.push({ text: "Саммари", style: "subheading" }, { text: topic.summary });
    }
  });
  if (data.overallSummary) {
    content.push({ text: "Общее саммари", style: "heading" }, { text: data.overallSummary });
  }
  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [45, 45, 45, 50],
    content,
    defaultStyle: { font: "Roboto", fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] },
      heading: { fontSize: 13, bold: true, margin: [0, 16, 0, 6] },
      subheading: { fontSize: 11, bold: true, margin: [0, 10, 0, 5] },
    },
  };
  const pdf = printer.createPdfKitDocument(definition);
  const writing = pipeline(pdf, createWriteStream(filePath));
  pdf.end();
  await writing;
}
