import mongoose from 'mongoose';

export class WaitlistRepository{
  constructor({waitlistModel}){
    this.model=waitlistModel;
  }

  async add({sessionId,memberId},{txn=null}={}){
    const [created]=await this.model.create([{session:sessionId,member:memberId}],{session:txn});
    return created;
  }

  async findEntry({sessionId,memberId},{txn=null}={}){
    if(!mongoose.isValidObjectId(sessionId))return null;
    return this.model.findOne({session:sessionId,member:memberId}).session(txn);
  }

  async takeHead(sessionId,{txn=null}={}){
    return this.model.findOneAndDelete(
      {session:sessionId},
      {sort:{joinedAt:1},session:txn}
    );
  }

  async removeEntry({sessionId,memberId},{txn=null}={}){
    return this.model.findOneAndDelete({session:sessionId,member:memberId},{session:txn});
  }

  async listForMemberInSessions(memberId,sessionIds){
    return this.model.find({member:memberId,session:{$in:sessionIds}});
  }

  async listForSession(sessionId){
    return this.model.find({session:sessionId})
      .sort({joinedAt:1})
      .populate('member','name email');
  }

  async listForMember(memberId){
    return this.model.find({member:memberId})
      .sort({joinedAt:1})
      .populate('session');
  }

  async countAhead({sessionId,joinedAt},{txn=null}={}){
    return this.model.countDocuments({session:sessionId,joinedAt:{$lt:joinedAt}}).session(txn);
  }
}
