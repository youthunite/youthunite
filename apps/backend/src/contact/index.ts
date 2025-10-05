import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import { sendEmail, createContactFormEmail, createContactConfirmationEmail } from '../email';

type Bindings = {
  DB: D1Database;
  RESEND: string;
  RESEND_DOMAIN: string;
  FILLOUT: string;
};

const FORM_ID = '4S8bFyDi76us';

const contact = new Hono<{ Bindings: Bindings }>();

contact.post(
  '/',
  zValidator('json', z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    question: z.string()
  })),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const metadataResponse = await fetch(`https://api.fillout.com/v1/api/forms/${FORM_ID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.FILLOUT}`,
          'Content-Type': 'application/json'
        }
      });

      if (!metadataResponse.ok) {
        throw new Error(`Failed to get form metadata: ${metadataResponse.status}`);
      }

      const metadata = await metadataResponse.json();
      const questions = metadata.questions;

      const metaFirstName = questions.find((q: any) => q.name === 'First Name');
      const metaLastName = questions.find((q: any) => q.name === 'Last Name');
      const metaEmail = questions.find((q: any) => q.name === 'Email');
      const metaMessage = questions.find((q: any) => q.name === 'Question');

      if (!metaFirstName || !metaLastName || !metaEmail || !metaMessage) {
        throw new Error('Required form fields not found');
      }

      const submissionResponse = await fetch(`https://api.fillout.com/v1/api/forms/${FORM_ID}/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FILLOUT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submissions: [{
            questions: [
              { id: metaFirstName.id, value: body.firstName },
              { id: metaLastName.id, value: body.lastName },
              { id: metaEmail.id, value: body.email },
              { id: metaMessage.id, value: body.question }
            ]
          }]
        })
      });

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text();
        throw new Error(`Failed to submit form: ${submissionResponse.status} - ${errorText}`);
      }

      const submissionResult = await submissionResponse.json();
      console.log('Form submitted successfully:', submissionResult);

      try {
        await sendEmail(
          { RESEND: c.env.RESEND, RESEND_DOMAIN: c.env.RESEND_DOMAIN },
          {
            to: 'admin@youthunite.online',
            subject: `New Contact Form Submission from ${body.firstName} ${body.lastName}`,
            html: createContactFormEmail(body.firstName, body.lastName, body.email, body.question),
          }
        );

        await sendEmail(
          { RESEND: c.env.RESEND, RESEND_DOMAIN: c.env.RESEND_DOMAIN },
          {
            to: body.email,
            subject: 'We Received Your Message - YouthUnite',
            html: createContactConfirmationEmail(body.firstName),
          }
        );
      } catch (emailError) {
        console.error('Failed to send contact form emails:', emailError);
      }

      return c.json({
        success: true,
        message: 'Contact form submitted successfully!'
      });
    } catch (e) {
      console.error('Contact form error:', e);
      return c.json({
        success: false,
        error: 'Failed to submit contact form'
      });
    }
  }
);

export default contact;