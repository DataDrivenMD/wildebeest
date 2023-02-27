import { WILDEBEEST_VERSION, MASTODON_API_VERSION } from 'wildebeest/config/versions'

export function getFederationUA(domain: string = 'https://github.com/cloudflare/wildebeest'): string {
	return `Wildebeest/${WILDEBEEST_VERSION} (Mastodon/${MASTODON_API_VERSION}; +${domain})`
}
