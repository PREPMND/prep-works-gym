import {Router} from 'express';
import {validate} from '../../middleware/validate.js';
import {requireRole} from '../../middleware/requireRole.js';
import {asyncHandler} from '../../utils/asyncHandler.js';
import {ROLES} from '../../models/User.js';
import {confirmTopUpSchema,startTopUpSchema} from './wallet.schema.js';

export function createWalletRouter({walletController,authenticate}){
  const router=Router();

  router.use(authenticate,requireRole(ROLES.member));

  router.get('/',asyncHandler(walletController.summary));
  router.post('/top-ups',validate(startTopUpSchema),asyncHandler(walletController.startTopUp));
  router.post('/top-ups/:topUpId/confirm',validate(confirmTopUpSchema),asyncHandler(walletController.confirmTopUp));

  return router;
}
