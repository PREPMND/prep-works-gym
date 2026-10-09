import {createHash,randomInt,timingSafeEqual} from 'node:crypto';

export const OTP_LENGTH=6;
export const OTP_TTL_MS=5*60*1000;

export function generateOtp(){
  return String(randomInt(0,10**OTP_LENGTH)).padStart(OTP_LENGTH,'0');
}

export function hashOtp(otp,reference){
  return createHash('sha256').update(`${reference}:${otp}`).digest('hex');
}

export function otpMatches(otp,reference,storedHash){
  const candidate=Buffer.from(hashOtp(otp,reference));
  const stored=Buffer.from(storedHash);
  return candidate.length===stored.length&&timingSafeEqual(candidate,stored);
}

export function generateReference(){
  const alphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let body='';
  for(let i=0;i<8;i+=1)body+=alphabet[randomInt(0,alphabet.length)];
  return `TOP-${body}`;
}
