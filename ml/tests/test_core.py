import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from meeting_ml.audio import align, speaker_for
from meeting_ml.backend_adapter import to_backend
from meeting_ml.classifier import probability
from meeting_ml.common import ROOT, read_json, read_jsonl, write_json
from meeting_ml.dates import normalize_deadline
from meeting_ml.evaluate import edit_distance, evaluate
from meeting_ml.export import export_protocol
from meeting_ml.extract import validate_result, materialize_source_evidence, extract, NoRedirect


def fixture():
    transcript = {'meeting_id': 'test', 'meeting_date': None, 'segments': [
        {'id': 's1', 'speaker': 'S0', 'speaker_name': 'Руководитель', 'text': 'Ерлан подготовит претензию до пятницы.', 'start': 1.0, 'end': 4.0},
        {'id': 's2', 'speaker': 'S1', 'speaker_name': 'Марат', 'text': 'Я подготовлю отчёт.', 'start': 4.0, 'end': 6.0}]}
    raw = {'summary': [{'text': 'Поручена претензия.', 'segment_ids': ['s1']}], 'tasks': [
        {'task': 'Подготовить претензию', 'owner': 'Ерлан', 'owner_basis': 'explicit', 'owner_evidence': 'Ерлан',
         'deadline_text': 'до пятницы', 'evidence': [{'segment_id': 's1', 'quote': 'Ерлан подготовит претензию до пятницы.'}]}]}
    return transcript, raw


