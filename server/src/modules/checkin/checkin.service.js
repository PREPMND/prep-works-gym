import {ConflictError,NotFoundError} from '../../errors/ApiError.js';
import {isInProgress} from '../../utils/time.js';
import {presentSession} from '../sessions/sessions.presenter.js';

export class CheckInService{
  constructor({bookingRepository}){
    this.bookings=bookingRepository;
  }

  async redeem({code}){
    const booking=await this.bookings.findConfirmedByCode(code);
    if(!booking)throw new NotFoundError('No active booking matches that code');

    const session=booking.session;
    if(!session)throw new NotFoundError('That booking is not attached to a session');

    if(!isInProgress(session)){
      throw new ConflictError('That code only works during the hour of its own session');
    }

    if(booking.attendedAt){
      throw new ConflictError('That code has already been used to check in');
    }

    const marked=await this.bookings.markAttended(booking._id);
    if(!marked)throw new ConflictError('That code has already been used to check in');

    return {
      attendedAt:marked.attendedAt,
      booking:{id:String(marked._id),source:booking.source,code:booking.code},
      member:{id:String(booking.member._id),name:booking.member.name,email:booking.member.email},
      session:presentSession(session)
    };
  }
}
