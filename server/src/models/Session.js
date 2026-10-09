import mongoose from 'mongoose';

export const SESSION_CAPACITY=20;

const sessionSchema=new mongoose.Schema({
  date:{type:String,required:true,match:/^\d{4}-\d{2}-\d{2}$/},
  startHour:{type:Number,required:true,min:0,max:23},
  startsAt:{type:Date,required:true,unique:true},
  endsAt:{type:Date,required:true},
  capacity:{type:Number,required:true,default:SESSION_CAPACITY,min:1},
  seatsTaken:{type:Number,required:true,default:0,min:0},
  price:{type:Number,required:true,default:0,min:0},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}
},{timestamps:true});

sessionSchema.index({date:1,startHour:1});

sessionSchema.virtual('seatsRemaining').get(function(){
  return Math.max(this.capacity-this.seatsTaken,0);
});

sessionSchema.virtual('isFull').get(function(){
  return this.seatsTaken>=this.capacity;
});

sessionSchema.set('toJSON',{
  virtuals:true,
  transform(_doc,ret){
    delete ret.__v;
    return ret;
  }
});

export const Session=mongoose.model('Session',sessionSchema);
