import {ConflictError,NotFoundError,ValidationError} from '../../errors/ApiError.js';
import {MAX_OTP_ATTEMPTS,TOP_UP_STATUS} from '../../models/TopUp.js';
import {WALLET_ENTRY_KIND} from '../../models/WalletEntry.js';
import {generateOtp,generateReference,hashOtp,otpMatches,OTP_TTL_MS} from '../../utils/otp.js';
import {isProduction} from '../../config/env.js';

export class WalletService{
  constructor({userRepository,walletRepository,topUpRepository,unitOfWork}){
    this.users=userRepository;
    this.wallet=walletRepository;
    this.topUps=topUpRepository;
    this.unitOfWork=unitOfWork;
  }

  async summary(memberId){
    const [member,entries]=await Promise.all([
      this.users.findById(memberId),
      this.wallet.listEntries(memberId)
    ]);
    if(!member)throw new NotFoundError('That account does not exist');

    return {
      balance:member.walletBalance,
      entries:entries.map(entry=>({
        id:String(entry._id),
        kind:entry.kind,
        amount:entry.amount,
        balanceAfter:entry.balanceAfter,
        note:entry.note,
        at:entry.createdAt,
        session:entry.session?{
          id:String(entry.session._id),
          date:entry.session.date,
          startHour:entry.session.startHour
        }:null
      }))
    };
  }

  async startTopUp({amount},member){
    const otp=generateOtp();
    const reference=generateReference();

    const topUp=await this.topUps.create({
      member:member.id,
      amount,
      reference,
      otpHash:hashOtp(otp,reference),
      expiresAt:new Date(Date.now()+OTP_TTL_MS)
    });

    if(!isProduction)console.log(`Wallet top-up ${reference} for ${member.email}: one-time code ${otp}`);

    return {
      topUp:{
        id:String(topUp._id),
        reference:topUp.reference,
        amount:topUp.amount,
        expiresAt:topUp.expiresAt,
        attemptsLeft:MAX_OTP_ATTEMPTS
      },
      demoOtp:isProduction?undefined:otp
    };
  }

  async confirmTopUp(topUpId,{otp},member){
    const topUp=await this.topUps.findOwnedById(topUpId,member.id);
    if(!topUp)throw new NotFoundError('That top-up does not exist');

    if(topUp.status===TOP_UP_STATUS.confirmed)throw new ConflictError('That top-up has already been paid in');
    if(topUp.status===TOP_UP_STATUS.abandoned)throw new ConflictError('That top-up was abandoned, start another');

    if(topUp.expiresAt.getTime()<=Date.now()){
      await this.topUps.abandon(topUp._id);
      throw new ConflictError('That code has expired, start another top-up');
    }

    if(!otpMatches(otp,topUp.reference,topUp.otpHash)){
      const counted=await this.topUps.countAttempt(topUp._id);
      const left=Math.max(MAX_OTP_ATTEMPTS-counted.attempts,0);
      if(!left){
        await this.topUps.abandon(topUp._id);
        throw new ConflictError('Too many wrong codes, that top-up is cancelled');
      }
      throw new ValidationError(
        [{field:'body.otp',message:`That code is wrong, ${left} ${left===1?'try':'tries'} left`}],
        'That code is wrong'
      );
    }

    return this.unitOfWork(async txn=>{
      const confirmed=await this.topUps.confirm(topUp._id,{txn});
      if(!confirmed)throw new ConflictError('That top-up has already been paid in');

      const updated=await this.wallet.credit(member.id,topUp.amount,{txn});
      await this.wallet.record({
        memberId:member.id,
        kind:WALLET_ENTRY_KIND.topUp,
        amount:topUp.amount,
        balanceAfter:updated.walletBalance,
        note:`Top-up ${topUp.reference}`
      },{txn});

      return {balance:updated.walletBalance,topUp:{id:String(confirmed._id),reference:confirmed.reference,amount:confirmed.amount}};
    });
  }
}
