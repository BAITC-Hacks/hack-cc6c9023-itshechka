"use client";

import type { Meeting } from "@repo/contracts";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from "docx";
import { Download, FileText, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportControls({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false);
  const exportDocx = async () => {
    const document = new Document({ sections: [{ children: [
      new Paragraph({ text: "Протокол совещания", heading: HeadingLevel.TITLE }),
      new Paragraph({ text: meeting.title, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Дата: ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(meeting.date))}` }),
      new Paragraph({ text: `Участники: ${meeting.participants.join(", ")}` }),
      new Paragraph({ text: "Краткое содержание", heading: HeadingLevel.HEADING_2 }),
      ...meeting.summary.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      new Paragraph({ text: "Поручения", heading: HeadingLevel.HEADING_2 }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ tableHeader: true, children: ["Поручение", "Ответственный", "Срок", "Статус"].map((text) => new TableCell({ children: [new Paragraph({ text })] })) }),
        ...meeting.tasks.map((task) => new TableRow({ children: [task.title, task.assignee, task.dueDate, task.status].map((text) => new TableCell({ children: [new Paragraph({ text })] })) })),
      ] }),
      new Paragraph({ text: "Транскрипт", heading: HeadingLevel.HEADING_2 }),
      ...meeting.transcript.flatMap((segment) => [new Paragraph({ text: `${segment.timestamp} · ${segment.speaker}`, heading: HeadingLevel.HEADING_3 }), new Paragraph({ text: segment.text })]),
    ] }] });
    const blob = await Packer.toBlob(document);
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `Протокол-${meeting.id}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
    setOpen(false);
    toast.success("DOCX сформирован");
  };

  return <div className="export-wrap"><Button variant="secondary" onClick={() => setOpen((value) => !value)} aria-expanded={open}><Download size={18} />Экспорт</Button>{open && <div className="export-menu"><button onClick={exportDocx}><FileText size={18} /><span><strong>Скачать DOCX</strong><small>Редактируемый протокол</small></span></button><button onClick={() => { setOpen(false); window.print(); }}><Printer size={18} /><span><strong>Печать / PDF</strong><small>Сохранить через диалог печати</small></span></button></div>}</div>;
}

