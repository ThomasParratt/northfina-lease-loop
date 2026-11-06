'use client';

// The admin approves or rejects a manual review: POST /api/applications/:id/decision, then
// re-render. A case waiting for the signatory is signed through the signing link (D46). A
// refusal is written from the code the server sends (review finding 5).
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { refusalText, type RefusalLabels } from '@/components/refusal-text';
import { Button, Notice } from '@/components/ui';

type DecisionFormProps = {
  applicationId: string;
  /** The buttons, and each refusal code's sentence (`refusalText`). */
  labels: { approve: string; reject: string; refusals: RefusalLabels };
};

export function DecisionForm({ applicationId, labels }: DecisionFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState<'approved' | 'rejected' | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function decide(decision: 'approved' | 'rejected') {
    setPending(decision);
    setFailed(null);
    try {
      const response = await fetch(`/api/applications/${applicationId}/decision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision }),
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

  const blocked = pending !== null;
  return (
    <div className="space-y-4">
      {failed ? (
        <Notice tone="error" live>
          {failed}
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => decide('approved')}
          pending={pending === 'approved'}
          disabled={blocked}
        >
          {labels.approve}
        </Button>
        <Button
          variant="danger"
          onClick={() => decide('rejected')}
          pending={pending === 'rejected'}
          disabled={blocked}
        >
          {labels.reject}
        </Button>
      </div>
    </div>
  );
}
