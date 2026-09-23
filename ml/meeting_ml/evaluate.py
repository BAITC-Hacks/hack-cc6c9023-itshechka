"""Transparent evaluation; semantic task matching is explicitly human-supplied."""
import re
from .common import read_json, write_json


def norm(text):
    return ' '.join(re.findall(r'\w+', (text or '').casefold().replace('ё', 'е')))


def edit_distance(reference, hypothesis):
    row = list(range(len(hypothesis)+1))
    for i, a in enumerate(reference, 1):
        next_row = [i]
        for j, b in enumerate(hypothesis, 1):
            next_row.append(min(row[j]+1, next_row[j-1]+1, row[j-1]+(a != b)))
        row = next_row
    return row[-1]


def wer(reference, prediction, out):
    ref, pred = read_json(reference), read_json(prediction)
    a = norm(' '.join(s['text'] for s in ref['segments'])).split()
    b = norm(' '.join(s['text'] for s in pred['segments'])).split()
    if not a:
        raise ValueError('Empty reference transcript')
    distance = edit_distance(a, b)
    report = {'word_error_rate': distance / len(a), 'word_edit_distance': distance, 'reference_words': len(a),
              'reference_source': ref.get('source'),
              'warning': 'DOCX may be edited: this is a document-reference proxy, not verified verbatim ASR WER. No DER without time-aligned speaker ground truth.'}
    write_json(out, report)
    print(report)


def evaluate(reference, prediction, out, matches=None):
    gold, pred = read_json(reference), read_json(prediction)
    g = {t['id']: t for t in gold['tasks']}
    p = {t['id']: t for t in pred['tasks']}
    if len(g) != len(gold['tasks']) or len(p) != len(pred['tasks']):
        raise ValueError('Duplicate task ids')
    if matches:
        pairs = read_json(matches)['matches']
        mode = 'human_semantic_matching'
    else:
        pairs, used = [], set()
        for gid, task in g.items():
            candidates = [pid for pid, other in p.items() if pid not in used and norm(other['task']) == norm(task['task'])]
            if candidates:
                used.add(candidates[0])
                pairs.append({'gold_id': gid, 'prediction_id': candidates[0]})
        mode = 'exact_task_text_lower_bound_not_semantic_quality'
    if any(pair['gold_id'] not in g or pair['prediction_id'] not in p for pair in pairs):
        raise ValueError('Unknown ids in matching file')
    if len({x['gold_id'] for x in pairs}) != len(pairs) or len({x['prediction_id'] for x in pairs}) != len(pairs):
        raise ValueError('Matches must be one-to-one. Review split/merged tasks separately.')
    count = len(pairs)
    precision, recall = count/max(1, len(p)), count/max(1, len(g))
    owner_ok = sum(norm(g[x['gold_id']]['owner']) == norm(p[x['prediction_id']]['owner']) for x in pairs)
    deadline_ok = sum(norm(g[x['gold_id']]['deadline_text']) == norm(p[x['prediction_id']]['deadline_text']) for x in pairs)
    report = {'matching_mode': mode, 'gold_count': len(g), 'prediction_count': len(p), 'matched': count,
              'task_precision': precision, 'task_recall': recall, 'task_f1': 2*precision*recall/max(1e-12, precision+recall),
              'owner_exact_accuracy_on_matched': owner_ok/count if count else None,
              'deadline_text_exact_accuracy_on_matched': deadline_ok/count if count else None,
              'unmatched_gold': [k for k in g if k not in {x['gold_id'] for x in pairs}],
              'unmatched_predictions': [k for k in p if k not in {x['prediction_id'] for x in pairs}], 'matches': pairs,
              'note': 'Owner spelling/case variants, implicit deadlines and merged reference tasks require review. Do not label exact-string metrics semantic extraction quality.'}
    write_json(out, report)
    print(report)
