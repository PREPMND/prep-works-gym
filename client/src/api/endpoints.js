import {request} from './client.js';

export const api={
  register:body=>request('/auth/register',{method:'POST',body}),
  login:body=>request('/auth/login',{method:'POST',body}),
  me:signal=>request('/auth/me',{signal}),

  listSessions:(query,signal)=>request('/sessions',{query,signal}),
  createSession:body=>request('/sessions',{method:'POST',body}),
  sessionBookings:(sessionId,signal)=>request(`/sessions/${sessionId}/bookings`,{signal}),

  myBookings:signal=>request('/bookings/me',{signal}),
  book:sessionId=>request('/bookings',{method:'POST',body:{sessionId}}),
  cancel:bookingId=>request(`/bookings/${bookingId}`,{method:'DELETE'}),

  joinWaitlist:sessionId=>request('/waitlist',{method:'POST',body:{sessionId}}),
  leaveWaitlist:sessionId=>request(`/waitlist/${sessionId}`,{method:'DELETE'}),

  checkIn:code=>request('/check-ins',{method:'POST',body:{code}})
};
