import {z} from 'zod';
import {objectId} from '../../utils/zod.js';

export const joinWaitlistSchema={
  body:z.object({sessionId:objectId}).strict()
};

export const leaveWaitlistSchema={
  params:z.object({sessionId:objectId})
};
