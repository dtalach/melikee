/** Your sizes, saved once on your profile and shown to gifters on your shared links. */
export type Sizes = { tops?: string; bottoms?: string; shoes?: string; other?: string };

export const SIZE_FIELDS: { key: keyof Sizes; label: string; placeholder: string }[] = [
  { key: 'tops', label: 'Tops', placeholder: 'e.g. M' },
  { key: 'bottoms', label: 'Bottoms', placeholder: 'e.g. 28, or M' },
  { key: 'shoes', label: 'Shoes', placeholder: 'e.g. women’s 8' },
  { key: 'other', label: 'Other', placeholder: 'e.g. ring 6, hat S/M' },
];

export const TOP_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const MAX_SIZE = 30;

/** Trims each size, drops empty ones; undefined when there's nothing to show. */
export function cleanSizes(raw: unknown): Sizes | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Sizes = {};
  for (const { key } of SIZE_FIELDS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, MAX_SIZE);
  }
  return Object.keys(out).length ? out : undefined;
}

/** "Tops M", "Shoes women’s 8", and the "other" text as written. */
export function sizeParts(s?: Sizes): string[] {
  if (!s) return [];
  return SIZE_FIELDS.filter((f) => s[f.key]).map((f) => (f.key === 'other' ? s[f.key]! : `${f.label} ${s[f.key]}`));
}
