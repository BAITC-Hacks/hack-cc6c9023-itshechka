"""Template-generated data: never claim this is real ASR or natural-language quality."""
import random
from .common import ROOT, write_json, write_jsonl

# Entire surface-template families are held out. Topic/name combinations differ too.
PATTERNS = {
    'ru': {
        'train': (['{n}, подготовьте {t} {d}.', 'Поручаю: {t}. Ответственный — {n}, срок — {d}.',
                   '{n}: Беру на себя {t}, сделаю {d}.'],
                  ['{n}: Мы уже завершили {t} {d}.', 'Нужно ли вообще делать {t}? Решения пока нет.',
                   'Предложение про {t} отклонено, {n} ничего не поручаем.']),
        'validation': (['Прошу {n} взять в работу {t}; представить результат {d}.',
                        'Решено: {n} отвечает за {t}, завершить {d}.'],
                       ['{n} рассказал, как раньше выполняли {t}.',
                        'Может быть, обсудим {t} {d}, но это пока лишь идея.']),
        'test': (['Закрепляем за {n} задачу: {t}. Контрольный срок: {d}.',
                  'Договорились, {n} обеспечит {t} {d}.'],
                 ['От {n} поступил вопрос о {t}; обязательств никто не принял.',
                  '{t} нам больше не требуется: вопрос снят с повестки.'])},
    'kk': {
        'train': (['{n}, {t}. Мерзімі: {d}.', 'Тапсырма: {t}. Жауапты — {n}, мерзімі — {d}.',
                   '{n}: Бұл жұмысты өзім орындаймын: {t}. Мерзімі: {d}.'],
                  ['{n}: Бұл жұмыс аяқталды: {t}.', 'Ұсыныс қабылданбады: {t}.',
                   '{t} туралы әзірге шешім жоқ.']),
        'validation': (['{n} келесі жұмысты орындасын: {t}. Мерзімі: {d}.',
                        'Келістік, {n} осыған жауап береді: {t}. Соңғы мерзім: {d}.'],
                       ['{n} өткен жұмыстың нәтижесін баяндады.', 'Бұл тек ұсыныс, бекітілген тапсырма емес: {t}.']),
        'test': (['Осы міндет {n} қызметкеріне жүктелсін: {t}. Аяқтау мерзімі: {d}.',
                  'Хаттамаға енгізіңіз: {n}, міндеті — {t}, мерзімі — {d}.'],
                 ['{n} бұл мәселені бұрын шешкенін айтты.', '{t} қажет пе деген сұрақ ашық қалды.'])},
    'mixed': {
        'train': (['{n}, {t}. Дедлайн — {d}, келісілді.', 'Тапсырма бекітілді: {t}, ответственный {n}, срок {d}.',
                   '{n}: Жақсы, сделаю {t} {d}.'],
                  ['{n}: Отчёт дайын, {t} уже завершили.', 'Мүмкін {t}, но пока ничего не решено.',
                   'Бұл ұсыныс отклонён: {t}.']),
        'validation': (['Решім қабылданды: {n} орындайды — {t}; срок {d}.',
                        '{n}, осы жұмысты берём в план: {t}, аяқтау {d}.'],
                       ['{n} кешегі нәтиже туралы рассказал, новых задач нет.', 'Әзірге бұл идея: {t}, не поручение.']),
        'test': (['Бекітеміз: {n} отвечает за {t}. Мерзімі {d}.',
                  'Хаттамаға жазыңыз, {n} обеспечит {t}, срок {d}.'],
                 ['{n} сұрақ қойды, но обязательств не брал.', 'Мәселе жабылды: {t} больше не нужно.'])}
}
TOPICS = {
    'train': ['отчёт по закупкам', 'проверку датчиков', 'смету обучения', 'график поставок', 'аудит склада', 'план ремонта'],
    'validation': ['сводку по логистике', 'реестр сертификатов', 'анализ энергозатрат'],
    'test': ['расчёт резервов', 'перечень договоров', 'оценку выбросов']}
KAZAKH_TOPICS = {
    'train': ['есепті дайындаңыз', 'датчиктерді тексеріңіз', 'оқыту жоспарын жасаңыз', 'кестені бекітіңіз', 'қойманы тексеріңіз', 'сметаны жіберіңіз'],
    'validation': ['сертификаттар тізімін жасаңыз', 'шығындарды есептеңіз', 'логистиканы тексеріңіз'],
    'test': ['шарттар тізімін жаңартыңыз', 'қорларды бағалаңыз', 'шығарындыларды өлшеңіз']}
