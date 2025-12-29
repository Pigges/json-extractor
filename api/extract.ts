import { JSONPath } from 'jsonpath-plus';

interface QueryParams {
	key?: string;
	url?: string;
	path?: string;
}

export default {
	async fetch(req: Request) {
		const { searchParams } = new URL(req.url);
		const { key, url, path } = Object.fromEntries(searchParams) as QueryParams;

		// === Security: Secret Key ===
		const SECRET_KEY = process.env.SECRET_KEY ?? 'change-me-to-a-strong-secret';
		if (key !== SECRET_KEY) {
			return new Response('Unauthorized: invalid or missing key', { status: 401 });
		}

		// === Validation ===
		if (!url || !path) {
			return new Response('Missing required parameters: url and path', { status: 400 });
		}

		try {
			// Fetch the external API
			const response = await fetch(url);
			if (!response.ok) {
				return new Response(`Failed to fetch URL: ${response.status} ${response.statusText}`, { status: 502 });
			}

			const data = await response.json();

			// Extract using JSONPath (supports $.store.book[0].title, $..author, $.ranks.premiere, etc.)
			const results: any[] = JSONPath({ path, json: data });

			if (results.length === 0) {
				return new Response('No results found for the given JSONPath', { status: 404 });
			}


			// Smart formatting function
			const formatValue = (value: any): string => {
				if (value === null) return 'null'
				if (typeof value === 'string') return value.trim() // clean string, no quotes
				if (typeof value === 'number' || typeof value === 'boolean') return String(value)
				// Object or array → pretty JSON (one line if short, multi-line if long)
				try {
					const jsonStr = JSON.stringify(value, null, 2)
					return jsonStr.length > 200 ? JSON.stringify(value) : jsonStr // compact if too long
				} catch {
					return '[Unserializable object]'
				}
			}

			const outputParts = results.map(formatValue)

			// Join multiple results
			const finalText = outputParts.length === 1
				? outputParts[0]
				: outputParts.join(', ') // clear separator for multiple

			return new Response(finalText, {
				headers: { 'Content-Type': 'text/plain' }
			})

		} catch (error: any) {
			return new Response(`Error: ${error.message}`, { status: 500 });
		}


		return new Response('Hello World from Bun on Vercel!');
	}
};
