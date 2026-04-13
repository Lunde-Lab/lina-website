# lina-pdf-counter

Cloudflare Worker that counts PDF downloads for the Lina one-pager, broken down by language.

## Endpoints

### `POST /count?lang=xx`

Increments the download counter for the given language.

- `lang` must be one of: `en`, `no`, `sv`, `da`, `fi`, `de`, `nl`, `fr`
- Returns `204 No Content` on success
- CORS: only allows requests from `https://getlina.app`

### `GET /count?token=SECRET`

Returns all download counts as JSON.

- `token` must match the `STATS_TOKEN` secret
- Returns `401` if token is missing or incorrect
- Returns `{ "en": 12, "no": 45, "sv": 3, ... }`
- CORS: only allows requests from `https://lunde-lab.me`

## Setup

### 1. Create KV namespace

```bash
wrangler kv namespace create PDF_COUNTERS
```

Copy the returned `id` and replace `PLACEHOLDER_KV_ID` in `wrangler.toml`.

### 2. Set the stats token secret

```bash
wrangler secret put STATS_TOKEN
```

Enter a strong random string when prompted.

### 3. Install dependencies

```bash
npm install
```

### 4. Deploy

```bash
npm run deploy
```

## Local development

```bash
npm run dev
```

Note: KV bindings work in local dev via wrangler's local simulation.
