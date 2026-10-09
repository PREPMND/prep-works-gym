import mongoose from 'mongoose';
import {ApiError} from '../errors/ApiError.js';
import {isProduction} from '../config/env.js';

function translate(error){
  if(error instanceof ApiError)return error;

  if(error instanceof mongoose.Error.ValidationError){
    const details=Object.values(error.errors).map(e=>({field:e.path,message:e.message}));
    return new ApiError(422,'VALIDATION_FAILED','The submitted values are not valid',details);
  }

  if(error instanceof mongoose.Error.CastError){
    return new ApiError(400,'BAD_REQUEST',`${error.path} is not a valid identifier`);
  }

  if(error?.code===11000){
    const field=Object.keys(error.keyPattern||{}).join(', ')||'record';
    return new ApiError(409,'CONFLICT',`That ${field} is already taken`);
  }

  if(error?.type==='entity.parse.failed'){
    return new ApiError(400,'BAD_REQUEST','The request body is not valid JSON');
  }

  return null;
}

export function errorHandler(error,req,res,_next){
  const known=translate(error);

  if(!known){
    console.error('Unhandled error',{method:req.method,path:req.originalUrl,message:error?.message,stack:error?.stack});
    return res.status(500).json({
      error:{code:'INTERNAL_ERROR',message:'Something went wrong on our side'}
    });
  }

  if(!isProduction&&known.status>=500)console.error(error);

  return res.status(known.status).json({
    error:{
      code:known.code,
      message:known.message,
      ...(known.details?{details:known.details}:{})
    }
  });
}
