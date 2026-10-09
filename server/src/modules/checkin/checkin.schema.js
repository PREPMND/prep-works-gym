import {z} from 'zod';

export const checkInSchema={
  body:z.object({
    code:z.string()
      .trim()
      .transform(v=>v.toUpperCase().replace(/[^0-9A-Z]/g,''))
      .refine(v=>v.length===6,'A check-in code is 6 characters')
  }).strict()
};
