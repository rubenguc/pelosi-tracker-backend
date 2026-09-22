import { Hono } from 'hono'
import { setDb, getDb } from './db'
import {  listPoliticiansHandler } from './features/politician/handlers'

// Cloudflare Worker bindings
interface Env {
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

// Initialize Drizzle on first request
app.use('*', async (c, next) => {
  if (!getDb()) {
    setDb(c.env.DB)
  }
  await next()
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})



/**
 * Get all politicians (for testing/verification)
 */
app.get('/politicians', listPoliticiansHandler)

export default app
