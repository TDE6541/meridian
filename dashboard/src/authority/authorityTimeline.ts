import type { AuthorityTimelineRecord } from "./authorityDashboardTypes.ts";

function timeValue(record: AuthorityTimelineRecord): number {
  if (!record.occurred_at) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Date.parse(record.occurred_at);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

export function sortAuthorityTimelineRecords(
  records: readonly AuthorityTimelineRecord[]
): AuthorityTimelineRecord[] {
  return [...records].sort((left, right) => {
    const byTime = timeValue(left) - timeValue(right);
    if (byTime !== 0) {
      return byTime;
    }

    return left.record_id.localeCompare(right.record_id);
  });
}
