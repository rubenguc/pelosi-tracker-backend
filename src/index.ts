import { Hono } from 'hono'
import { politicianHandlers } from './features/politician/handlers'

const app = new Hono<{ Bindings: Env }>()


app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/politician', politicianHandlers)


export default app
