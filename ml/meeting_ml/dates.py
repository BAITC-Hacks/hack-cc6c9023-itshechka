"""Conservative normalization: never invent the recording date or calendar year."""
import re
from datetime import date, timedelta

MONTHS = {'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6,
          'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
          'қаңтар': 1, 'ақпан': 2, 'наурыз': 3, 'сәуір': 4, 'мамыр': 5, 'маусым': 6,
          'шілде': 7, 'тамыз': 8, 'қыркүйек': 9, 'қазан': 10, 'қараша': 11, 'желтоқсан': 12}


def normalize_deadline(raw, meeting_date=None):
    if not raw:
        return {'due_date': None, 'date_status': 'not_stated'}
    text = raw.lower().strip()
    base = date.fromisoformat(meeting_date) if meeting_date else None
    exact = re.search(r'\b(20\d\d)-(\d{2})-(\d{2})\b', text)
    try:
        if exact:
            return {'due_date': date(*map(int, exact.groups())).isoformat(), 'date_status': 'explicit'}
        numeric = re.search(r'\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b', text)
        if numeric:
            day, month, year = map(int, numeric.groups())
            return {'due_date': date(year, month, day).isoformat(), 'date_status': 'explicit'}
        # A yearless date earlier than the meeting may refer to a past deadline: no rollover guess.
        for month, number in MONTHS.items():
            match = re.search(r'\b(\d{1,2})\s+' + month + r'[а-яәғқңөұүһі]*\b(?:\s+(20\d\d))?', text)
            if match:
                year = int(match[2]) if match[2] else (base.year if base else None)
                if year is None:
                    return {'due_date': None, 'date_status': 'missing_meeting_date'}
                result = date(year, number, int(match[1]))
                if not match[2] and result < base:
                    return {'due_date': None, 'date_status': 'ambiguous_year'}
                return {'due_date': result.isoformat(), 'date_status': 'explicit' if match[2] else 'meeting_year_assumption'}
        if base is None:
            return {'due_date': None, 'date_status': 'missing_meeting_date'}
        if text in ('завтра', 'до завтра', 'ертең', 'ертеңге дейін'):
            return {'due_date': (base + timedelta(days=1)).isoformat(), 'date_status': 'relative_calendar'}
        if text in ('сегодня', 'бүгін'):
            return {'due_date': base.isoformat(), 'date_status': 'relative_calendar'}
        match = re.fullmatch(r'(?:через|за|в течение)\s+(\d+)\s+(день|дня|дней|неделю|недели|недель)', text)
        if match:
            days = int(match[1]) * (7 if match[2].startswith('нед') else 1)
            return {'due_date': (base + timedelta(days=days)).isoformat(), 'date_status': 'relative_calendar'}
    except ValueError:
        return {'due_date': None, 'date_status': 'invalid_date'}
    # Friday can be a business-day cutoff or next Friday; week/month ranges are not points.
    return {'due_date': None, 'date_status': 'needs_clarification'}
