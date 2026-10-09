const dayFormatter=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
const stampFormatter=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});

export function todayIso(){
  return new Date().toISOString().slice(0,10);
}

export function formatHour(hour){
  return `${String(hour).padStart(2,'0')}:00`;
}

export function formatSlot(session){
  return `${formatHour(session.startHour)}–${formatHour((session.startHour+1)%24)}`;
}

export function formatDay(isoDate){
  const parsed=new Date(`${isoDate}T00:00:00.000Z`);
  if(Number.isNaN(parsed.getTime()))return isoDate;

  const today=todayIso();
  if(isoDate===today)return 'Today';

  const tomorrow=new Date(Date.now()+24*60*60*1000).toISOString().slice(0,10);
  if(isoDate===tomorrow)return 'Tomorrow';

  return dayFormatter.format(parsed);
}

export function formatStamp(value){
  if(!value)return '—';
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?'—':stampFormatter.format(parsed);
}

export function pluralise(count,singular,plural){
  return count===1?singular:plural||`${singular}s`;
}
