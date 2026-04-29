# Acuity Professional SDK

Official client libraries for the Acuity Work Management API. Wraps the public `/api/v1` REST endpoints + WebSocket events + key-value app storage. Inspired by the structure of the monday.com SDK so existing apps port over with minimal changes.

## Quickstart

### 1. Generate a token
Settings → Developer → New Token.

### 2. Pick your language

| | Acuity SDK | Equivalent monday SDK call |
|---|---|---|
| List boards | `acuity.api.boards.list()` | `monday.api('query { boards { id } }')` |
| Get board | `acuity.api.boards.get(id)` | `monday.api('query { boards(id: ID) { ... }}')` |
| Create item | `acuity.api.items.create(boardId, {...})` | `monday.api('mutation { create_item }')` |
| Storage | `acuity.storage.get/set/delete` | `monday.storage.instance.getItem(...)` |
| Live events | `acuity.listen(boardId, cb)` | `monday.listen('events', cb)` |
| Authenticate | `acuity.auth.login(...)` | OAuth flow |

---

## Python

```bash
curl -O https://<your-host>/api/sdk/python   # or download from Settings → Developer
pip install requests websocket-client
```

```python
from acuity_sdk import AcuitySDK

acuity = AcuitySDK(token="ak_xxxxx")
print(acuity.api.whoami())

# Inject items from your CV parser
boards = acuity.api.boards.list()
board = acuity.api.boards.get(boards[0]["id"])

acuity.api.items.create(
    board_id=board["id"],
    name="Candidate: Jane Doe",
    column_values={"<email_col_id>": "jane@example.com"},
)

# Persist run metadata
acuity.storage.set("last_run_at", "2026-04-29T10:00:00Z")
print(acuity.storage.get("last_run_at"))

# Subscribe to board events (blocking)
acuity.events.on_board(board["id"], lambda evt: print(evt))
```

---

## JavaScript / Node.js

```bash
curl -O https://<your-host>/api/sdk/javascript   # or download from Settings → Developer
# In Node:
npm install ws
```

```js
const acuitySdk = require('./acuity-sdk.js');
const acuity = acuitySdk({ token: 'ak_xxxxx' });

await acuity.api.whoami();

const boards = await acuity.api.boards.list();
await acuity.api.items.create(boards[0].id, {
  name: 'Candidate: Jane Doe',
  column_values: { '<email_col_id>': 'jane@example.com' },
});

await acuity.storage.set('lastRunAt', Date.now());

const sub = acuity.listen(boards[0].id, (evt) => console.log(evt));
// later: sub.close()
```

### Browser (script tag)

```html
<script src="https://<your-host>/api/sdk/javascript/cdn"></script>
<script>
  const acuity = window.acuitySdk({ token: 'ak_xxx' });
  acuity.api.boards.list().then(console.log);
</script>
```

---

## API surface

```
acuity.api.whoami()
acuity.api.boards.list()
acuity.api.boards.get(boardId)
acuity.api.items.create(boardId, { name, group_id?, column_values? })

acuity.storage.get(key)
acuity.storage.set(key, value)
acuity.storage.delete(key)
acuity.storage.keys()

acuity.listen(boardId, callback)         // JS
acuity.events.on_board(boardId, callback)  # Python

acuity.auth.login(email, password, totp?)  // returns { access_token, user }
```

## Versioning

Both SDKs are at v1.0.0 and target API `/v1`. Breaking API changes will bump to `/v2`.
