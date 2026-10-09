import mongoose from 'mongoose';
import {BOOKING_STATUS} from '../models/Booking.js';

export class BookingRepository{
  constructor({bookingModel}){
    this.model=bookingModel;
  }

  async create(data,{txn=null}={}){
    const [created]=await this.model.create([data],{session:txn});
    return created;
  }

  async findById(id,{txn=null}={}){
    if(!mongoose.isValidObjectId(id))return null;
    return this.model.findById(id).session(txn);
  }

  async findConfirmed({sessionId,memberId},{txn=null}={}){
    return this.model.findOne({
      session:sessionId,
      member:memberId,
      status:BOOKING_STATUS.confirmed
    }).session(txn);
  }

  async listForMember(memberId){
    return this.model.find({member:memberId})
      .sort({createdAt:-1})
      .populate('session');
  }

  async listConfirmedForMemberInSessions(memberId,sessionIds){
    return this.model.find({
      member:memberId,
      session:{$in:sessionIds},
      status:BOOKING_STATUS.confirmed
    });
  }

  async listForSession(sessionId){
    return this.model.find({session:sessionId})
      .sort({createdAt:1})
      .populate('member','name email');
  }

  async countConfirmed(sessionId,{txn=null}={}){
    return this.model.countDocuments({
      session:sessionId,
      status:BOOKING_STATUS.confirmed
    }).session(txn);
  }

  async cancel(id,{txn=null}={}){
    return this.model.findOneAndUpdate(
      {_id:id,status:BOOKING_STATUS.confirmed},
      {$set:{status:BOOKING_STATUS.cancelled,cancelledAt:new Date()}},
      {new:true,session:txn}
    );
  }

  async codeExists(code,{txn=null}={}){
    const found=await this.model.exists({code,status:BOOKING_STATUS.confirmed}).session(txn);
    return Boolean(found);
  }

  async findConfirmedByCode(code,{txn=null}={}){
    return this.model.findOne({code,status:BOOKING_STATUS.confirmed})
      .session(txn)
      .populate('member','name email')
      .populate('session');
  }

  async markAttended(id,{txn=null}={}){
    return this.model.findOneAndUpdate(
      {_id:id,status:BOOKING_STATUS.confirmed,attendedAt:null},
      {$set:{attendedAt:new Date()}},
      {new:true,session:txn}
    );
  }
}
