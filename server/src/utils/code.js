import {randomInt} from 'node:crypto';

const ALPHABET='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH=6;

export function generateCheckInCode(){
  let code='';
  for(let i=0;i<LENGTH;i+=1)code+=ALPHABET[randomInt(0,ALPHABET.length)];
  return code;
}

export function normaliseCheckInCode(value){
  return String(value).trim().toUpperCase().replace(/[^0-9A-Z]/g,'');
}
