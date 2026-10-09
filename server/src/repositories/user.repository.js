import mongoose from 'mongoose';

export class UserRepository{
  constructor({userModel}){
    this.model=userModel;
  }

  async findById(id){
    if(!mongoose.isValidObjectId(id))return null;
    return this.model.findById(id);
  }

  async findByEmail(email){
    return this.model.findOne({email:String(email).toLowerCase()});
  }

  async create(data,{txn=null}={}){
    const [created]=await this.model.create([data],{session:txn});
    return created;
  }

  async findManyByIds(ids){
    return this.model.find({_id:{$in:ids}});
  }
}
