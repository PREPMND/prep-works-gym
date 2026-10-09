import {env} from '../config/env.js';
import {connectDatabase,disconnectDatabase} from './connect.js';
import {User,ROLES} from '../models/User.js';
import {Session,SESSION_CAPACITY} from '../models/Session.js';
import {Booking,BOOKING_STATUS} from '../models/Booking.js';
import {WaitlistEntry} from '../models/WaitlistEntry.js';
import {WalletEntry,WALLET_ENTRY_KIND} from '../models/WalletEntry.js';
import {TopUp} from '../models/TopUp.js';
import {hashPassword} from '../utils/password.js';
import {generateCheckInCode} from '../utils/code.js';
import {buildSessionWindow} from '../utils/time.js';

const usedCodes=new Set();

function uniqueCode(){
  for(;;){
    const code=generateCheckInCode();
    if(!usedCodes.has(code)){
      usedCodes.add(code);
      return code;
    }
  }
}

function dayOffset(days){
  const now=new Date();
  const base=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  return new Date(base+days*24*60*60*1000).toISOString().slice(0,10);
}

function currentUtcHour(){
  return new Date().getUTCHours();
}

async function resetCollections(){
  await Promise.all([
    Booking.deleteMany({}),
    WalletEntry.deleteMany({}),
    TopUp.deleteMany({}),
    WaitlistEntry.deleteMany({}),
    Session.deleteMany({}),
    User.deleteMany({})
  ]);
  await Promise.all([
    User.syncIndexes(),
    Session.syncIndexes(),
    Booking.syncIndexes(),
    WaitlistEntry.syncIndexes(),
    WalletEntry.syncIndexes(),
    TopUp.syncIndexes()
  ]);
}

async function createUsers(){
  const adminHash=await hashPassword(env.SEED_ADMIN_PASSWORD);
  const memberHash=await hashPassword(env.SEED_MEMBER_PASSWORD);

  const admin=await User.create({
    name:'Rhea Kapoor',
    email:'admin@gym.test',
    passwordHash:adminHash,
    role:ROLES.admin
  });

  const named=await User.insertMany([
    {name:'Maya Iyer',email:'maya@gym.test',passwordHash:memberHash,role:ROLES.member,walletBalance:120000},
    {name:'Dev Sharma',email:'dev@gym.test',passwordHash:memberHash,role:ROLES.member,walletBalance:15000}
  ]);

  const fillers=await User.insertMany(
    Array.from({length:22},(_unused,index)=>({
      name:`Member ${String(index+1).padStart(2,'0')}`,
      email:`member${String(index+1).padStart(2,'0')}@gym.test`,
      passwordHash:memberHash,
      role:ROLES.member,
      walletBalance:50000
    }))
  );

  return {admin,maya:named[0],dev:named[1],fillers};
}

async function createSession({date,startHour,adminId,capacity=SESSION_CAPACITY,price=0}){
  const window=buildSessionWindow(date,startHour);
  return Session.create({
    date,
    startHour,
    capacity,
    price,
    seatsTaken:0,
    startsAt:window.startsAt,
    endsAt:window.endsAt,
    createdBy:adminId
  });
}

async function book(session,members,source='direct'){
  if(!members.length)return;
  await Booking.insertMany(members.map(member=>({
    session:session._id,
    member:member._id,
    status:BOOKING_STATUS.confirmed,
    code:uniqueCode(),
    source
  })));
  await Session.updateOne({_id:session._id},{$inc:{seatsTaken:members.length}});
}

async function run(){
  await connectDatabase();
  await resetCollections();

  const {admin,maya,dev,fillers}=await createUsers();

  const inProgress=await createSession({date:dayOffset(0),startHour:currentUtcHour(),adminId:admin._id});
  const full=await createSession({date:dayOffset(1),startHour:7,adminId:admin._id});
  const evening=await createSession({date:dayOffset(1),startHour:18,adminId:admin._id});
  const quiet=await createSession({date:dayOffset(2),startHour:7,adminId:admin._id});
  const busy=await createSession({date:dayOffset(2),startHour:19,adminId:admin._id});
  const later=await createSession({date:dayOffset(3),startHour:8,adminId:admin._id,price:25000});

  await book(inProgress,[maya]);
  await book(full,fillers.slice(0,SESSION_CAPACITY));
  await book(evening,[dev]);
  await book(busy,fillers.slice(0,12));

  await WaitlistEntry.insertMany([
    {session:full._id,member:dev._id,joinedAt:new Date(Date.now()-60*60*1000)},
    {session:full._id,member:fillers[20]._id,joinedAt:new Date(Date.now()-30*60*1000)}
  ]);

  const mayaBooking=await Booking.findOne({session:inProgress._id,member:maya._id});

  console.log('Seed complete');
  console.log('');
  console.log(`  admin   admin@gym.test / ${env.SEED_ADMIN_PASSWORD}`);
  console.log(`  member  maya@gym.test  / ${env.SEED_MEMBER_PASSWORD}`);
  console.log(`  member  dev@gym.test   / ${env.SEED_MEMBER_PASSWORD}`);
  console.log('');
  console.log(`  sessions created: 6 across ${dayOffset(0)} to ${dayOffset(3)}`);
  console.log(`  full session: ${full.date} ${String(full.startHour).padStart(2,'0')}:00 with 2 on the waitlist`);
  console.log(`  running now: ${inProgress.date} ${String(inProgress.startHour).padStart(2,'0')}:00, redeem code ${mayaBooking.code} as the admin`);
  console.log(`  paid demo: ${later.date} ${String(later.startHour).padStart(2,'0')}:00 costs ₹250 — maya holds ₹1,200 and can book it, dev holds ₹150 and gets a 402`);
  console.log(`  untouched: ${quiet.date} ${String(quiet.startHour).padStart(2,'0')}:00`);

  await disconnectDatabase();
}

run().catch(async error=>{
  console.error('Seed failed',error);
  await disconnectDatabase();
  process.exit(1);
});
