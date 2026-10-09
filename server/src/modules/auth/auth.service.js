import {ConflictError,UnauthorizedError} from '../../errors/ApiError.js';
import {hashPassword,verifyPassword} from '../../utils/password.js';
import {signToken} from '../../utils/token.js';
import {ROLES} from '../../models/User.js';

export class AuthService{
  constructor({userRepository}){
    this.users=userRepository;
  }

  async register({name,email,password}){
    const existing=await this.users.findByEmail(email);
    if(existing)throw new ConflictError('An account already uses that email address');

    const passwordHash=await hashPassword(password);
    const user=await this.users.create({name,email,passwordHash,role:ROLES.member});

    return {user:user.toJSON(),token:signToken(user)};
  }

  async login({email,password}){
    const user=await this.users.findByEmail(email);
    if(!user)throw new UnauthorizedError('That email and password do not match an account');

    const matches=await verifyPassword(password,user.passwordHash);
    if(!matches)throw new UnauthorizedError('That email and password do not match an account');

    return {user:user.toJSON(),token:signToken(user)};
  }

  async profile(userId){
    const user=await this.users.findById(userId);
    if(!user)throw new UnauthorizedError('Your account no longer exists');
    return user.toJSON();
  }
}
