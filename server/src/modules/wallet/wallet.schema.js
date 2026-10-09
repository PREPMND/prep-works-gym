import {z} from 'zod';
import {objectId} from '../../utils/zod.js';
import {OTP_LENGTH} from '../../utils/otp.js';

export const startTopUpSchema={
  body:z.object({
    amount:z.coerce.number().int('Enter a whole number of rupees').min(100,'The smallest top-up is ₹1').max(5000000,'The largest top-up is ₹50,000')
  }).strict()
};

export const confirmTopUpSchema={
  params:z.object({topUpId:objectId}),
  body:z.object({
    otp:z.string()
      .trim()
      .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`),`The code is ${OTP_LENGTH} digits`)
  }).strict()
};
