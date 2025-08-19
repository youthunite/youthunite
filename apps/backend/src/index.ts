import { Elysia } from "elysia";
import { cors } from '@elysiajs/cors';
import { ip } from "elysia-ip";

import AuthRouter from "./auth/auth";
import EventsRouter from "./events/events";
import ContactRouter from "./contact/contact";
import { Resend } from "resend";
import { Fillout } from "@fillout/api";

export const resend = new Resend(process.env.RESEND!);
export const fillout = new Fillout(process.env.FILLOUT!);
const app = new Elysia()
  .use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4321', 'http://localhost', 'http://localhost:3000', 'http://localhost:8080'], 
    methods: ['GET', 'POST', 'PUT', 'UPDATE', 'DELETE'], // Allowed methods
  }))
  .use(ip())
  .get("/", () => "Hey gangstas! This is the youthunite API. :3")
  .group('/auth', (app) =>
    app.use(AuthRouter)
  )
  .group('/events', (app) =>
    app.use(EventsRouter)
  )
  .group('/contact', (app) =>
    app.use(ContactRouter)
  )
  .listen(3000);

console.log(
  `YouthUnite Server running at ${app.server?.hostname}:${app.server?.port} :3`
);
