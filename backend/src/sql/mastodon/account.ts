// Prepared statements for Mastodon Account API endpoints
export const mastodonAccountStatisticsQuery = `
SELECT
  (
    SELECT COUNT(outbox.object_id)
    FROM outbox_objects AS outbox
    LEFT JOIN objects AS notes ON 
      outbox.target='https://www.w3.org/ns/activitystreams#Public' AND 
      notes.type = 'Note' AND 
      outbox.object_id = notes.id
    WHERE
      notes.id IS NOT NULL AND
      outbox.actor_id=?
    GROUP BY outbox.object_id
  ) AS statuses_count,
  (
    SELECT COUNT(relationships.id)
    FROM actor_following AS relationships
    WHERE relationships.target_actor_id=?
    GROUP BY relationships.id
  ) AS followers_count,
  (
    SELECT COUNT(relationships.id)
    FROM actor_following AS relationships
    WHERE relationships.actor_id=?
    GROUP BY relationships.id
  ) AS following_count
;`

export const findMastodonAccountIDByEmailQuery = `
SELECT
  id
FROM actors
WHERE
  email=?
ORDER BY cdate DESC
LIMIT 1
;`

export const findAccountIDByMastodonIdQuery = `
SELECT id
FROM actors
WHERE properties ->> '$.mastodon_id' = ?
ORDER BY cdate DESC
LIMIT 1
;`

export const searchCachedAccountsQuery = (
	limit: number = 40,
	offset: number = 0,
	following: boolean = false
): string => {
	const maxResults: number = limit > 80 ? 80 : limit
	if (following) {
		return `
      SELECT
        id
      FROM actors AS accounts
      WHERE
        accounts.type IN ('Person', 'Service') AND 
        accounts.id IN (
          SELECT
            relationships.target_actor_id
          FROM
            actor_following AS relationships
          WHERE
            relationships.actor_id=?
        ) AND 
        (
          (accounts.properties ->> '$.name' = ?) OR 
          (accounts.properties ->> '$.preferredUsername' = ?)
        )
      ORDER BY 
        id DESC 
      LIMIT ${maxResults} 
      OFFSET ${offset}
    ;`
	} else {
		return `
      SELECT
        id
      FROM actors AS accounts
      WHERE
        accounts.type IN ('Person', 'Service') AND 
        (
          (accounts.properties ->> '$.name' = ?) OR 
          (accounts.properties ->> '$.preferredUsername' = ?)
        )
      ORDER BY 
        id DESC 
      LIMIT ${maxResults} 
      OFFSET ${offset}
    ;`
	}
}
