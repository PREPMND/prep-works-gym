import mongoose from 'mongoose';

export const TOP_UP_STATUS={pending:'pending',confirmed:'confirmed',abandoned:'abandoned'};
export const MAX_OTP_ATTEMPTS=3;

const topUpSchema=new mongoose.Schema({
  member:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  amount:{type:Number,required:true,min:1},
  reference:{type:String,required:true,unique:true},
  otpHash:{type:String,required:true},
  status:{type:String,enum:Object.values(TOP_UP_STATUS),default:TOP_UP_STATUS.pending,required:true},
  attempts:{type:Number,required:true,default:0,min:0},
  expiresAt:{type:Date,required:true},
  confirmedAt:{type:Date,default:null}
},{timestamps:true});

topUpSchema.index({member:1,status:1});

topUpSchema.set('toJSON',{
  virtuals:true,
  transform(_doc,ret){
    delete ret.otpHash;
    delete ret.__v;
    return ret;
  }
});

export const TopUp=mongoose.model('TopUp',topUpSchema);
