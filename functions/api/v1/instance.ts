// https://docs.joinmastodon.org/entities/Instance/
// https://docs.joinmastodon.org/methods/instance/
import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { DEFAULT_THUMBNAIL } from 'wildebeest/backend/src/config'
import { MASTODON_API_VERSION, getVersion } from 'wildebeest/config/versions'
import { calculateInstanceStatistics } from 'wildebeest/backend/src/mastodon/instance'
import { MastodonInstance, type InstanceStatistics } from 'wildebeest/backend/src/types/instance'
import { MastodonAccount } from '../../../backend/src/types/account'
import { getAccount, getAccountByEmail } from '../../../backend/src/accounts/getAccount'
import { Database, getDatabase } from 'wildebeest/backend/src/database'


export const onRequestGet: PagesFunction<Env> = async (context: EventContext): Response | Promise<Response> => {
	const hostURL: URL = new URL(context.request.url)
  const db: Database = getDatabase(context.env)
	return handleRequest(hostURL, db, context.env)
}

export async function handleRequest(hostURL: URL, db: Database, env: Env) {
  const domain: string = hostURL.hostname ?? env.DOMAIN
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}

  const instanceStatistics: InstanceStatistics = await calculateInstanceStatistics(hostURL.origin, db)
  
  
  let contactAccount: MastodonAccount | undefined;
  
  if (env.INSTANCE_CONTACT_ACCOUNT) {
    contactAccount = (await getAccount(domain, env.INSTANCE_CONTACT_ACCOUNT, db)) ?? undefined
  } 
  if (contactAccount === undefined) {
    contactAccount = (await getAccountByEmail(domain, env.ADMIN_EMAIL, db)) ?? undefined
  }

	const res: MastodonInstance = {
    'uri': domain,
    'title': env.INSTANCE_TITLE,
    'description': env.INSTANCE_DESCR,
    'short_description': env.INSTANCE_DESCR,
    'email': env.ADMIN_EMAIL,
    'version': getVersion() ?? MASTODON_API_VERSION,
    'languages': ['en'],
    'registrations': env.INSTANCE_ACCEPTING_REGISTRATIONS ?? false,
    'approval_required': env.INSTANCE_REGISTRATIONS_REQUIRE_APPROVAL ?? false,
    'invites_enabled': env.INSTANCE_INVITES_ENABLED ?? false,
    'urls': {},
    'thumbnail': DEFAULT_THUMBNAIL,
    'contact_account': contactAccount,
    'configuration': {
      'statuses':{
        'max_characters': env.INSTANCE_CONFIG_STATUSES_MAX_CHARACTERS ?? 500,
        'max_media_attachments': 4,
        'characters_reserved_per_url': 23
      },
      'media_attachments':{
        'supported_mime_types':[
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4'
        ],
        'image_size_limit':10485760,
        'image_matrix_limit':16777216,
        'video_size_limit':41943040,
        'video_frame_rate_limit':60,
        'video_matrix_limit':2304000
      },
      'polls':{
        'max_options': 4,
        'max_characters_per_option': 50,
        'min_expiration': 300,
        'max_expiration': 2629746
      }
    },
    'stats': instanceStatistics,
    'rules': []
  }

	return new Response(JSON.stringify(res), { headers })
}
