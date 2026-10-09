import {Router} from 'express';
import {validate} from '../../middleware/validate.js';
import {requireRole} from '../../middleware/requireRole.js';
import {asyncHandler} from '../../utils/asyncHandler.js';
import {ROLES} from '../../models/User.js';
import {createSessionSchema,listSessionsSchema,sessionIdSchema} from './sessions.schema.js';

export function createSessionsRouter({sessionsController,authenticate}){
  const router=Router();

  router.use(authenticate);

  router.get('/',validate(listSessionsSchema),asyncHandler(sessionsController.list));
  router.get('/:sessionId',validate(sessionIdSchema),asyncHandler(sessionsController.detail));

  router.post(
    '/',
    requireRole(ROLES.admin),
    validate(createSessionSchema),
    asyncHandler(sessionsController.create)
  );

  router.get(
    '/:sessionId/bookings',
    requireRole(ROLES.admin),
    validate(sessionIdSchema),
    asyncHandler(sessionsController.attendance)
  );

  return router;
}
