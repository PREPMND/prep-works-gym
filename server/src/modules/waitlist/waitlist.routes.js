import {Router} from 'express';
import {validate} from '../../middleware/validate.js';
import {requireRole} from '../../middleware/requireRole.js';
import {asyncHandler} from '../../utils/asyncHandler.js';
import {ROLES} from '../../models/User.js';
import {joinWaitlistSchema,leaveWaitlistSchema} from './waitlist.schema.js';

export function createWaitlistRouter({waitlistController,authenticate}){
  const router=Router();

  router.use(authenticate,requireRole(ROLES.member));

  router.post('/',validate(joinWaitlistSchema),asyncHandler(waitlistController.join));
  router.delete('/:sessionId',validate(leaveWaitlistSchema),asyncHandler(waitlistController.leave));

  return router;
}
