import { Hono } from 'hono'
import { cors } from 'hono/cors'

import auth from './auth'
import events from './events'
import contact from './contact'
import admin from './admin'

const app = new Hono()

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

export default app
