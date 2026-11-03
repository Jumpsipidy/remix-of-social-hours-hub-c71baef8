export type FriendshipPair = { requester_id: string; addressee_id: string };

/** A friendship can occur in both endpoint queries and across chunks. */
export function friendshipCounts(rows: FriendshipPair[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const pair = JSON.stringify([row.requester_id, row.addressee_id].sort());
    if (seen.has(pair)) continue;
    seen.add(pair);
    counts[row.requester_id] = (counts[row.requester_id] ?? 0) + 1;
    counts[row.addressee_id] = (counts[row.addressee_id] ?? 0) + 1;
  }
  return counts;
}