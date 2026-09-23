"""Backend-friendly Markdown and printable HTML; no cloud document service."""
import html
from pathlib import Path
from .common import read_json


def export_protocol(source, out):
    data = read_json(source)
    target = Path(out)
    target.mkdir(parents=True, exist_ok=True)
    lines = ['# Протокол совещания', '', f'Идентификатор: {data["meeting_id"]}',
             f'Дата: {data.get("meeting_date") or "не задана"}', '',
             '**Черновик ИИ. Требует проверки секретарём.**', '', '## Краткое содержание', '']
    for item in data.get('summary', []):
        lines.append(f'- {item["text"]}')
    lines.extend(['', '## Поручения', ''])
    for i, t in enumerate(data['tasks'], 1):
        lines.extend([f'### {i}. {t["task"]}', '', f'Ответственный: {t.get("owner") or "уточнить"}', '',
                      f'Срок: {t.get("deadline_text") or "не указан"}; дата: {t.get("due_date") or "требует уточнения"}', ''])
        for e in t.get('evidence', []):
            stamp = f'{e["start"]:.1f}–{e["end"]:.1f} c' if e.get('start') is not None and e.get('end') is not None else 'без временной разметки'
            lines.extend([f'> {e["quote"]}', '', f'Источник: {e["segment_id"]}, {stamp}', ''])
    lines.extend(['## Транскрипт', ''])
    for s in data.get('segments', []):
        lines.extend([f'**{s.get("speaker_name") or s.get("speaker", "UNKNOWN")}** [{s["id"]}]: {s["text"]}', ''])
    text = '\n'.join(lines) + '\n'
    (target / 'protocol.md').write_text(text, encoding='utf-8')
    rendered = '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Протокол</title><style>body{font:15px/1.5 sans-serif;max-width:900px;margin:40px auto;padding:0 20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}@media print{body{margin:0}button{display:none}}</style><button onclick="window.print()">Печать / Сохранить как PDF</button><pre>' + html.escape(text) + '</pre></html>'
    (target / 'protocol.html').write_text(rendered, encoding='utf-8')
    print(f'Exported {target}/protocol.md and protocol.html (browser Print -> Save as PDF)')
