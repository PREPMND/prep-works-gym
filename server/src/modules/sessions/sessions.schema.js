import {z} from 'zod';
import {SESSION_CAPACITY} from '../../models/Session.js';
import {booleanFlag,isoDate,objectId} from '../../utils/zod.js';

export const createSessionSchema={
  body:z.object({
    date:isoDate,
    startHour:z.coerce.number().int().min(0,'Hour must be between 0 and 23').max(23,'Hour must be between 0 and 23'),
    capacity:z.coerce.number().int().min(1).max(200).default(SESSION_CAPACITY)
  }).strict()
};

export const listSessionsSchema={
  query:z.object({
    date:isoDate.optional(),
    onlyAvailable:booleanFlag.optional(),
    includePast:booleanFlag.optional()
  }).strict()
};

export const sessionIdSchema={
  params:z.object({sessionId:objectId})
};
