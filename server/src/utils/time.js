export function buildSessionWindow(date,startHour){
  const startsAt=new Date(`${date}T${String(startHour).padStart(2,'0')}:00:00.000Z`);
  if(Number.isNaN(startsAt.getTime()))return null;
  const endsAt=new Date(startsAt.getTime()+60*60*1000);
  return {startsAt,endsAt};
}

export function hasStarted(session,now=new Date()){
  return session.startsAt.getTime()<=now.getTime();
}

export function isInProgress(session,now=new Date()){
  const time=now.getTime();
  return session.startsAt.getTime()<=time&&time<session.endsAt.getTime();
}
