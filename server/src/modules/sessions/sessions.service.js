import {ConflictError,NotFoundError,ValidationError} from '../../errors/ApiError.js';
import {buildSessionWindow} from '../../utils/time.js';
import {presentSession} from './sessions.presenter.js';

export class SessionsService{
  constructor({sessionRepository,bookingRepository,waitlistRepository}){
    this.sessions=sessionRepository;
    this.bookings=bookingRepository;
    this.waitlist=waitlistRepository;
  }

  async create({date,startHour,capacity},adminId){
    const window=buildSessionWindow(date,startHour);
    if(!window)throw new ValidationError([{field:'body.date',message:'That date and hour do not form a real time'}]);

    if(window.startsAt.getTime()<=Date.now()){
      throw new ValidationError([{field:'body.date',message:'A session must start in the future'}]);
    }

    const clash=await this.sessions.findByStartsAt(window.startsAt);
    if(clash)throw new ConflictError('A session already starts at that time');

    const created=await this.sessions.create({
      date,
      startHour,
      capacity,
      seatsTaken:0,
      startsAt:window.startsAt,
      endsAt:window.endsAt,
      createdBy:adminId
    });

    return this.present(created);
  }

  async list({date,onlyAvailable,includePast},viewer){
    const sessions=await this.sessions.list({
      date,
      onlyAvailable,
      from:includePast?undefined:new Date()
    });

    if(!sessions.length)return [];

    const ids=sessions.map(s=>s._id);
    const [bookings,waitlistEntries]=await Promise.all([
      this.bookings.listConfirmedForMemberInSessions(viewer.id,ids),
      this.waitlist.listForMemberInSessions(viewer.id,ids)
    ]);

    const bookingBySession=new Map(bookings.map(b=>[String(b.session),b]));
    const waitlistBySession=new Map(waitlistEntries.map(w=>[String(w.session),w]));

    return Promise.all(sessions.map(async session=>{
      const key=String(session._id);
      const entry=waitlistBySession.get(key);
      const position=entry
        ?(await this.waitlist.countAhead({sessionId:session._id,joinedAt:entry.joinedAt}))+1
        :null;
      return this.present(session,{
        booking:bookingBySession.get(key)||null,
        waitlistPosition:position
      });
    }));
  }

  async getById(sessionId){
    const session=await this.sessions.findById(sessionId);
    if(!session)throw new NotFoundError('That session does not exist');
    return session;
  }

  async detail(sessionId){
    return this.present(await this.getById(sessionId));
  }

  async attendance(sessionId){
    const session=await this.getById(sessionId);
    const [bookings,waitlist]=await Promise.all([
      this.bookings.listForSession(sessionId),
      this.waitlist.listForSession(sessionId)
    ]);

    return {
      session:this.present(session),
      bookings:bookings.map(b=>({
        id:String(b._id),
        status:b.status,
        source:b.source,
        code:b.code,
        attendedAt:b.attendedAt,
        cancelledAt:b.cancelledAt,
        bookedAt:b.createdAt,
        member:b.member?{id:String(b.member._id),name:b.member.name,email:b.member.email}:null
      })),
      waitlist:waitlist.map((entry,index)=>({
        id:String(entry._id),
        position:index+1,
        joinedAt:entry.joinedAt,
        member:entry.member?{id:String(entry.member._id),name:entry.member.name,email:entry.member.email}:null
      }))
    };
  }

  present(session,viewerState){
    return presentSession(session,viewerState);
  }
}
