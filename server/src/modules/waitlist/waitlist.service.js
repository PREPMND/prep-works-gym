import {ConflictError,NotFoundError} from '../../errors/ApiError.js';
import {hasStarted} from '../../utils/time.js';
import {presentSession} from '../sessions/sessions.presenter.js';

export class WaitlistService{
  constructor({sessionRepository,bookingRepository,waitlistRepository,unitOfWork}){
    this.sessions=sessionRepository;
    this.bookings=bookingRepository;
    this.waitlist=waitlistRepository;
    this.unitOfWork=unitOfWork;
  }

  async join({sessionId},member){
    return this.unitOfWork(async txn=>{
      const session=await this.sessions.findById(sessionId,{txn});
      if(!session)throw new NotFoundError('That session does not exist');
      if(hasStarted(session))throw new ConflictError('That session has already started');

      const booked=await this.bookings.findConfirmed({sessionId:session._id,memberId:member.id},{txn});
      if(booked)throw new ConflictError('You already hold a booking for that session');

      if(session.seatsTaken<session.capacity){
        throw new ConflictError('That session still has seats, book it instead of joining the waitlist');
      }

      const existing=await this.waitlist.findEntry({sessionId:session._id,memberId:member.id},{txn});
      if(existing)throw new ConflictError('You are already on that waitlist');

      const entry=await this.waitlist.add({sessionId:session._id,memberId:member.id},{txn});
      const ahead=await this.waitlist.countAhead({sessionId:session._id,joinedAt:entry.joinedAt},{txn});

      return {
        entry:{id:String(entry._id),joinedAt:entry.joinedAt,position:ahead+1},
        session:presentSession(session,{booking:null,waitlistPosition:ahead+1})
      };
    });
  }

  async leave(sessionId,member){
    const removed=await this.waitlist.removeEntry({sessionId,memberId:member.id});
    if(!removed)throw new NotFoundError('You are not on that waitlist');

    const session=await this.sessions.findById(sessionId);
    return {
      sessionId:String(sessionId),
      session:session?presentSession(session,{booking:null,waitlistPosition:null}):null
    };
  }
}
