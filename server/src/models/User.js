import mongoose from 'mongoose';

export const ROLES={member:'member',admin:'admin'};

const userSchema=new mongoose.Schema({
  name:{type:String,required:true,trim:true,minlength:2,maxlength:80},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  passwordHash:{type:String,required:true},
  role:{type:String,enum:Object.values(ROLES),default:ROLES.member,required:true},
  walletBalance:{type:Number,required:true,default:0,min:0}
},{timestamps:true});

userSchema.set('toJSON',{
  virtuals:true,
  transform(_doc,ret){
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export const User=mongoose.model('User',userSchema);