class CoreTests(unittest.TestCase):
    def test_missing_date_not_invented(self):
        self.assertIsNone(normalize_deadline('15 октября')['due_date'])
        self.assertIsNone(normalize_deadline('до пятницы')['due_date'])

    def test_explicit_year_without_meeting_date(self):
        self.assertEqual(normalize_deadline('до 15 октября 2026')['due_date'], '2026-10-15')
        self.assertEqual(normalize_deadline('15.10.2026')['due_date'], '2026-10-15')

    def test_kazakh_calendar(self):
        self.assertEqual(normalize_deadline('15 қазанға дейін', '2026-09-23')['due_date'], '2026-10-15')

    def test_relative_calendar(self):
        self.assertEqual(normalize_deadline('ертең', '2026-09-23')['due_date'], '2026-09-24')
        self.assertEqual(normalize_deadline('за 2 недели', '2026-09-23')['due_date'], '2026-10-07')

    def test_ambiguous_and_invalid(self):
        self.assertIsNone(normalize_deadline('до конца недели', '2026-09-23')['due_date'])
        self.assertIsNone(normalize_deadline('15 января', '2026-09-23')['due_date'])
        self.assertEqual(normalize_deadline('31 февраля 2026')['date_status'], 'invalid_date')

    def test_non_speaking_assignee(self):
        transcript, raw = fixture()
        task = validate_result(raw, transcript)['tasks'][0]
        self.assertEqual(task['owner'], 'Ерлан')
        self.assertEqual(task['owner_speaker_ids'], [])
        self.assertTrue(task['needs_review'])
        self.assertEqual(task['evidence'][0]['start'], 1.0)

    def test_fabricated_quote_rejected(self):
        transcript, raw = fixture()
        raw['tasks'][0]['evidence'][0]['quote'] = 'Ерлан сделает это завтра.'
        with self.assertRaises(ValueError): validate_result(raw, transcript)

    def test_source_citation_is_copied_and_unsupported_owner_removed(self):
        transcript, raw = fixture()
        raw['tasks'][0]['evidence'][0]['quote'] = 'Выдуманная цитата'
        raw['tasks'][0]['owner_evidence'] = 'Выдуманное имя'
        materialize_source_evidence(raw, transcript)
        task = validate_result(raw, transcript)['tasks'][0]
        self.assertEqual(task['evidence'][0]['quote'], transcript['segments'][0]['text'])
        self.assertEqual(task['owner'], 'Ерлан')
        raw['tasks'][0]['owner'] = 'Призрак'
        materialize_source_evidence(raw, transcript)
        task = validate_result(raw, transcript)['tasks'][0]
        self.assertIsNone(task['owner'])
        self.assertIn('owner_missing', task['review_reasons'])

    def test_backend_adapter_preserves_audio_timing_and_unknown_speaker(self):
        transcript, raw = fixture()
        result = validate_result(raw, transcript)
        result['segments'][0]['speaker'] = 'UNKNOWN'
        result['segments'][0]['speaker_name'] = None
        payload = to_backend(result, 'backend-id')
        self.assertEqual(payload['meetingId'], 'backend-id')
        self.assertEqual(payload['utterances'][0]['startMs'], 1000)
        self.assertEqual(payload['utterances'][0]['speakerTag'], 'UNKNOWN')
        self.assertEqual(payload['tasks'][0]['sourceUtteranceOrder'], 0)
        self.assertEqual(payload['tasks'][0]['responsibleRaw'], 'Ерлан')
        self.assertEqual(payload['topics'][0]['endUtteranceOrder'], 1)

    def test_unknown_segment_rejected(self):
        transcript, raw = fixture()
        raw['tasks'][0]['evidence'][0]['segment_id'] = 's999'
        with self.assertRaises(ValueError): validate_result(raw, transcript)

    def test_empty_evidence_rejected(self):
        transcript, raw = fixture()
        raw['tasks'][0]['evidence'] = []
        with self.assertRaises(ValueError): validate_result(raw, transcript)

    def test_duplicate_collapsed(self):
        transcript, raw = fixture()
        raw['tasks'].append(copy.deepcopy(raw['tasks'][0]))
        self.assertEqual(len(validate_result(raw, transcript)['tasks']), 1)

    def test_unknown_owner_not_guessed(self):
        transcript, raw = fixture()
        raw['tasks'][0].update(owner='SPEAKER_01', owner_basis='unknown')
        with self.assertRaises(ValueError): validate_result(raw, transcript)

    def test_speaker_map_needs_confirmation(self):
        transcript, raw = fixture()
        raw['tasks'][0].update(owner='Ерлан', owner_basis='speaker_map')
        with self.assertRaises(ValueError): validate_result(raw, transcript)

    def test_owner_evidence_checked(self):
        transcript, raw = fixture()
        raw['tasks'][0]['owner_evidence'] = 'Асем'
        with self.assertRaises(ValueError): validate_result(raw, transcript)

    def test_summary_sources_checked(self):
        transcript, raw = fixture()
        raw['summary'][0]['segment_ids'] = ['nonexistent']
        with self.assertRaises(ValueError): validate_result(raw, transcript)

    def test_overlap_and_silence(self):
        turns = [{'start': 0, 'end': 1, 'speaker': 'A'}, {'start': 1, 'end': 3, 'speaker': 'B'}]
        self.assertEqual(speaker_for(0.8, 2, turns)[0], 'B')
        self.assertEqual(speaker_for(5, 6, turns)[0], 'UNKNOWN')

    def test_word_level_speaker_change(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            transcript = {'meeting_id': 'test', 'segments': [{'id': 'original', 'start': 0, 'end': 2, 'text': 'Да нет',
                'words': [{'start': 0, 'end': 1, 'text': ' Да'}, {'start': 1, 'end': 2, 'text': ' нет'}]}]}
            write_json(p/'asr.json', transcript)
            write_json(p/'turns.json', {'turns': [{'start': 0, 'end': 1, 'speaker': 'A'}, {'start': 1, 'end': 2, 'speaker': 'B'}]})
            align(p/'asr.json', p/'turns.json', p/'out.json')
            result = read_json(p/'out.json')
            self.assertEqual([s['speaker'] for s in result['segments']], ['A', 'B'])
            self.assertEqual([s['text'] for s in result['segments']], ['Да', 'нет'])

    def test_no_training_test_text_overlap(self):
        rows = [read_jsonl(ROOT/f'data/synthetic/{split}.jsonl') for split in ('train', 'validation', 'test')]
        a, b, c = [set(r['text'] for r in split) for split in rows]
        self.assertFalse(a & b or a & c or b & c)
        self.assertTrue(all(r['source'].startswith('synthetic') for split in rows for r in split))

    def test_portable_model(self):
        model = read_json(ROOT/'models/action_detector.json')
        for text in ('', 'Привет', 'Қазақша мәтін', 'prepare a report'):
            self.assertTrue(0 <= probability(model, text) <= 1)

    def test_html_escapes_transcript(self):
        transcript, raw = fixture()
        result = validate_result(raw, transcript)
        result['segments'][0]['text'] = '<script>alert(1)</script>'
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            write_json(p/'result.json', result)
            export_protocol(p/'result.json', p/'export')
            text = (p/'export/protocol.html').read_text(encoding='utf-8')
            self.assertNotIn('<script>', text)
            self.assertIn('&lt;script&gt;', text)

    def test_edit_distance(self):
        self.assertEqual(edit_distance(['один', 'два'], ['один', 'три', 'четыре']), 2)

    def test_duplicate_matches_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            tasks = {'tasks': [{'id': 'a', 'task': 'test', 'owner': None, 'deadline_text': None}]}
            write_json(p/'gold.json', tasks); write_json(p/'pred.json', tasks)
            write_json(p/'matches.json', {'matches': [{'gold_id': 'a', 'prediction_id': 'a'}]*2})
            with self.assertRaises(ValueError): evaluate(p/'gold.json', p/'pred.json', p/'out.json', p/'matches.json')

    def test_remote_model_rejected_before_content_send(self):
        transcript, _ = fixture()
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)/'transcript.json'
            write_json(path, transcript)
            with patch('meeting_ml.extract.local_request', return_value={'remote_host': 'remote.invalid'}) as request:
                with self.assertRaises(ValueError): extract(path, Path(temp)/'out.json')
                self.assertEqual(request.call_count, 1)
                self.assertEqual(request.call_args.args[0], '/api/show')

    def test_redirect_forbidden(self):
        with self.assertRaises(ValueError): NoRedirect().redirect_request(None)

    def test_llm_integration_contract_mocked(self):
        import json
        transcript, raw = fixture()
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            write_json(p/'input.json', transcript)
            with patch('meeting_ml.extract.local_request', side_effect=[{}, {'message': {'content': json.dumps(raw)}, 'done_reason': 'stop'}]):
                extract(p/'input.json', p/'out.json')
            self.assertEqual(read_json(p/'out.json')['tasks'][0]['owner'], 'Ерлан')


if __name__ == '__main__':
    unittest.main()
