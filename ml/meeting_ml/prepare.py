"""Import supplied documents without using summaries as model input."""
import hashlib
import re
import shutil
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from .common import ROOT, write_json

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}


def text_of(node):
    return ''.join(n.text or '' for n in node.findall('.//w:t', NS)).strip()


def parse_document(path, meeting_id):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read('word/document.xml'))
    body = root.find('w:body', NS)
    participants, segments, tasks = [], [], []
    speaker, in_summary = None, False
    title = ''
    for element in body:
        kind = element.tag.rsplit('}', 1)[-1]
        if kind == 'p':
            text = text_of(element)
            if not text:
                continue
            if text.startswith('Тема:'):
                title = text[5:].strip()
            if text.startswith('Саммари по ключевым пунктам'):
                in_summary = True
            if in_summary:
                continue
            match = re.fullmatch(r'([А-ЯӘҒҚҢӨҰҮҺІЁ][а-яәғқңөұүһіё]+\s+[А-ЯӘҒҚҢӨҰҮҺІЁ][а-яәғқңөұүһіё]+)(?:\s*\((.+)\))?', text)
            if match:
                speaker = match[1]
                if speaker not in [p['name'] for p in participants]:
                    participants.append({'name': speaker, 'role': match[2], 'speaker_id': f'DOC_SPEAKER_{len(participants):02d}'})
            elif speaker and not text.startswith(('Часть ', 'Текст совещания')):
                person = next(p for p in participants if p['name'] == speaker)
                segments.append({'id': f'{meeting_id}_s{len(segments)+1:03d}', 'speaker': person['speaker_id'],
                                 'speaker_name': speaker, 'start': None, 'end': None, 'text': text})
        elif kind == 'tbl' and in_summary:
            rows = [[text_of(cell) for cell in row.findall('w:tc', NS)] for row in element.findall('w:tr', NS)]
            if rows and rows[0][:3] == ['Поручение', 'Ответственный', 'Срок']:
                for row in rows[1:]:
                    if len(row) >= 3:
                        tasks.append({'id': f'{meeting_id}_a{len(tasks)+1:02d}', 'task': row[0], 'owner': row[1],
                                      'deadline_text': None if row[2] == 'Не указан' else row[2], 'due_date': None})
    if not segments or not tasks:
        raise ValueError(f'Unexpected source document structure: {path}')
    transcript = {'schema_version': 1, 'meeting_id': meeting_id, 'meeting_date': None, 'title': title,
                  'source': 'provided_docx_transcript_not_asr', 'language': 'ru', 'participants': participants,
                  'segments': segments, 'warnings': ['Document speaker labels are not audio diarization.',
                                                    'Recording date and word timestamps have not been verified.']}
    gold = {'meeting_id': meeting_id, 'source': 'provided_docx_summary_table', 'tasks': tasks,
            'notes': ['Reference annotations are the supplied summary tables, not newly verified audio labels.',
                      'Meeting 2 groups training organisation and estimate into one task; allow split-task review.',
                      'No calendar dates can be inferred without the true meeting date.',
                      'Meeting 2: Erlan is the assignee; Botagoz is the reporting manager.']}
    # Links manually derived from the supplied DOCX text; never fabricated audio timestamps.
    reference_links = {
        'meeting_01': [[7], [7], [7], [7], [7], [12, 13, 14, 15],
                       [16, 17, 18, 19, 20, 21], [26, 27, 28, 29], [22, 23, 24], [30, 31]],
        'meeting_02': [[3, 4, 5], [3, 5, 6], [7, 8, 9, 10, 11, 12], [13, 14],
                       [15, 16, 17, 18, 19, 20, 21], [22, 23, 24, 25, 26, 27]]}
    links = reference_links.get(meeting_id, [])
    if len(links) == len(tasks) and len(segments) == {'meeting_01': 32, 'meeting_02': 28}.get(meeting_id):
        for task, indices in zip(tasks, links):
            task['evidence_segment_ids'] = [f'{meeting_id}_s{i:03d}' for i in indices]
            task['evidence_annotation_source'] = 'assistant_docx_review_not_audio_verified'
    return transcript, gold


def prepare(source):
    source = Path(source).resolve()
    out = ROOT / 'data/private'
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    briefs = [p for p in source.glob('*.docx') if p.name.startswith('HackAlem')]
    for brief in briefs:
        dest = out / 'case_brief.docx'
        shutil.copy2(brief, dest)
        manifest.append({'path': 'data/private/case_brief.docx', 'original_name': brief.name,
                         'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(), 'bytes': dest.stat().st_size})
    for index in (1, 2):
        documents = [p for p in source.glob('*.docx') if p.name.startswith('Протокол') and str(index) in p.stem]
        audios = [p for p in source.glob('*.mp3') if str(index) in p.stem]
        if len(documents) != 1 or len(audios) != 1:
            raise ValueError(f'Expected one protocol and one audio for meeting {index} in {source}')
        mid = f'meeting_{index:02d}'
        transcript, gold = parse_document(documents[0], mid)
        write_json(out / f'{mid}.transcript.json', transcript)
        write_json(out / f'{mid}.gold.json', gold)
        for file, name in [(documents[0], f'{mid}.docx'), (audios[0], f'{mid}.mp3')]:
            dest = out / name
            if file.resolve() != dest.resolve():
                shutil.copy2(file, dest)
            manifest.append({'path': f'data/private/{name}', 'original_name': file.name,
                             'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(), 'bytes': dest.stat().st_size})
        print(f'{mid}: {len(transcript["segments"])} turns, {len(gold["tasks"])} reference tasks')
    write_json(out / 'manifest.json', {'access': 'internal_team_only', 'files': manifest})
