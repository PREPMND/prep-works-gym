import {Router} from 'express';
import {validate} from '../../middleware/validate.js';
import {asyncHandler} from '../../utils/asyncHandler.js';
import {loginSchema,registerSchema} from './auth.schema.js';

export function createAuthRouter({authController,authenticate}){
  const router=Router();

  router.post('/register',validate(registerSchema),asyncHandler(authController.register));
  router.post('/login',validate(loginSchema),asyncHandler(authController.login));
  router.get('/me',authenticate,asyncHandler(authController.me));

  return router;
}
