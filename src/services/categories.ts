import type { Screenshot } from '../types';
export function suggestCategory(text: string): string {
  const t = text.toLowerCase();
  if (/receipt|paid|payment|invoice|৳|total/.test(t)) return 'Receipts';
  if (/flight|ticket|hotel|booking|train/.test(t)) return 'Travel';
  if (/chat|message|whatsapp|reply/.test(t)) return 'Conversations';
  if (/order|cart|delivery|shop/.test(t)) return 'Shopping';
  if (/note|remind|meeting/.test(t)) return 'Notes';
  return 'Other';
}
export type DuplicateGroup = { kind: 'exact' | 'similar'; items: Screenshot[] };
function distance(a: string, b: string) {
  if (a.length !== 16 || b.length !== 16) return 65;
  let n = 0;
  for (let i = 0; i < 16; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    n += ((x >> 3) & 1) + ((x >> 2) & 1) + ((x >> 1) & 1) + (x & 1);
  }
  return n;
}
export function groupDuplicates(items: Screenshot[]): DuplicateGroup[] {
  const exact = new Map<string, Screenshot[]>();
  const used = new Set<string>();
  const groups: DuplicateGroup[] = [];
  items.forEach(item => {
    if (item.hash)
      exact.set(item.hash, [...(exact.get(item.hash) || []), item]);
  });
  exact.forEach(group => {
    if (group.length > 1) {
      groups.push({ kind: 'exact', items: group });
      group.forEach(x => used.add(x.id));
    }
  });
  const candidates = items.filter(x => x.visualHash && !used.has(x.id));
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (used.has(a.id)) continue;
    const group = [a];
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (used.has(b.id)) continue;
      if (
        distance(a.visualHash, b.visualHash) <= 5 &&
        Math.abs(a.width / a.height - b.width / b.height) < 0.06
      ) {
        group.push(b);
        used.add(b.id);
      }
    }
    if (group.length > 1) {
      used.add(a.id);
      groups.push({ kind: 'similar', items: group });
    }
  }
  return groups;
}
