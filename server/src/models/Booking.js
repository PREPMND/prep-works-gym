import mongoose from 'mongoose';

export const BOOKING_STATUS={confirmed:'confirmed',cancelled:'cancelled'};

const bookingSchema=new mongoose.Schema({
  session:{type:mongoose.Schema.Types.ObjectId,ref:'Session',required:true,index:true},
  member:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  status:{type:String,enum:Object.values(BOOKING_STATUS),default:BOOKING_STATUS.confirmed,required:true},
  code:{type:String,required:true},
  source:{type:String,enum:['direct','waitlist'],default:'direct'},
  attendedAt:{type:Date,default:null},
  cancelledAt:{type:Date,default:null}
},{timestamps:true});

bookingSchema.index(
  {session:1,member:1},
  {unique:true,partialFilterExpression:{status:BOOKING_STATUS.confirmed}}
);

bookingSchema.index(
  {code:1},
  {unique:true,partialFilterExpression:{status:BOOKING_STATUS.confirmed}}
);

bookingSchema.index({member:1,createdAt:-1});

bookingSchema.set('toJSON',{
  virtuals:true,
  transform(_doc,ret){
    delete ret.__v;
    return ret;
  }
});

export const Booking=mongoose.model('Booking',bookingSchema);
