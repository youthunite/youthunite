import { Hono } from 'hono'
import { cors } from 'hono/cors'

import auth from './auth'
import events from './events'
import contact from './contact'
import admin from './admin'
import stories from './stories'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database;
  RESEND: string;
  RESEND_DOMAIN: string;
}
const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:4321', 'http://localhost', 'http://localhost:3000', 'http://localhost:8080', 'https://youthunite.online', 'https://youthunite.us'], 
  allowMethods: ['GET', 'POST', 'PUT', 'UPDATE', 'DELETE'],
}))

app.get('/', (c) => {
  return c.text('Hey gangstas! This is the youthunite API.')
})

app.route('/auth', auth)
app.route('/events', events)
app.route('/contact', contact)
app.route('/admin', admin)
app.route('/stories', stories)

export default app
