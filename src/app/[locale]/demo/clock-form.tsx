'use client';

// The demo clock controls: a date field, quick jumps and a reset. Each posts to
// POST /api/demo/clock, which sets the cookie, then re-renders the server pages. A day before
// the latest recorded day is refused (D90, `clock_before_records`); the form says up to when.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, Notice, inputClasses } from '@/components/ui';
import { formatIsoDate } from '@/i18n/format';
import type { Locale } from '@/i18n/locales';

export type ClockFormLabels = {
  date: string;
  dateHint: string;
  travel: string;
  presets: string;
  reset: string;
  pending: string;
  error: string;
  /** The `clock_before_records` message, its `{date}` still to fill. */
  beforeRecords: string;
};

type ClockFormProps = {
  today: string;
  overridden: boolean;
  locale: Locale;
  /** Quick jumps: the ISO day and its label in the page's language. */
  presets: Array<{ iso: string; label: string }>;
  labels: ClockFormLabels;
};

type ClockRefusal = { error?: { details?: { code?: string; params?: { latestDay?: string } } } };

export function ClockForm({ today, overridden, locale, presets, labels }: ClockFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(asOf: string | null, which: string) {
    setPending(which);
    setError(null);
    try {
      const response = await fetch('/api/demo/clock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asOf }),
      });
      if (response.status === 409) {
        const details = ((await response.json()) as ClockRefusal).error?.details;
        const latestDay = details?.params?.latestDay;
        if (details?.code === 'clock_before_records' && latestDay) {
          setError(labels.beforeRecords.replace('{date}', formatIsoDate(latestDay, locale)));
          return;
        }
      }
      if (!response.ok) throw new Error(`status ${response.status}`);
      const body = (await response.json()) as { data: { today: string } };
      setDate(body.data.today);
      router.refresh();
    } catch {
      setError(labels.error);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void move(date, 'travel');
        }}
      >
        <Field
          id="demo-as-of"
          label={labels.date}
          hint={labels.dateHint}
          className="w-full sm:w-64"
        >
          {(control) => (
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClasses}
              {...control}
            />
          )}
        </Field>
        <Button type="submit" pending={pending === 'travel'} pendingLabel={labels.pending}>
          {labels.travel}
        </Button>
      </form>

      <fieldset>
        <legend className="mb-2 font-medium">{labels.presets}</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.iso}
              variant="secondary"
              size="sm"
              pending={pending === preset.iso}
              aria-pressed={overridden && today === preset.iso}
              onClick={() => void move(preset.iso, preset.iso)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            disabled={!overridden}
            pending={pending === 'reset'}
            onClick={() => void move(null, 'reset')}
          >
            {labels.reset}
          </Button>
        </div>
      </fieldset>

      {error ? (
        <Notice tone="error" live>
          {error}
        </Notice>
      ) : null}
    </div>
  );
}