NAMES = {'train': ['Айдана', 'Марат', 'Руслан', 'Дана', 'Алия', 'Олжас'],
         'validation': ['Сауле', 'Бекзат', 'Ильяс'], 'test': ['Мадина', 'Арман', 'Асем']}


def generate(seed=42):
    rng = random.Random(seed)
    stats, seen = {}, set()
    for split in ('train', 'validation', 'test'):
        rows = []
        for lang in PATTERNS:
            topics = KAZAKH_TOPICS[split] if lang == 'kk' else TOPICS[split]
            for label, templates in [(1, PATTERNS[lang][split][0]), (0, PATTERNS[lang][split][1])]:
                for ti, template in enumerate(templates):
                    for name in NAMES[split]:
                        for topic in topics:
                            deadline = rng.choice(['ертең', 'жұмаға дейін', '15 қазанға дейін'] if lang == 'kk' else ['завтра', 'до пятницы', 'до 15 октября'])
                            text = template.format(n=name, t=topic, d=deadline)
                            if text in seen:
                                continue
                            seen.add(text)
                            rows.append({'id': f'{split}_{lang}_{label}_{ti}_{len(rows):04d}', 'text': text,
                                         'label': label, 'language': lang, 'group': f'{split}_{lang}_{label}_{ti}',
                                         'source': 'synthetic_template_v1', 'not_human_validated': True})
        rng.shuffle(rows)
        write_jsonl(ROOT / f'data/synthetic/{split}.jsonl', rows)
        stats[split] = {'count': len(rows), 'positives': sum(x['label'] for x in rows)}
    write_json(ROOT / 'data/synthetic/manifest.json', {'seed': seed, 'splits': stats,
        'split_policy': 'disjoint template families, names, topics; exact duplicates removed across all splits',
        'limitations': 'Small templated linguistic benchmark. Kazakh/mixed examples require native-speaker review. Not audio data.'})
    print(stats)
    # A wholly fictional dialogue, independent of provided recordings.
    texts = [
        ('SPEAKER_00', 'Айдана', 'Марат, подготовьте отчёт по закупкам до 15 октября.'),
        ('SPEAKER_01', 'Марат', 'За две недели не успею. Давайте к 20 октября?'),
        ('SPEAKER_00', 'Айдана', 'Согласовано, итоговый срок отчёта — 20 октября.'),
        ('SPEAKER_00', 'Айдана', 'Дана, датчиктерді тексеріңіз. Мерзімі: жұмаға дейін.'),
        ('SPEAKER_02', 'Дана', 'Жақсы, проверку датчиков сделаю до пятницы.'),
        ('SPEAKER_01', 'Марат', 'Отчёт за август уже отправлен, новых поручений по нему нет.'),
        ('SPEAKER_00', 'Айдана', 'Идею нового склада пока не утверждаем.'),
        ('SPEAKER_00', 'Айдана', 'Марат, ещё согласуйте бюджет с Даной. Срок уточним отдельно.')]
    transcript = {'schema_version': 1, 'meeting_id': 'fictional_demo', 'meeting_date': '2026-09-23',
                  'title': 'Учебное совещание: вымышленные участники', 'source': 'synthetic_text_only',
                  'participants': [{'speaker_id': s, 'name': n} for s, n in [('SPEAKER_00', 'Айдана'), ('SPEAKER_01', 'Марат'), ('SPEAKER_02', 'Дана')]],
                  'segments': [{'id': f'demo_s{i:03d}', 'speaker': s, 'speaker_name': n, 'start': None, 'end': None, 'text': t}
                               for i, (s, n, t) in enumerate(texts, 1)]}
    write_json(ROOT / 'data/demo/transcript.json', transcript)
    write_json(ROOT / 'data/demo/expected.json', {'meeting_id': 'fictional_demo', 'tasks': [
        {'id': 'demo_a01', 'task': 'Подготовить отчёт по закупкам', 'owner': 'Марат', 'deadline_text': '20 октября', 'due_date': '2026-10-20'},
        {'id': 'demo_a02', 'task': 'Проверить датчики', 'owner': 'Дана', 'deadline_text': 'до пятницы', 'due_date': None},
        {'id': 'demo_a03', 'task': 'Согласовать бюджет с Даной', 'owner': 'Марат', 'deadline_text': None, 'due_date': None}]})
