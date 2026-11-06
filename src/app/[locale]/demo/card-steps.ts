// Writes the card runner's codes in the visitor's language (AGENTS.md rule 6): a step's code is
// `demo.step.<code>`, a refusal's `demo.run.<code>`; params named `…Cents` are money, `date` and
// `…Date` / `…On` are days, `decision`, `status` and `condition` are the app's own words.
// Shared by the server page (the inputs line) and the client run button (the steps).
import { formatEuro } from '@/domain/money';
import { formatIsoDate } from '@/i18n/format';
import type { MessageKey, Translate } from '@/i18n/get-t';
import { intlLocale, type Locale } from '@/i18n/locales';

export type CodedLine = { code: string; params: Record<string, string | number> };

function formatParam(name: string, value: string | number, t: Translate, locale: Locale) {
  if (typeof value === 'number' && name.endsWith('Cents')) {
    return formatEuro(value, intlLocale[locale]);
  }
  if (typeof value !== 'string') return value;
  if (name === 'date' || name.endsWith('Date') || name.endsWith('On')) {
    return formatIsoDate(value, locale);
  }
  if (name === 'decision') return t(`decision.status.${value}` as MessageKey);
  if (name === 'status') return t(`status.${value}` as MessageKey);
  if (name === 'condition') return t(`condition.${value}` as MessageKey);
  if (name === 'reasons' && value === '') return '–';
  return value;
}

/** The params of a coded line, formatted for `locale`. */
export function formatParams(
  params: CodedLine['params'],
  t: Translate,
  locale: Locale
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).map(([name, value]) => [name, formatParam(name, value, t, locale)])
  );
}

/** One coded line as a sentence, from the message key `${prefix}.${code}`. */
export function codedMessage(
  prefix: 'demo.step' | 'demo.run',
  line: CodedLine,
  t: Translate,
  locale: Locale
): string {
  return t(`${prefix}.${line.code}` as MessageKey, formatParams(line.params, t, locale));
}
