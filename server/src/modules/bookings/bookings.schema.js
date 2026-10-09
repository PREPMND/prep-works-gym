import {z} from 'zod';
import {objectId} from '../../utils/zod.js';

export const createBookingSchema={
  body:z.object({sessionId:objectId}).strict()
};

export const bookingIdSchema={
  params:z.object({bookingId:objectId})
};
