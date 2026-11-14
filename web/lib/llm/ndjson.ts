/**
 * Streaming responses as `application/x-ndjson` (docs/SPEC.md 9): one JSON object per line.
 * The generator is closed when the client goes away, which aborts the model call behind it.
 */
import 'server-only';

export function ndjson(events: AsyncGenerator<object>, first?: IteratorResult<object>): Response {
  const enc = new TextEncoder();
  let pending: IteratorResult<object> | undefined = first;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = pending ?? (await events.next());
        pending = undefined;
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(enc.encode(JSON.stringify(next.value) + '\n'));
      } catch (e) {
        console.error('[ndjson] stream failed:', e instanceof Error ? e.name : 'error');
        controller.close();
      }
    },
    async cancel() {
      await events.return(undefined);
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    },
  });
}
