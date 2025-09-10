import { Elysia } from "elysia";
import { cors } from '@elysiajs/cors';
import { ip } from "elysia-ip";

import AuthRouter from "./auth/auth";
import EventsRouter from "./events/events";
import ContactRouter from "./contact/contact";
import AdminRouter from './admin/admin';
import { Resend } from "resend";
import { Fillout } from "@fillout/api";

export const resend = new Resend(process.env.RESEND!);
export const fillout = new Fillout(process.env.FILLOUT!);
const app = new Elysia()
  .use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4321', 'http://localhost', 'http://localhost:3000', 'http://localhost:8080', 'https://youthunite.online', 'https://youthunite.us'], 
    methods: ['GET', 'POST', 'PUT', 'UPDATE', 'DELETE'],
  }))
  .use(ip())
  // eternally sorry for removing :3!!
  .get("/", () => "Hey gangstas! This is the youthunite API.")
  .group('/auth', (app) =>
    app.use(AuthRouter)
  )
  .group('/events', (app) =>
    app.use(EventsRouter)
  )
  .group('/contact', (app) =>
    app.use(ContactRouter)
  )
  .group('/admin', (app) =>
    app.use(AdminRouter)
  )
  .listen(3000);

console.log(
  `YouthUnite Server running at ${app.server?.hostname}:${app.server?.port} :3`
);
