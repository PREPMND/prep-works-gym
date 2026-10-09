import express from 'express';
import cors from 'cors';
import {env} from './config/env.js';
import {buildContainer} from './container.js';
import {notFound} from './middleware/notFound.js';
import {errorHandler} from './middleware/errorHandler.js';

export function createApp(){
  const {routers}=buildContainer();
  const app=express();

  app.disable('x-powered-by');
  app.use(cors({origin:env.CLIENT_ORIGIN.split(',').map(o=>o.trim())}));
  app.use(express.json({limit:'32kb'}));

  app.get('/api/health',(_req,res)=>{
    res.status(200).json({status:'ok',uptime:Math.round(process.uptime())});
  });

  app.use('/api/auth',routers.auth);
  app.use('/api/sessions',routers.sessions);
  app.use('/api/bookings',routers.bookings);
  app.use('/api/waitlist',routers.waitlist);
  app.use('/api/check-ins',routers.checkIns);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
