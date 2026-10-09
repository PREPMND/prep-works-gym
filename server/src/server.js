import {env} from './config/env.js';
import {createApp} from './app.js';
import {connectDatabase,disconnectDatabase} from './db/connect.js';

async function start(){
  await connectDatabase();
  const app=createApp();
  const server=app.listen(env.PORT,()=>{
    console.log(`API listening on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown=async signal=>{
    console.log(`${signal} received, closing down`);
    server.close(async()=>{
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT',()=>shutdown('SIGINT'));
  process.on('SIGTERM',()=>shutdown('SIGTERM'));
}

start().catch(error=>{
  console.error('Failed to start the API',error);
  process.exit(1);
});
