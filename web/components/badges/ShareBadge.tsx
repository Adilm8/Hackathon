'use client';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

/**
 * Share a new badge: the system share sheet where there is one, otherwise the text is copied.
 * Only the badge name and the app link are shared, never the child's name or pictures.
 */
export function ShareBadge({ label }: { label: string }) {
  const share = async () => {
    const url = window.location.origin;
    const text = `Our little one just earned the "${label}" badge! We got ready for the big day with short bedtime stories.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Big Day Stories', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('Copied. Paste it in a message to family.');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast('Sharing is not available in this browser.');
    }
  };
  return (
    <Button variant="secondary" onClick={share}>
      <Icon name="share-2" size={18} /> Share the good news
    </Button>
  );
}
