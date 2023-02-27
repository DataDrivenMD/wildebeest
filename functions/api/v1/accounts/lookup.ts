// https://docs.joinmastodon.org/methods/accounts/#lookup

import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { unprocessableEntity } from 'wildebeest/backend/src/errors'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import { getAccount } from 'wildebeest/backend/src/accounts/getAccount'

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ request, env }) => {
  const requestURL: URL = new URL(request.url)
  const acct: string = requestURL.searchParams?.get('acct')
  if (!acct) {
    return unprocessableEntity('`acct` is a required parameter')
  }
	return handleRequest(requestURL.hostname, acct, getDatabase(env))
}

export async function handleRequest(domain: string, id: string, db: Database): Promise<Response> {
	const account = await getAccount(domain, id, db)

	if (account) {
		return new Response(JSON.stringify(account), { headers })
	} else {
		return new Response('', { status: 404 })
	}
}
