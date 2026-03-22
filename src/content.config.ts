import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    excerpt: z.string(),
    year: z.string(),
    location: z.string(),
    category: z.string(),
    coverImage: z.string().url(),
    gallery: z.array(z.string().url()),
    featured: z.boolean().default(false),
    order: z.number().int().nonnegative(),
  }),
});

export const collections = { projects };
