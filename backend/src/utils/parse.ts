export type Handle = {
	localPart: string
	domain: string | null
}

// Parse a "handle" in the form: `[@] <local-part> '@' <domain>`
export function parseHandle(query: string): Handle {
  // If we were passed a Wildebeest ActivityPub URI...
  if (query.startsWith('http') && query.includes('/ap/users/')) {
    const urlToParse: URL = new URL(query)
    return { 
      localPart: urlToParse.pathname.replace('/ap/users/', ''),
      domain: urlToParse.hostname
    }
  }
  
	// Remove the leading @, if there's one.
	if (query.startsWith('@')) {
		query = query.substring(1)
	}

	// In case the handle has been URL encoded
	query = decodeURIComponent(query)

	const parts = query.split('@')
  if (parts.length === 0) {
    return { localPart: query, domain: null }
  } else if (parts.length === 2) {
		const localPart = parts[0]

		if (!/^[\w-.]+$/.test(localPart)) {
			throw new Error('invalid handle: localPart: ' + localPart)
		}

		if (parts.length > 1) {
			return { localPart, domain: parts[1] }
		} else {
			return { localPart, domain: null }
		}
	} else {
		// Perhaps it's a local URI handle?
		const urlParts = query.replace(/^https?:\/\//, '').split('/')
    return { domain: urlParts[0], localPart: urlParts[urlParts.length - 1] }
	}
}
