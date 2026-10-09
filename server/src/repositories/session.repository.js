import mongoose from 'mongoose';

export class SessionRepository{
  constructor({sessionModel}){
    this.model=sessionModel;
  }

  async create(data,{txn=null}={}){
    const [created]=await this.model.create([data],{session:txn});
    return created;
  }

  async findById(id,{txn=null}={}){
    if(!mongoose.isValidObjectId(id))return null;
    return this.model.findById(id).session(txn);
  }

  async findByStartsAt(startsAt){
    return this.model.findOne({startsAt});
  }

  async list({date,onlyAvailable,from}={}){
    const filter={};
    if(date)filter.date=date;
    if(from)filter.startsAt={$gte:from};
    if(onlyAvailable)filter.$expr={$lt:['$seatsTaken','$capacity']};
    return this.model.find(filter).sort({startsAt:1});
  }

  async reserveSeat(id,{now=new Date(),txn=null}={}){
    return this.model.findOneAndUpdate(
      {_id:id,startsAt:{$gt:now},$expr:{$lt:['$seatsTaken','$capacity']}},
      {$inc:{seatsTaken:1}},
      {new:true,session:txn}
    );
  }

  async releaseSeat(id,{txn=null}={}){
    return this.model.findOneAndUpdate(
      {_id:id,seatsTaken:{$gt:0}},
      {$inc:{seatsTaken:-1}},
      {new:true,session:txn}
    );
  }
}
