import mongoose from 'mongoose';
import {env} from '../config/env.js';

let transactionsSupported=true;
let fallbackWarned=false;

export async function connectDatabase(){
  mongoose.set('strictQuery',true);
  await mongoose.connect(env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
  const admin=mongoose.connection.db.admin();
  try{
    const info=await admin.command({hello:1});
    transactionsSupported=Boolean(info.setName)||info.msg==='isdbgrid';
  }catch{
    transactionsSupported=false;
  }
  if(!transactionsSupported)console.warn('Connected to a standalone mongod: multi-document transactions are unavailable, waitlist promotion will run without one');
  return mongoose.connection;
}

export async function disconnectDatabase(){
  await mongoose.disconnect();
}

export function supportsTransactions(){
  return transactionsSupported;
}

export async function withTransaction(work){
  if(!transactionsSupported){
    if(!fallbackWarned){
      console.warn('Running a multi-step write without a transaction');
      fallbackWarned=true;
    }
    return work(null);
  }
  const session=await mongoose.startSession();
  try{
    let result;
    await session.withTransaction(async()=>{
      result=await work(session);
    });
    return result;
  }finally{
    await session.endSession();
  }
}
