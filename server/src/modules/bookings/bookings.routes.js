import {Router} from 'express';
import {validate} from '../../middleware/validate.js';
import {requireRole} from '../../middleware/requireRole.js';
import {asyncHandler} from '../../utils/asyncHandler.js';
import {ROLES} from '../../models/User.js';
import {bookingIdSchema,createBookingSchema} from './bookings.schema.js';

export function createBookingsRouter({bookingsController,authenticate}){
  const router=Router();

  router.use(authenticate);

  router.get('/me',asyncHandler(bookingsController.mine));

  router.post(
    '/',
    requireRole(ROLES.member),
    validate(createBookingSchema),
    asyncHandler(bookingsController.create)
  );

  router.delete(
    '/:bookingId',
    validate(bookingIdSchema),
    asyncHandler(bookingsController.cancel)
  );

  return router;
}
