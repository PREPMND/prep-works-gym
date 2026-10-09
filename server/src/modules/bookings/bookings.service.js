import {ConflictError,ForbiddenError,NotFoundError} from '../../errors/ApiError.js';
import {BOOKING_STATUS} from '../../models/Booking.js';
import {ROLES} from '../../models/User.js';
import {generateCheckInCode} from '../../utils/code.js';
import {hasStarted} from '../../utils/time.js';
import {presentBooking,presentSession} from '../sessions/sessions.presenter.js';

export class BookingsService{
  constructor({sessionRepository,bookingRepository,waitlistRepository,unitOfWork}){
    this.sessions=sessionRepository;
    this.bookings=bookingRepository;
    this.waitlist=waitlistRepository;
    this.unitOfWork=unitOfWork;
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

      const booking=await this.bookings.create({
        session:session._id,
        member:head.member,
        code:await this.allocateCode(txn),
        source:'waitlist'
      },{txn});

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
