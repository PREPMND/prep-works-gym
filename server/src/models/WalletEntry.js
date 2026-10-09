import mongoose from 'mongoose';

export const WALLET_ENTRY_KIND={topUp:'top-up',charge:'charge',refund:'refund'};

const walletEntrySchema=new mongoose.Schema({
  member:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  kind:{type:String,enum:Object.values(WALLET_ENTRY_KIND),required:true},
  amount:{type:Number,required:true,min:1},
  balanceAfter:{type:Number,required:true,min:0},
  note:{type:String,required:true},
  session:{type:mongoose.Schema.Types.ObjectId,ref:'Session',default:null},
  booking:{type:mongoose.Schema.Types.ObjectId,ref:'Booking',default:null}
},{timestamps:true});

walletEntrySchema.index({member:1,createdAt:-1});

walletEntrySchema.set('toJSON',{
  virtuals:true,
  transform(_doc,ret){
    delete ret.__v;
    return ret;
  }
});

export const WalletEntry=mongoose.model('WalletEntry',walletEntrySchema);
