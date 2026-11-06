'use client';

// Sign or decline through the link: POST /api/sign/:token, then re-render (D46). A refusal (a
// used or expired link, an ended right) is written from the server's code (review finding 5).
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { refusalText, type RefusalLabels } from '@/components/refusal-text';
import { Button, Notice } from '@/components/ui';

type SignFormProps = {
  token: string;
  labels: { sign: string; decline: string; refusals: RefusalLabels };
};

export function SignForm({ token, labels }: SignFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState<'sign' | 'decline' | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function act(action: 'sign' | 'decline') {
    setPending(action);
    setFailed(null);
    try {
      const response = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        setFailed(refusalText(await response.json().catch(() => null), labels.refusals));
        return;
      }
      router.refresh();
    } catch {
      setFailed(labels.refusals.error);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      {failed ? (
        <Notice tone="error" live>
          {failed}
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => act('sign')}
          pending={pending === 'sign'}
          disabled={pending !== null}
        >
          {labels.sign}
        </Button>
        <Button
          variant="danger"
          onClick={() => act('decline')}
          pending={pending === 'decline'}
          disabled={pending !== null}
        >
          {labels.decline}
        </Button>
      </div>
    </div>
  );
}
