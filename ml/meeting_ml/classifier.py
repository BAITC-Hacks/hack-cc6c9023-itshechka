"""Train using sklearn, export plain JSON; prediction only needs the stdlib."""
import math
import re
from collections import Counter
from .common import ROOT, read_json, read_jsonl, write_json


def features(text, low=2, high=4):
    text = re.sub(r'\s\s+', ' ', text.lower())
    return Counter(text[i:i+n] for n in range(low, high + 1) for i in range(max(0, len(text)-n+1)))


def probability(model, text):
    terms = model['terms']
    vals = [(count * terms[term][0], terms[term][1]) for term, count in features(text).items() if term in terms]
    norm = math.sqrt(sum(value*value for value, _ in vals)) or 1
    score = model['intercept'] + sum(value*coef/norm for value, coef in vals)
    return 1 / (1 + math.exp(-max(-700, min(700, score))))


def metrics(labels, preds):
    tp = sum(a == b == 1 for a, b in zip(labels, preds))
    fp = sum(a == 0 and b == 1 for a, b in zip(labels, preds))
    fn = sum(a == 1 and b == 0 for a, b in zip(labels, preds))
    p, r = tp / max(1, tp + fp), tp / max(1, tp + fn)
    return {'precision': p, 'recall': r, 'f1': 2*p*r/max(1e-12, p+r), 'tp': tp, 'fp': fp, 'fn': fn, 'n': len(labels)}


def train():
    import sklearn
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    train_rows = read_jsonl(ROOT / 'data/synthetic/train.jsonl')
    val_rows = read_jsonl(ROOT / 'data/synthetic/validation.jsonl')
    test_rows = read_jsonl(ROOT / 'data/synthetic/test.jsonl')
    sets = [set(r['text'] for r in rows) for rows in [train_rows, val_rows, test_rows]]
    assert not (sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2]), 'Data leakage'
    vectorizer = TfidfVectorizer(analyzer='char', ngram_range=(2, 4), min_df=2, max_features=18000)
    x = vectorizer.fit_transform([r['text'] for r in train_rows])
    clf = LogisticRegression(C=4, class_weight='balanced', max_iter=1000, random_state=42)
    clf.fit(x, [r['label'] for r in train_rows])
    model = {'format': 'char_tfidf_logreg_v1', 'intercept': float(clf.intercept_[0]), 'threshold': 0.5,
             'terms': {term: [float(vectorizer.idf_[i]), float(clf.coef_[0, i])] for term, i in vectorizer.vocabulary_.items()},
             'training': {'sklearn': sklearn.__version__, 'samples': len(train_rows), 'seed': 42,
                          'source': 'synthetic templates only; supplied protocols excluded'}}
    val_probs = [probability(model, r['text']) for r in val_rows]
    labels = [r['label'] for r in val_rows]
    threshold = max([i/100 for i in range(20, 81, 5)], key=lambda t: metrics(labels, [int(p >= t) for p in val_probs])['f1'])
    model['threshold'] = threshold
    # Check portable inference actually agrees with the library (not just the same labels).
    library_probs = clf.predict_proba(vectorizer.transform([r['text'] for r in test_rows]))[:, 1]
    max_error = max(abs(float(p)-probability(model, r['text'])) for p, r in zip(library_probs, test_rows))
    if max_error > 1e-9:
        raise ValueError(f'JSON model export is inconsistent: {max_error}')
    report = {'task': 'utterance_action_candidate_classification_only', 'threshold': threshold,
              'validation': metrics(labels, [int(p >= threshold) for p in val_probs]),
              'test': {}, 'portable_export_max_probability_error': max_error,
              'limitations': 'Synthetic scores do not measure ASR, diarization, extraction, or real meetings.'}
    report['test_majority_positive_baseline'] = metrics([r['label'] for r in test_rows], [1]*len(test_rows))
    for lang in ('ru', 'kk', 'mixed', 'all'):
        rows = [r for r in test_rows if lang == 'all' or r['language'] == lang]
        report['test'][lang] = metrics([r['label'] for r in rows], [int(probability(model, r['text']) >= threshold) for r in rows])
    write_json(ROOT / 'models/action_detector.json', model)
    write_json(ROOT / 'reports/training_metrics.json', report)
    print(report)


def rank(transcript_path, out):
    transcript = read_json(transcript_path)
    model = read_json(ROOT / 'models/action_detector.json')
    rows = [{**s, 'action_candidate_score': round(probability(model, s['text']), 4),
             'is_candidate': probability(model, s['text']) >= model['threshold']} for s in transcript['segments']]
    write_json(out, {'meeting_id': transcript['meeting_id'], 'mode': 'classifier_only_not_task_extraction',
                     'segments': rows, 'warning': 'Keep all turns for LLM extraction; the classifier must not discard context.'})
    print(f'Saved {len(rows)} scored turns to {out}')
