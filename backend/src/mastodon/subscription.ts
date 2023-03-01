import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { b64ToUrlEncoded, exportPublicKeyPair } from 'wildebeest/backend/src/webpush/util'
import { Client } from './client'
import { type Database } from 'wildebeest/backend/src/database'

export type PushSubscription = {
	endpoint: string
	keys: {
		p256dh: string
		auth: string
	}
}

export interface CreateRequest {
	subscription: PushSubscription
	data: {
		alerts: {
			mention?: boolean
			status?: boolean
			reblog?: boolean
			follow?: boolean
			follow_request?: boolean
			favourite?: boolean
			poll?: boolean
			update?: boolean
			admin_sign_up?: boolean
			admin_report?: boolean
		}
		policy?: string
	}
}

export type Subscription = {
	// While the spec says to use a string as id (https://docs.joinmastodon.org/entities/WebPushSubscription/#id), Mastodon's android app decided to violate that (https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/PushSubscription.java#LL11).
	id: number

	gateway: PushSubscription
	alerts: {
		mention: boolean
		status: boolean
		reblog: boolean
		follow: boolean
		follow_request: boolean
		favourite: boolean
		poll: boolean
		update: boolean
		admin_sign_up: boolean
		admin_report: boolean
	}
	policy: string
}

export async function createSubscription(
	db: Database,
	actor: Actor,
	client: Client,
	req: CreateRequest
): Promise<Subscription> {
	const query = `
          INSERT INTO subscriptions (actor_id, client_id, endpoint, key_p256dh, key_auth, alert_mention, alert_status, alert_reblog, alert_follow, alert_follow_request, alert_favourite, alert_poll, alert_update, alert_admin_sign_up, alert_admin_report, policy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
    `
	const row = await db
		.prepare(query)
		.bind(
			actor.id.toString(),
			client.id,
			req.subscription.endpoint,
			req.subscription.keys.p256dh,
			req.subscription.keys.auth,
			req.data.alerts.mention === false ? 0 : 1,
			req.data.alerts.status === false ? 0 : 1,
			req.data.alerts.reblog === false ? 0 : 1,
			req.data.alerts.follow === false ? 0 : 1,
			req.data.alerts.follow_request === false ? 0 : 1,
			req.data.alerts.favourite === false ? 0 : 1,
			req.data.alerts.poll === false ? 0 : 1,
			req.data.alerts.update === false ? 0 : 1,
			req.data.alerts.admin_sign_up === false ? 0 : 1,
			req.data.alerts.admin_report === false ? 0 : 1,
			req.data.policy ?? 'all'
		)
		.first<any>()
	return subscriptionFromRow(row)
}

export async function updateSubscription(
	db: Database,
	actor: Actor,
	client: Client,
	req: CreateRequest
): Promise<Subscription> {
	const query = `
    UPDATE subscriptions SET
      alert_mention=?, 
      alert_status=?, 
      alert_reblog=?, 
      alert_follow=?, 
      alert_follow_request=?, 
      alert_favourite=?, 
      alert_poll=?, 
      alert_update=?, 
      alert_admin_sign_up=?, 
      alert_admin_report=?, 
      policy=?
    WHERE
      actor_id=? AND 
      client_id=? AND 
      endpoint=? AND 
      key_auth=?
    RETURNING actor_id, client_id, endpoint, key_p256dh, key_auth, alert_mention, alert_status, alert_reblog, alert_follow, alert_follow_request, alert_favourite, alert_poll, alert_update, alert_admin_sign_up, alert_admin_report, policy
    `
	const row = await db
		.prepare(query)
		.bind(
			req.data.alerts.mention === false ? 0 : 1,
			req.data.alerts.status === false ? 0 : 1,
			req.data.alerts.reblog === false ? 0 : 1,
			req.data.alerts.follow === false ? 0 : 1,
			req.data.alerts.follow_request === false ? 0 : 1,
			req.data.alerts.favourite === false ? 0 : 1,
			req.data.alerts.poll === false ? 0 : 1,
			req.data.alerts.update === false ? 0 : 1,
			req.data.alerts.admin_sign_up === false ? 0 : 1,
			req.data.alerts.admin_report === false ? 0 : 1,
			req.data.policy ?? 'all',
			actor.id.toString(),
			client.id,
			req.subscription.endpoint,
			req.subscription.keys.auth
		)
		.first<any>()
	return subscriptionFromRow(row)
}

export async function getSubscription(db: Database, actor: Actor, client: Client): Promise<Subscription | null> {
	const query = `
        SELECT * FROM subscriptions WHERE actor_id=? AND client_id=? ORDER BY cdate DESC LIMIT 1;
    `
	try {
		const row = await db.prepare(query).bind(actor.id.toString(), client.id).first()
		return subscriptionFromRow(row)
	} catch {
		console.info('Matching subscription not found in DB')
		return null
	}
}

export async function deleteSubscription(
	db: Database,
	actor: Actor,
	client: Client,
	subscription: PushSubscription
): Promise<boolean> {
	const query = `
        DELETE 
        FROM subscriptions 
        WHERE
          actor_id=? AND 
          client_id=? AND 
          endpoint=? AND 
          key_auth=?
    ;`

	try {
		await db.prepare(query).bind(actor.id.toString(), client.id, subscription.endpoint, subscription.keys.auth).first()
		return true
	} catch {
		console.info('Unable to delete subscription from DB')
		return false
	}
}

export async function getSubscriptionForAllClients(db: Database, actor: Actor): Promise<Array<Subscription>> {
	const query = `
        SELECT * FROM subscriptions WHERE actor_id=? ORDER BY cdate DESC LIMIT 5
    `

	const { success, error, results } = await db.prepare(query).bind(actor.id.toString()).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results) {
		return []
	}

	return results.map(subscriptionFromRow)
}

function subscriptionFromRow(row: any): Subscription {
	return {
		id: row.id,
		gateway: {
			endpoint: row.endpoint,
			keys: {
				p256dh: row.key_p256dh,
				auth: row.key_auth,
			},
		},
		alerts: {
			mention: row.alert_mention === 1,
			status: row.alert_status === 1,
			reblog: row.alert_reblog === 1,
			follow: row.alert_follow === 1,
			follow_request: row.alert_follow_request === 1,
			favourite: row.alert_favourite === 1,
			poll: row.alert_poll === 1,
			update: row.alert_update === 1,
			admin_sign_up: row.alert_admin_sign_up === 1,
			admin_report: row.alert_admin_report === 1,
		},
		policy: row.policy,
	}
}

export function VAPIDPublicKey(keys: JWK): string {
	return b64ToUrlEncoded(exportPublicKeyPair(keys))
}
