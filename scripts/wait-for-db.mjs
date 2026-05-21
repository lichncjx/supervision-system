import pg from 'pg'

const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS || 60000)
const intervalMs = Number(process.env.DB_WAIT_INTERVAL_MS || 1000)
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL is required before waiting for database readiness.')
  process.exit(1)
}

const startedAt = Date.now()
const parsed = new URL(databaseUrl)
const host = parsed.hostname
const port = Number(parsed.port || 5432)

async function canQuery() {
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: intervalMs,
  })

  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await client.end().catch(() => undefined)
  }
}

while (Date.now() - startedAt < timeoutMs) {
  if (await canQuery()) {
    console.log(`Database is reachable at ${host}:${port}`)
    process.exit(0)
  }

  await new Promise((resolve) => setTimeout(resolve, intervalMs))
}

console.error(`Timed out waiting for database at ${host}:${port}`)
process.exit(1)
