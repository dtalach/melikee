/**
 * Gift inspiration: taste signals in, specific product ideas out.
 *
 * One Claude call, two steps in the prompt:
 *   1. themes — infer 3–5 taste themes from the evidence (starred wants and
 *      saved ideas count most, then searches; turned-down ideas count against);
 *   2. ideas  — specific, currently sold products spread across those themes
 *      and price bands, never repeating what's on their lists, already shown
 *      or turned down, with a short "why" that points at their own signal.
 *
 * No web search here (that would take a minute): ideas are names and queries.
 * The app finds a photo for each in the background (/api/match image) and
 * real stores and prices when someone taps "Want it".
 */
import { createHash } from 'node:crypto';

import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod';

import type { Idea, TasteSignals, Theme } from '../src/lib/ideasContract';
import { BASE, client, MatchError } from './match';

const IdeasSchema = z.object({
  themes: z
    .array(z.object({ name: z.string().describe('2–4 words, e.g. "film photography".'), why: z.string().describe('The signals behind it, briefly.') }))
    .describe('3 to 5 taste themes, strongest first.'),
  ideas: z.array(
    z.object({
      name: z.string().describe('Brand + product + key variant, the way a store lists it.'),
      query: z.string().describe('What to type into a store search to find it.'),
      why: z.string().describe('At most 9 words, pointing at their own signal.'),
      theme: z.string().describe('Which theme it serves, or "stretch".'),
      price: z.string().describe('Typical US price, e.g. "$35".'),
    }),
  ),
});

const BUDGET: Record<TasteSignals['budget'], string> = {
  any: 'no budget given: mix price bands around their usual spend',
  under25: 'everything under $25',
  under50: 'everything under $50',
  under100: 'everything under $100',
  splurge: 'bigger-ticket ideas, $100 and up',
};

const SYSTEM = `You curate gift ideas for MeLikee, a wishlist app for teenagers (13+) and the people who buy for them. You get one person's taste signals as JSON and suggest specific products they would want next.

Work in two steps.

1. Themes. Infer 3 to 5 taste themes from the evidence, each with the signals behind it. Weigh starred wants and saved ideas most, then other wants, then recent searches. Turned-down ideas are evidence against a direction. With little or no evidence, lean on age band, season and upcoming occasions, and pick things widely loved by people that age right now; say so in the theme's why.

2. Ideas. Suggest the requested number of products.
- Each is one real product sold now in their region, named the way a store lists it (brand, product, key variant), so a search finds it. Never a category ("a cozy hoodie", "skincare set").
- Complement, don't duplicate: nothing already on their lists, already seen, or turned down (including near-identical variants). Accessories, upgrades and things that go with what they want are good.
- Spread: at most two ideas per theme, plus one "stretch" idea outside the themes that still fits who they are.
- Price: follow the budget line. Without one, mix bands around the prices on their lists.
- Season and occasions: if Christmas or their birthday is near, lean toward giftable things; never mention dates.
- Age-appropriate, always: no alcohol, nicotine or vapes, cannabis, gambling, weapons, adult content, diet pills or risky supplements. For under-18s also nothing that needs an adult (contracts, subscriptions with auto-renew, dating or meet-up apps).
- why: at most 9 words, specific to them ("goes with your X100VI", "you searched for skate decks"). Never generic ("popular gift", "great choice").
- price: the typical US price, e.g. "$35".`;

function brief(signals: TasteSignals, count: number) {
  return `Taste signals (JSON):
${JSON.stringify(signals)}

Budget: ${BUDGET[signals.budget] ?? BUDGET.any}.
Suggest ${count} ideas.`;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function generateIdeas(signals: TasteSignals, count: number): Promise<{ themes: Theme[]; ideas: Idea[] }> {
  const started = Date.now();
  const message = await client()
    .beta.messages.stream({
      ...BASE,
      max_tokens: 6000,
      system: SYSTEM,
      output_config: { effort: 'low', format: betaZodOutputFormat(IdeasSchema) },
      messages: [{ role: 'user', content: brief(signals, count) }],
    })
    .finalMessage();
  if (message.stop_reason === 'refusal') throw new MatchError('refused', 'Declined while finding ideas.');
  const out = message.parsed_output;
  if (!out) throw new MatchError('upstream', 'The ideas came back empty.');

  // Belt and braces on "never repeat": the model is told, this makes sure.
  const avoid = [...signals.wants.map((w) => w.name), ...signals.seen, ...signals.disliked, ...signals.liked].map(norm).filter(Boolean);
  const taken = new Set<string>();
  const ideas: Idea[] = [];
  for (const i of out.ideas) {
    const n = norm(i.name);
    if (!n || taken.has(n) || avoid.some((a) => a === n || (a.length > 8 && (n.includes(a) || a.includes(n))))) continue;
    taken.add(n);
    ideas.push({
      id: createHash('sha256').update(n).digest('hex').slice(0, 12),
      name: i.name.trim().slice(0, 120),
      query: (i.query || i.name).trim().slice(0, 120),
      why: i.why.trim().slice(0, 80),
      theme: i.theme.trim().slice(0, 40),
      price: i.price.trim().slice(0, 12),
    });
  }
  console.log(`[ideas] ${ideas.length}/${out.ideas.length} ideas, ${out.themes.length} themes, ${Date.now() - started}ms`);
  return { themes: out.themes.slice(0, 5).map((t) => ({ name: t.name.slice(0, 40), why: t.why.slice(0, 160) })), ideas: ideas.slice(0, count) };
}

/** Clamp what the app sent to sane sizes before it reaches the prompt. */
export function cleanSignals(raw: unknown): TasteSignals | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const strs = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, n).map((x: string) => x.slice(0, max)) : []);
  const bands = ['13-15', '16-17', '18-24', '25+'];
  const budgets = ['any', 'under25', 'under50', 'under100', 'splurge'];
  return {
    ageBand: bands.includes(r.ageBand as string) ? (r.ageBand as TasteSignals['ageBand']) : undefined,
    region: str(r.region, 60),
    month: str(r.month, 12) ?? '',
    occasions: Array.isArray(r.occasions)
      ? (r.occasions as Record<string, unknown>[]).filter((o) => o && typeof o.name === 'string' && typeof o.days === 'number').slice(0, 4).map((o) => ({ name: (o.name as string).slice(0, 30), days: Math.max(0, Math.min(400, Math.round(o.days as number))) }))
      : [],
    sizes: strs(r.sizes, 6, 40),
    budget: budgets.includes(r.budget as string) ? (r.budget as TasteSignals['budget']) : 'any',
    wants: Array.isArray(r.wants)
      ? (r.wants as Record<string, unknown>[])
          .filter((w) => w && typeof w.name === 'string')
          .slice(0, 30)
          .map((w) => ({ name: (w.name as string).slice(0, 120), store: str(w.store, 40), price: str(w.price, 12), list: str(w.list, 40), star: w.star === true || undefined }))
      : [],
    searches: strs(r.searches, 10, 80),
    liked: strs(r.liked, 25, 120),
    disliked: strs(r.disliked, 40, 120),
    seen: strs(r.seen, 80, 120),
  };
}
