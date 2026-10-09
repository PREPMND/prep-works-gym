import {WALLET_ENTRY_KIND} from '../models/WalletEntry.js';

export class WalletRepository{
  constructor({userModel,walletEntryModel}){
    this.users=userModel;
    this.entries=walletEntryModel;
  }

  async debit(memberId,amount,{txn=null}={}){
    return this.users.findOneAndUpdate(
      {_id:memberId,walletBalance:{$gte:amount}},
      {$inc:{walletBalance:-amount}},
      {new:true,session:txn}
    );
  }

  async credit(memberId,amount,{txn=null}={}){
    return this.users.findOneAndUpdate(
      {_id:memberId},
      {$inc:{walletBalance:amount}},
      {new:true,session:txn}
    );
  }

  async record({memberId,kind,amount,balanceAfter,note,sessionId=null,bookingId=null},{txn=null}={}){
    const [entry]=await this.entries.create([{
      member:memberId,
      kind,
      amount,
      balanceAfter,
      note,
      session:sessionId,
      booking:bookingId
    }],{session:txn});
    return entry;
  }

  async charge({memberId,amount,note,sessionId,bookingId},{txn=null}={}){
    const member=await this.debit(memberId,amount,{txn});
    if(!member)return null;
    await this.record({
      memberId,
      kind:WALLET_ENTRY_KIND.charge,
      amount,
      balanceAfter:member.walletBalance,
      note,
      sessionId,
      bookingId
    },{txn});
    return member;
  }

  async refund({memberId,amount,note,sessionId,bookingId},{txn=null}={}){
    const member=await this.credit(memberId,amount,{txn});
    await this.record({
      memberId,
      kind:WALLET_ENTRY_KIND.refund,
      amount,
      balanceAfter:member.walletBalance,
      note,
      sessionId,
      bookingId
    },{txn});
    return member;
  }

  async listEntries(memberId,limit=25){
    return this.entries.find({member:memberId})
      .sort({createdAt:-1})
      .limit(limit)
      .populate('session','date startHour');
  }
}
