import { defineCollection, z } from 'astro:content';

const coursesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    instructor: z.string(),
    duration: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    category: z.string(),
    tags: z.array(z.string()),
    published: z.boolean().default(true),
    featured: z.boolean().default(false),
    order: z.number().optional(),
    image: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
  }),
});

const sectionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    order: z.number(),
    duration: z.string(),
    description: z.string(),
    published: z.boolean().default(true),
  }),
});

export const collections = {
  courses: coursesCollection,
  sections: sectionsCollection,
};