export class ApiError extends Error{
  constructor(status,code,message,details){
    super(message);
    this.name='ApiError';
    this.status=status;
    this.code=code;
    this.details=details;
    this.expected=true;
  }
}

export class BadRequestError extends ApiError{
  constructor(message='Request could not be understood',details){
    super(400,'BAD_REQUEST',message,details);
  }
}

export class ValidationError extends ApiError{
  constructor(details,message='The submitted values are not valid'){
    super(422,'VALIDATION_FAILED',message,details);
  }
}

export class UnauthorizedError extends ApiError{
  constructor(message='You must be signed in to do that'){
    super(401,'UNAUTHENTICATED',message);
  }
}

export class ForbiddenError extends ApiError{
  constructor(message='You are not allowed to do that'){
    super(403,'FORBIDDEN',message);
  }
}

export class NotFoundError extends ApiError{
  constructor(message='That resource does not exist'){
    super(404,'NOT_FOUND',message);
  }
}

export class ConflictError extends ApiError{
  constructor(message='That request conflicts with the current state',details){
    super(409,'CONFLICT',message,details);
  }
}
