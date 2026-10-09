import {Router} from 'express';
import {validate} from '../../middleware/validate.js';
import {requireRole} from '../../middleware/requireRole.js';
import {asyncHandler} from '../../utils/asyncHandler.js';
import {ROLES} from '../../models/User.js';
import {checkInSchema} from './checkin.schema.js';

export function createCheckInRouter({checkInController,authenticate}){
  const router=Router();

  router.use(authenticate,requireRole(ROLES.admin));
  router.post('/',validate(checkInSchema),asyncHandler(checkInController.redeem));

  return router;
}
