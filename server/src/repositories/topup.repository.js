import mongoose from 'mongoose';
import {TOP_UP_STATUS} from '../models/TopUp.js';

export class TopUpRepository{
  constructor({topUpModel}){
    this.model=topUpModel;
  }

  async create(data,{txn=null}={}){
    const [created]=await this.model.create([data],{session:txn});
    return created;
  }

  async findOwnedById(id,memberId,{txn=null}={}){
    if(!mongoose.isValidObjectId(id))return null;
    return this.model.findOne({_id:id,member:memberId}).session(txn);
  }

  async countAttempt(id,{txn=null}={}){
    return this.model.findOneAndUpdate(
      {_id:id},
      {$inc:{attempts:1}},
      {new:true,session:txn}
    );
  }

  async confirm(id,{txn=null}={}){
    return this.model.findOneAndUpdate(
      {_id:id,status:TOP_UP_STATUS.pending},
      {$set:{status:TOP_UP_STATUS.confirmed,confirmedAt:new Date()}},
      {new:true,session:txn}
    );
  }

  async abandon(id,{txn=null}={}){
    return this.model.findOneAndUpdate(
      {_id:id,status:TOP_UP_STATUS.pending},
      {$set:{status:TOP_UP_STATUS.abandoned}},
      {new:true,session:txn}
    );
  }
}
