// Prepared statements for Mastodon Instance API endpoints
export const instanceStatisticsQuery = `
SELECT
  (SELECT count(1) FROM actors WHERE type = 'Person' AND id LIKE '?/ap/users/%') AS user_count,  
  (SELECT count(1) FROM objects WHERE local = 1 AND type = 'Note') AS status_count,
  (SELECT count(1) FROM peers) + 1 AS domain_count
;
`