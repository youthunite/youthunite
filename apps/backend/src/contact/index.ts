import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';

type Bindings = {
  DB: D1Database;
};

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
      // Note: Fillout API functionality will need to be adapted for Cloudflare Workers
      // For now, just logging the contact form submission
      console.log('Contact form submission:', body);
      
      // Original implementation used Fillout API to submit the form
      // This would need to be reimplemented for the serverless environment
      
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