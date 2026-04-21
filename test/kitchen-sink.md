# API Migration Guide: v2 → v3

Moving from v2 to v3 is mostly mechanical, but there are a few sharp edges. Read the **breaking changes** section before you start.

## Breaking changes

| What changed | v2 | v3 | Action required |
|:---|:---|:---|:---|
| Auth header | `X-Api-Key` | `Authorization: Bearer` | Update all clients |
| Rate limits | 100/min | 60/min per token | Add retry logic |
| Pagination | offset-based | cursor-based | Rewrite list calls |
| Error format | `{ error: string }` | `{ code, message, details }` | Update error handling |
| Webhooks | POST only | POST + configurable retry | None (backward compatible) |

## New endpoints

### `POST /v3/batch`

Submit up to 100 operations in a single request. Each operation is independent — failures don't roll back the batch.

```json
{
  "operations": [
    { "method": "POST", "path": "/users", "body": { "name": "Alice" } },
    { "method": "PATCH", "path": "/users/42", "body": { "role": "admin" } },
    { "method": "DELETE", "path": "/users/99" }
  ]
}
```

### `GET /v3/stream`

Server-sent events for real-time updates. Replaces the old polling pattern.

```js
const source = new EventSource('/v3/stream?filter=orders.*');

source.addEventListener('order.created', (e) => {
  const order = JSON.parse(e.data);
  console.log(`New order: ${order.id} — $${order.total}`);
});

source.addEventListener('error', (e) => {
  if (e.readyState === EventSource.CLOSED) {
    console.log('Stream closed, reconnecting...');
  }
});
```

## Migration checklist

1. **Update the SDK** to `>= 3.0.0`
2. **Rotate your API keys** — v2 keys work for 90 days, then stop
3. **Switch auth headers** from `X-Api-Key` to `Authorization: Bearer <token>`
4. **Rewrite pagination** — see the [cursor pagination guide](#)
5. **Test error handling** against the new error shape

## Common pitfalls

- **Rate limit math changed.** v2 counted requests per IP. v3 counts per token. If you're sharing a token across services, you'll hit limits faster than expected.
- **Cursor pagination isn't sortable.** You can filter, but you can't change sort order mid-cursor. Start a new cursor if you need a different sort.
- **Batch operations are *not* transactional.** Operation 3 can succeed while operation 1 fails. Check every result.
- **The stream endpoint requires HTTP/2.** Nginx and older load balancers may need config changes.

## SDK comparison

```bash
# v2
npm install @acme/sdk@^2.0
# v3
npm install @acme/sdk@^3.0

# Quick smoke test
node -e "
const Acme = require('@acme/sdk');
const client = new Acme({ token: process.env.ACME_TOKEN });
client.users.list({ limit: 5 }).then(r => console.log(r.data));
"
```

## Timeline

> **April 15** — v3 GA. Both versions run in parallel.
> **July 15** — v2 enters maintenance. Security patches only.
> **October 15** — v2 shutdown. All traffic must be on v3.

Start migrating now. The batch endpoint alone is worth it — teams that switched early cut their API call volume by 40-60%.

---

*Questions? Ping `#platform-eng` in Slack or open an issue on the [migration tracker](#).*
