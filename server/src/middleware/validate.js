import {ValidationError} from '../errors/ApiError.js';

const PARTS=['body','params','query'];

export function validate(schemas){
  return (req,_res,next)=>{
    const details=[];
    for(const part of PARTS){
      const schema=schemas[part];
      if(!schema)continue;
      const result=schema.safeParse(req[part]);
      if(result.success){
        req[part]=result.data;
        continue;
      }
      for(const issue of result.error.issues){
        details.push({field:[part,...issue.path].join('.'),message:issue.message});
      }
    }
    if(details.length)return next(new ValidationError(details));
    return next();
  };
}
