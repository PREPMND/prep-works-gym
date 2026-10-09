import {z} from 'zod';

const email=z.string().trim().toLowerCase().email('Enter a valid email address');
const password=z.string().min(8,'Password must be at least 8 characters').max(128);

export const registerSchema={
  body:z.object({
    name:z.string().trim().min(2,'Name must be at least 2 characters').max(80),
    email,
    password
  }).strict()
};

export const loginSchema={
  body:z.object({email,password:z.string().min(1,'Password is required')}).strict()
};
