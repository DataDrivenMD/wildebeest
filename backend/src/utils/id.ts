// This method generates a Mastodon-compatible identifier
// see: https://github.com/mastodon/mastodon/blob/main/lib/mastodon/snowflake.rb
export function createMastodonId(text: string): string {
	const time_part: BigInt = BigInt(Date.now()) << 16n
	const sequence_base: BigInt = BigInt(
		'0x' + stringToHex(text + self.crypto.randomUUID().toString() + time_part.toString()).substring(0, 4)
	)
	const tail: BigInt = (sequence_base + self.crypto.getRandomValues(new BigUint64Array(1))[0]) & 65535n
	return (time_part | tail).toString()
}

const stringToHex = (str: string) => {
	let hex: string = ''
	for (let i = 0, l = str.length; i < l; i++) {
		hex += str.charCodeAt(i).toString(16)
	}
	return hex
}

export function isNumeric(value: any): boolean {
	return !isNaN(value - parseFloat(value))
}
