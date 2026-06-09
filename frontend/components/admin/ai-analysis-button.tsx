'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';

interface Props {
  reportText: string;
  period: string;
}

export function AiAnalysisButton({ reportText, period }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reportText, period }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'AI tahlil bermadi');
        return;
      }
      setAnalysis(data.analysis);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={run} disabled={loading} variant="outline">
        {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
        AI tahlil olish
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent
          icon={<Sparkles />}
          iconTone="accent"
          title={`${period.charAt(0).toUpperCase()}${period.slice(1)} AI tahlil`}
          subtitle="Gemini tomonidan tayyorlangan xulosa"
          width={620}
          footer={
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Yopish
              </Button>
            </div>
          }
        >
          <p className="text-[13.5px] leading-[1.6] whitespace-pre-wrap text-[color:var(--ink-2)]">
            {analysis}
          </p>
        </ModalContent>
      </Modal>
    </>
  );
}
