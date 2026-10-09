import {ForbiddenError,UnauthorizedError} from '../errors/ApiError.js';

export function requireRole(...roles){
  return (req,_res,next)=>{
    if(!req.user)return next(new UnauthorizedError());
    if(!roles.includes(req.user.role))return next(new ForbiddenError(`This route is limited to: ${roles.join(', ')}`));
    return next();
  };
}
