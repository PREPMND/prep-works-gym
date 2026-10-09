import mongoose from 'mongoose';
import {z} from 'zod';

export const objectId=z.string().refine(v=>mongoose.isValidObjectId(v),'Not a valid identifier');

export const booleanFlag=z.enum(['true','false']).transform(v=>v==='true');

export const isoDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Use the format YYYY-MM-DD');
