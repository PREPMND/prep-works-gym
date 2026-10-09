import {hasStarted,isInProgress} from '../../utils/time.js';

export function presentSession(session,viewerState){
  const now=new Date();
  return {
    id:String(session._id),
    date:session.date,
    startHour:session.startHour,
    startsAt:session.startsAt,
    endsAt:session.endsAt,
    capacity:session.capacity,
    price:session.price||0,
    seatsTaken:session.seatsTaken,
    seatsRemaining:Math.max(session.capacity-session.seatsTaken,0),
    isFull:session.seatsTaken>=session.capacity,
    hasStarted:hasStarted(session,now),
    isInProgress:isInProgress(session,now),
    ...(viewerState?{
      viewer:{
        bookingId:viewerState.booking?String(viewerState.booking._id):null,
        checkInCode:viewerState.booking?viewerState.booking.code:null,
        attended:Boolean(viewerState.booking?.attendedAt),
        waitlistPosition:viewerState.waitlistPosition??null
      }
    }:{})
  };
}

export function presentBooking(booking,session){
  return {
    id:String(booking._id),
    status:booking.status,
    source:booking.source,
    code:booking.status==='confirmed'?booking.code:null,
    attendedAt:booking.attendedAt,
    cancelledAt:booking.cancelledAt,
    bookedAt:booking.createdAt,
    session:session?presentSession(session):null
  };
}
