export function cors(): object {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization, idempotency-key',
		'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, PATCH, OPTIONS',
    'Access-Control-Max-Age': 30,
	}
}
