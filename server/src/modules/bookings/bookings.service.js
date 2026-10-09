import {ConflictError,ForbiddenError,NotFoundError,PaymentRequiredError} from '../../errors/ApiError.js';
import {BOOKING_STATUS} from '../../models/Booking.js';
import {ROLES} from '../../models/User.js';
import {WALLET_ENTRY_KIND} from '../../models/WalletEntry.js';
import {generateCheckInCode} from '../../utils/code.js';
import {hasStarted} from '../../utils/time.js';
import {presentBooking,presentSession} from '../sessions/sessions.presenter.js';

export class BookingsService{
  constructor({sessionRepository,bookingRepository,waitlistRepository,walletRepository,unitOfWork}){
    this.sessions=sessionRepository;
    this.bookings=bookingRepository;
    this.waitlist=waitlistRepository;
    this.wallet=walletRepository;
    this.unitOfWork=unitOfWork;
  }

  describe(session){
    return `${session.date} at ${String(session.startHour).padStart(2,'0')}:00`;
  }

  async create({sessionId},member){
    return this.unitOfWork(async txn=>{
      const session=await this.sessions.findById(sessionId,{txn});
      if(!session)throw new NotFoundError('That session does not exist');
      if(hasStarted(session))throw new ConflictError('That session has already started');

      const existing=await this.bookings.findConfirmed({sessionId:session._id,memberId:member.id},{txn});
      if(existing)throw new ConflictError('You already hold a booking for that session');

      const reserved=await this.sessions.reserveSeat(session._id,{txn});
      if(!reserved)throw new ConflictError('That session is full, join the waitlist instead');

      try{
        await this.waitlist.removeEntry({sessionId:session._id,memberId:member.id},{txn});
        const booking=await this.bookings.create({
          session:session._id,
          member:member.id,
          code:await this.allocateCode(txn),
          source:'direct'
        },{txn});

        if(session.price>0){
          const paid=await this.wallet.charge({
            memberId:member.id,
            amount:session.price,
            note:`Session on ${this.describe(session)}`,
            sessionId:session._id,
            bookingId:booking._id
          },{txn});
          if(!paid)throw new PaymentRequiredError('Your wallet does not hold enough for that session. Top it up and try again.');
        }

        return {
          booking:presentBooking(booking,reserved),
          session:presentSession(reserved,{booking,waitlistPosition:null})
        };
      }catch(error){
        if(!txn)await this.sessions.releaseSeat(session._id);
        throw error;
      }
    });
  }

  async cancel(bookingId,actor){
    return this.unitOfWork(async txn=>{
      const booking=await this.bookings.findById(bookingId,{txn});
      if(!booking)throw new NotFoundError('That booking does not exist');

      const ownsIt=String(booking.member)===actor.id;
      if(!ownsIt&&actor.role!==ROLES.admin)throw new ForbiddenError('You can only cancel your own bookings');
      if(booking.status!==BOOKING_STATUS.confirmed)throw new ConflictError('That booking is already cancelled');

      const session=await this.sessions.findById(booking.session,{txn});
      if(!session)throw new NotFoundError('That session does not exist');
      if(hasStarted(session))throw new ConflictError('A booking cannot be cancelled once the session has started');

      await this.bookings.cancel(booking._id,{txn});

      if(session.price>0){
        await this.wallet.refund({
          memberId:booking.member,
          amount:session.price,
          note:`Refund for ${this.describe(session)}`,
          sessionId:session._id,
          bookingId:booking._id
        },{txn});
      }

      const promoted=await this.promoteNext(session,{txn});
      if(!promoted)await this.sessions.releaseSeat(session._id,{txn});

      const fresh=await this.sessions.findById(session._id,{txn});
      return {bookingId:String(booking._id),promoted,session:presentSession(fresh)};
    });
  }

  async promoteNext(session,{txn=null}={}){
    if(hasStarted(session))return null;

    for(;;){
      const head=await this.waitlist.takeHead(session._id,{txn});
      if(!head)return null;

      const already=await this.bookings.findConfirmed({sessionId:session._id,memberId:head.member},{txn});
      if(already)continue;

      let balanceAfter=null;
      if(session.price>0){
        const payer=await this.wallet.debit(head.member,session.price,{txn});
        if(!payer)continue;
        balanceAfter=payer.walletBalance;
      }

      const booking=await this.bookings.create({
        session:session._id,
        member:head.member,
        code:await this.allocateCode(txn),
        source:'waitlist'
      },{txn});

      if(session.price>0){
        await this.wallet.record({
          memberId:head.member,
          kind:WALLET_ENTRY_KIND.charge,
          amount:session.price,
          balanceAfter,
          note:`Session on ${this.describe(session)}, taken from the waitlist`,
          sessionId:session._id,
          bookingId:booking._id
        },{txn});
      }

      return {bookingId:String(booking._id),memberId:String(head.member)};
    }
  }

  async listForMember(memberId){
    const [bookings,waitlist]=await Promise.all([
      this.bookings.listForMember(memberId),
      this.waitlist.listForMember(memberId)
    ]);

    const waitlistItems=await Promise.all(waitlist
      .filter(entry=>entry.session)
      .map(async entry=>({
        id:String(entry._id),
        joinedAt:entry.joinedAt,
        position:(await this.waitlist.countAhead({sessionId:entry.session._id,joinedAt:entry.joinedAt}))+1,
        session:presentSession(entry.session)
      })));

    return {
      bookings:bookings.map(booking=>presentBooking(booking,booking.session)),
      waitlist:waitlistItems
    };
  }

  async allocateCode(txn){
    for(let attempt=0;attempt<5;attempt+=1){
      const code=generateCheckInCode();
      if(!await this.bookings.codeExists(code,{txn}))return code;
    }
    throw new ConflictError('Could not allocate a check-in code, please try again');
  }
}
