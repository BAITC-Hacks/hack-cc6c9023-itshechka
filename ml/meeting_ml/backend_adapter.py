"""Map reviewed-source ML JSON into packages/contracts/src/ai-worker.ts.

This adapter does not imply that the ML draft has been approved. In particular,
ASR-only runs have UNKNOWN speakers and a single unsegmented topic.
"""
from .common import read_json, write_json


def to_backend(result, meeting_id):
    segments = result['segments']
    orders = {segment['id']: index for index, segment in enumerate(segments)}
    speakers = {}
    for segment in segments:
        tag = segment.get('speaker')
        if tag and tag != 'UNKNOWN':
            speakers.setdefault(tag, {'speakerTag': tag,
                                      'fullNameGuess': segment.get('speaker_name'),
                                      'roleGuess': None})
    utterances = [{'speakerTag': segment.get('speaker') or 'UNKNOWN',
                   'text': segment['text'],
                   'startMs': round(segment['start'] * 1000),
                   'endMs': round(segment['end'] * 1000),
                   'order': index} for index, segment in enumerate(segments)]
    tasks = []
    for task in result['tasks']:
        source = next((orders[item['segment_id']] for item in task['evidence']
                       if item['segment_id'] in orders), None)
        owner_tags = [tag for tag in task.get('owner_speaker_ids', []) if tag in speakers]
        tasks.append({'description': task['task'],
                      'responsibleSpeakerTag': owner_tags[0] if len(owner_tags) == 1 else None,
                      'responsibleRaw': task.get('owner'),
                      'dueDateIso': task.get('due_date'),
                      'dueRaw': task.get('deadline_text'),
                      'topicOrder': 0 if segments else None,
                      'sourceUtteranceOrder': source})
    summary = '\n'.join(item['text'] for item in result['summary'])
    return {'meetingId': meeting_id,
            'durationSec': round(max((segment['end'] for segment in segments), default=0)),
            'speakers': list(speakers.values()),
            'utterances': utterances,
            'topics': [{'title': 'Обсуждение', 'order': 0,
                        'startUtteranceOrder': 0, 'endUtteranceOrder': len(segments)-1}]
                      if segments else [],
            'tasks': tasks,
            'summaries': [{'topicOrder': 0 if segments else None, 'text': summary}]
                         if summary else []}


def convert(result_path, meeting_id, out):
    result = read_json(result_path)
    if result.get('review_status') != 'unreviewed_draft':
        raise ValueError('Expected a validated local ML draft')
    payload = to_backend(result, meeting_id)
    write_json(out, payload)
    return payload
