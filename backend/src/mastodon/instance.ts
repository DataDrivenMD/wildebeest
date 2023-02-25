import type { InstanceStatistics } from 'wildebeest/backend/src/types/instance'
import { instanceStatisticsQuery } from 'wildebeest/backend/src/sql/mastodon/instance'

export async function calculateInstanceStatistics(origin: string, db: Database): Promise<InstanceStatistics> {
	const row: any = await db.prepare(instanceStatisticsQuery).bind(origin).first()

	return {
    'user_count': row?.user_count ?? 0,
    'status_count': row?.status_count ?? 0,
    'domain_count': row?.domain_count ?? 1
  }
}
