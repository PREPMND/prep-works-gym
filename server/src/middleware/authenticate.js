import {UnauthorizedError} from '../errors/ApiError.js';
import {verifyToken} from '../utils/token.js';
import {asyncHandler} from '../utils/asyncHandler.js';

export function createAuthenticate({userRepository}){
  return asyncHandler(async(req,_res,next)=>{
    const header=req.headers.authorization||'';
    const [scheme,token]=header.split(' ');
    if(scheme!=='Bearer'||!token)throw new UnauthorizedError('A bearer token is required');

    let payload;
    try{
      payload=verifyToken(token);
    }catch{
      throw new UnauthorizedError('Your session is invalid or has expired');
    }

    const user=await userRepository.findById(payload.sub);
    if(!user)throw new UnauthorizedError('Your account no longer exists');

    req.user={id:String(user._id),name:user.name,email:user.email,role:user.role};
    next();
  });
}
