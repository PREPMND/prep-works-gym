import dotenv from 'dotenv';
import {z} from 'zod';

dotenv.config();

const schema=z.object({
  PORT:z.coerce.number().int().positive().default(4000),
  NODE_ENV:z.enum(['development','test','production']).default('development'),
  MONGODB_URI:z.string().min(1,'MONGODB_URI is required'),
  JWT_SECRET:z.string().min(32,'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN:z.string().default('7d'),
  CLIENT_ORIGIN:z.string().default('http://localhost:5173'),
  SEED_ADMIN_PASSWORD:z.string().min(8).default('Admin@1234'),
  SEED_MEMBER_PASSWORD:z.string().min(8).default('Member@1234')
});

const parsed=schema.safeParse(process.env);

if(!parsed.success){
  const lines=parsed.error.issues.map(i=>`  ${i.path.join('.')}: ${i.message}`);
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
  process.exit(1);
}

export const env=parsed.data;
export const isProduction=env.NODE_ENV==='production';
