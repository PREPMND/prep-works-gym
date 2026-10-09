import mongoose from 'mongoose';

const waitlistEntrySchema=new mongoose.Schema({
  session:{type:mongoose.Schema.Types.ObjectId,ref:'Session',required:true,index:true},
  member:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  joinedAt:{type:Date,required:true,default:()=>new Date()}
},{timestamps:true});

waitlistEntrySchema.index({session:1,member:1},{unique:true});
waitlistEntrySchema.index({session:1,joinedAt:1});

waitlistEntrySchema.set('toJSON',{
  virtuals:true,
  transform(_doc,ret){
    delete ret.__v;
    return ret;
  }
});

export const WaitlistEntry=mongoose.model('WaitlistEntry',waitlistEntrySchema);
