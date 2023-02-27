import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { getVAPIDKeys } from 'wildebeest/backend/src/config'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { createSubscription, getSubscription, updateSubscription, deleteSubscription } from 'wildebeest/backend/src/mastodon/subscription'
import type { CreateRequest } from 'wildebeest/backend/src/mastodon/subscription'
import { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { VAPIDPublicKey } from 'wildebeest/backend/src/mastodon/subscription'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleGetRequest(getDatabase(env), request, data.connectedActor, data.clientId, getVAPIDKeys(env))
}

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handlePostRequest(getDatabase(env), request, data.connectedActor, data.clientId, getVAPIDKeys(env))
}

export const onRequestPut: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handlePutRequest(getDatabase(env), request, data.connectedActor, data.clientId, getVAPIDKeys(env))
}

export const onRequestDelete: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleDeleteRequest(getDatabase(env), request, data.connectedActor, data.clientId)
}

const headers = new Headers(cors())
headers.set('Access-Control-Allow-Credentials', true)
headers.set('Access-Control-Allow-Headers', 'content-type, authorization, idempotency-key')
headers.set('Access-Control-Max-Age', 30)
headers.set('content-type', 'application/json; charset=utf-8')
headers.append('Vary', 'Origin; Access-Control-Allow-Methods')

export async function handleGetRequest(
	db: Database,
	request: Request,
	connectedActor: Actor,
	clientId: string,
	vapidKeys: JWK
) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const subscription = await getSubscription(db, connectedActor, client)

	if (subscription === null) {
		return errors.resourceNotFound('subscription', clientId)
	}

	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		id: subscription.id,
		endpoint: subscription.gateway.endpoint,
		alerts: subscription.alerts,
		policy: subscription.policy,
		server_key: vapidKey,
	}

  // Update CORS headers
  const requestURL: URL = new URL(request.url)
  headers.set('Access-Control-Allow-Origin', request.headers.get('origin') ?? requestURL.origin)
  headers.set('Access-Control-Allow-Methods', 'GET')
	return new Response(JSON.stringify(res), { headers })
}

export async function handlePostRequest(
	db: Database,
	request: Request,
	connectedActor: Actor,
	clientId: string,
	vapidKeys: JWK
) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const data = await request.json<CreateRequest>()

	let subscription = await getSubscription(db, connectedActor, client)

	if (subscription === null) {
		subscription = await createSubscription(db, connectedActor, client, data)
	}

	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		id: subscription.id,
		endpoint: subscription.gateway.endpoint,
		alerts: subscription.alerts,
		policy: subscription.policy,
		server_key: vapidKey,
	}

  // Update CORS headers
  const requestURL: URL = new URL(request.url)
  headers.set('Access-Control-Allow-Origin', request.headers.get('origin') ?? requestURL.origin)
  headers.set('Access-Control-Allow-Methods', 'POST')
	return new Response(JSON.stringify(res), { headers })
}

export async function handlePutRequest(
	db: Database,
	request: Request,
	connectedActor: Actor,
	clientId: string,
	vapidKeys: JWK
) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}
  
  const updatesRequested: CreateRequest = await request.json<CreateRequest>()
	const existingSubscription = await getSubscription(db, connectedActor, client)

	if (existingSubscription === null) {
		return errors.resourceNotFound('No matching subscriptions found', clientId)
	}

  const updatedSubscription: CreateRequest = {
    subscription: existingSubscription?.subscription,
    data: {
      alerts: {
        mention: updatesRequested?.data?.alerts?.mention ?? existingSubscription?.data?.alerts?.mention,
        status: updatesRequested?.data?.alerts?.status ?? existingSubscription?.data?.alerts?.status,
        reblog: updatesRequested?.data?.alerts?.reblog ?? existingSubscription?.data?.alerts?.reblog,
        follow: updatesRequested?.data?.alerts?.follow ?? existingSubscription?.data?.alerts?.follow,
        follow_request: updatesRequested?.data?.alerts?.follow_request ?? existingSubscription?.data?.alerts?.follow_request,
        favourite: updatesRequested?.data?.alerts?.favourite ?? existingSubscription?.data?.alerts?.favourite,
        poll: updatesRequested?.data?.alerts?.poll ?? existingSubscription?.data?.alerts?.poll,
        update: updatesRequested?.data?.alerts?.update ?? existingSubscription?.data?.alerts?.update,
        admin_sign_up: updatesRequested?.data?.alerts?.admin_sign_up ?? existingSubscription?.data?.alerts?.admin_sign_up,
        admin_report: updatesRequested?.data?.alerts?.admin_report ?? existingSubscription?.data?.alerts?.admin_report,
      },
      policy: updatesRequested?.data?.policy ?? existingSubscription?.data?.policy
    }
  }
  
  const subscription = await updateSubscription(db, connectedActor, client, updatedSubscription)

	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		id: subscription.id,
		endpoint: subscription.gateway.endpoint,
		alerts: subscription.alerts,
		policy: subscription.policy,
		server_key: vapidKey,
	}

  // Update CORS headers
  const requestURL: URL = new URL(request.url)
  headers.set('Access-Control-Allow-Origin', request.headers.get('origin') ?? requestURL.origin)
  headers.set('Access-Control-Allow-Methods', 'PUT')
	return new Response(JSON.stringify(res), { headers })
}

export async function handleDeleteRequest(
	db: Database,
	request: Request,
	connectedActor: Actor,
	clientId: string
) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const subscription = await getSubscription(db, connectedActor, client)
  let isSuccessful: boolean = true;
	if (subscription !== null) {
		isSuccessful = await deleteSubscription(db, connectedActor, client, subscription) ?? false
	}
  
  // Update CORS headers
  const requestURL: URL = new URL(request.url)
  headers.set('Access-Control-Allow-Origin', request.headers.get('origin') ?? requestURL.origin)
  headers.set('Access-Control-Allow-Methods', 'DELETE')
  return (isSuccessful ? new Response('{}', { headers }) : errors.notAuthorized('invalid push subscription deletion request', 'Either the subscription does not exist, or the client presented invalid or outdated credentials'))
}
