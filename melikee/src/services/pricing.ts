/**
 * The price errand.
 *
 * A capture finishes the moment we know *what* the thing is — about four
 * seconds — because that is the whole of the claim being made: MeLikee looked
 * at the thing in your hand and knew it. Finding out what it costs and who
 * sells it takes twenty seconds more, and nobody should stand still for that.
 *
 * So the shiny is filed first and this runs behind it, writing the answer onto
 * an item that already exists. It deliberately does not live in the capture
 * store: by the time it finishes, that store has been reset and the camera is
 * idle again, which is exactly the point.
 *
 * One happy side effect: the search only runs for things people actually
 * claimed. A capture someone rejects costs nothing but the reading.
 */
import { matchProduct } from '@/services/productMatch';
import type { ProductReading } from '@/services/recognition/contract';
import { useAppStore } from '@/store/useAppStore';

/**
 * Errands in flight, so a second capture of the same item can't start a second
 * search, and so a removed item's answer can be dropped on arrival.
 */
const running = new Set<string>();

export function priceInBackground(itemId: string, reading: ProductReading, photoUri?: string) {
  if (running.has(itemId)) return;
  running.add(itemId);

  void (async () => {
    const startedAt = Date.now();
    try {
      const outcome = await matchProduct({ mode: 'snap', photoUri, reading });
      const store = useAppStore.getState();

      // The item may have been undone from the filing tray while we were out.
      // Writing a price onto something the user deleted is worse than silence.
      if (!store.items.some((i) => i.id === itemId)) return;

      if (outcome.ok) {
        const [match, ...alternates] = outcome.candidates;
        store.attachPricing(itemId, {
          match,
          alternates: alternates.length ? alternates : undefined,
          checkedAt: new Date().toISOString(),
        });
        store.updateLookup({
          searchMs: Date.now() - startedAt,
          candidates: outcome.candidates.map((c) => ({
            name: c.name,
            price: c.price,
            store: c.storeName,
            hasImage: Boolean(c.imageUrl),
            hasLink: Boolean(c.buyUrl),
            confidence: c.confidence,
          })),
        });
      } else {
        store.attachPricing(itemId, {});
        store.updateLookup({
          searchMs: Date.now() - startedAt,
          error: { code: outcome.code, message: outcome.message },
        });
      }
    } catch (error) {
      const store = useAppStore.getState();
      if (store.items.some((i) => i.id === itemId)) store.attachPricing(itemId, {});
      store.updateLookup({
        searchMs: Date.now() - startedAt,
        error: {
          code: 'upstream',
          message: error instanceof Error ? error.message : 'The price errand failed.',
        },
      });
    } finally {
      running.delete(itemId);
    }
  })();
}

/** Ask again for a shiny whose first errand came back empty. */
export function retryPricing(itemId: string) {
  const item = useAppStore.getState().items.find((i) => i.id === itemId);
  if (!item?.reading) return;
  useAppStore.getState().attachPricing(itemId, { match: undefined });
  useAppStore.setState((s) => ({
    items: s.items.map((i) => (i.id === itemId ? { ...i, pricing: 'working' as const } : i)),
  }));
  priceInBackground(itemId, item.reading, item.photoUri);
}
