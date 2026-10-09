import {useCallback,useEffect,useState} from 'react';
import {api} from '../api/endpoints.js';
import {useResource} from '../hooks/useResource.js';
import {Field} from '../components/Field.jsx';
import {Notice} from '../components/Notice.jsx';
import {SeatMeter} from '../components/SeatMeter.jsx';
import {EmptyState,ErrorState,LoadingState} from '../components/ResourceState.jsx';
import {formatDay,formatHour,formatSlot,formatStamp,todayIso} from '../utils/format.js';

const POLL_MS=10000;
const HOURS=Array.from({length:24},(_unused,hour)=>hour);

function validateSession({date,startHour}){
  const errors={};
  if(!date)errors.date='Pick a date';
  if(startHour==='')errors.startHour='Pick a start hour';
  return errors;
}

export function FrontDesk(){
  const [draft,setDraft]=useState({date:todayIso(),startHour:'7',capacity:'20',price:'0'});
  const [draftErrors,setDraftErrors]=useState({});
  const [creating,setCreating]=useState(false);
  const [createFeedback,setCreateFeedback]=useState(null);

  const [code,setCode]=useState('');
  const [codeError,setCodeError]=useState(null);
  const [redeeming,setRedeeming]=useState(false);
  const [checkIn,setCheckIn]=useState(null);

  const [selectedId,setSelectedId]=useState('');

  const listLoader=useCallback(signal=>api.listSessions({includePast:'true'},signal),[]);
  const list=useResource(listLoader,{pollMs:POLL_MS});

  const detailLoader=useCallback(
    signal=>(selectedId?api.sessionBookings(selectedId,signal):Promise.resolve(null)),
    [selectedId]
  );
  const detail=useResource(detailLoader,{deps:[selectedId],pollMs:selectedId?POLL_MS:0});

  const sessions=list.data?.sessions||[];

  useEffect(()=>{
    if(selectedId||!sessions.length)return;
    const running=sessions.find(session=>session.isInProgress);
    setSelectedId((running||sessions[0]).id);
  },[sessions,selectedId]);

  const onToday=draft.date===todayIso();
  const hourNow=new Date().getUTCHours();

  const takenKey=sessions
    .filter(session=>session.date===draft.date)
    .map(session=>session.startHour)
    .sort((a,b)=>a-b)
    .join(',');

  const hourState=useCallback(hour=>{
    const taken=takenKey?takenKey.split(',').map(Number):[];
    if(taken.includes(hour))return 'taken';
    if(onToday&&hour<=hourNow)return 'past';
    return 'open';
  },[takenKey,onToday,hourNow]);

  const firstOpenHour=HOURS.find(hour=>hourState(hour)==='open');

  useEffect(()=>{
    if(firstOpenHour===undefined)return;
    if(hourState(Number(draft.startHour))!=='open'){
      setDraft(previous=>({...previous,startHour:String(firstOpenHour)}));
    }
  },[draft.startHour,firstOpenHour,hourState]);

  const createSession=async event=>{
    event.preventDefault();
    const found=validateSession(draft);
    setDraftErrors(found);
    if(Object.keys(found).length)return;

    setCreating(true);
    setCreateFeedback(null);
    try{
      const result=await api.createSession({
        date:draft.date,
        startHour:Number(draft.startHour),
        capacity:Number(draft.capacity),
        price:Math.round(Number(draft.price||0)*100)
      });
      setCreateFeedback({
        tone:'success',
        title:'Session added',
        body:`${formatDay(result.session.date)} at ${formatHour(result.session.startHour)} for ${result.session.capacity} people.`
      });
      setSelectedId(result.session.id);
      await list.reload();
    }catch(caught){
      setCreateFeedback({tone:'error',title:'Could not add that session',body:caught.message,details:caught.details});
      setDraftErrors(caught.fieldErrors||{});
    }finally{
      setCreating(false);
    }
  };

  const redeem=async event=>{
    event.preventDefault();
    const cleaned=code.trim().toUpperCase();
    if(cleaned.length!==6){
      setCodeError('A check-in code is 6 characters');
      return;
    }

    setCodeError(null);
    setRedeeming(true);
    setCheckIn(null);
    try{
      const result=await api.checkIn(cleaned);
      setCheckIn({tone:'success',result});
      setCode('');
      await Promise.all([detail.reload(),list.reload()]);
    }catch(caught){
      setCheckIn({tone:'error',message:caught.message});
    }finally{
      setRedeeming(false);
    }
  };

  const selected=detail.data?.session;
  const attendance=detail.data?.bookings||[];
  const queue=detail.data?.waitlist||[];
  const confirmed=attendance.filter(booking=>booking.status==='confirmed');
  const attended=confirmed.filter(booking=>booking.attendedAt).length;

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">Front desk</p>
        <h1>Run the floor.</h1>
        <p className="prose">
          Add sessions to the timetable, take codes at the door, and see exactly who is in the
          room for any hour.
        </p>
      </div>

      <div className="split">
        <section className="panel" aria-labelledby="create-heading">
          <div className="panel__head">
            <h2 id="create-heading" className="eyebrow">Add a session</h2>
          </div>

          {createFeedback?(
            <Notice tone={createFeedback.tone} title={createFeedback.title} details={createFeedback.details}>
              {createFeedback.body}
            </Notice>
          ):null}

          <form className="form" onSubmit={createSession} noValidate>
            <Field
              label="Date"
              type="date"
              value={draft.date}
              min={todayIso()}
              onChange={value=>setDraft(previous=>({...previous,date:value}))}
              error={draftErrors.date}
              disabled={creating}
            />

            <div className="field">
              <label className="field__label" htmlFor="start-hour">Start hour (UTC)</label>
              <select
                id="start-hour"
                className="input"
                value={draft.startHour}
                onChange={event=>setDraft(previous=>({...previous,startHour:event.target.value}))}
                aria-invalid={draftErrors.startHour?'true':'false'}
                aria-describedby={draftErrors.startHour?'start-hour-error':undefined}
                disabled={creating}
              >
                {HOURS.map(hour=>{
                  const state=hourState(hour);
                  return (
                    <option key={hour} value={String(hour)} disabled={state!=='open'}>
                      {formatHour(hour)}
                      {state==='taken'?' — already scheduled':''}
                      {state==='past'?' — gone':''}
                    </option>
                  );
                })}
              </select>
              <span className="field__hint">
                {firstOpenHour===undefined
                  ?'Every hour on this date is taken. Pick another day.'
                  :'Sessions run for exactly one hour. Hours already on the timetable cannot be reused.'}
              </span>
              {draftErrors.startHour?(
                <span className="field__error" id="start-hour-error">{draftErrors.startHour}</span>
              ):null}
            </div>

            <Field
              label="Capacity"
              type="number"
              min="1"
              max="200"
              value={draft.capacity}
              hint="The gym runs twenty to an hour."
              onChange={value=>setDraft(previous=>({...previous,capacity:value}))}
              error={draftErrors.capacity}
              disabled={creating}
            />

            <Field
              label="Price"
              type="number"
              min="0"
              step="1"
              value={draft.price}
              hint="In rupees. Leave at 0 to keep the hour free."
              onChange={value=>setDraft(previous=>({...previous,price:value}))}
              error={draftErrors.price}
              disabled={creating}
            />

            <button type="submit" className="btn" disabled={creating}>
              {creating?'Adding':'Add to timetable'}
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="checkin-heading">
          <div className="panel__head">
            <h2 id="checkin-heading" className="eyebrow">Check somebody in</h2>
          </div>

          <form className="form" onSubmit={redeem} noValidate>
            <Field
              label="Check-in code"
              value={code}
              onChange={value=>{setCode(value);setCodeError(null);}}
              hint="Six characters, taken from the member's app."
              error={codeError}
              autoComplete="off"
              spellCheck="false"
              maxLength={8}
              disabled={redeeming}
            />
            <button type="submit" className="btn" disabled={redeeming||!code.trim()}>
              {redeeming?'Checking':'Mark present'}
            </button>
          </form>

          {checkIn?.tone==='error'?(
            <Notice tone="error" title="Code rejected">{checkIn.message}</Notice>
          ):null}

          {checkIn?.tone==='success'?(
            <Notice tone="success" title={`${checkIn.result.member.name} is in`}>
              {checkIn.result.member.email} &mdash; {formatSlot(checkIn.result.session)} on{' '}
              {formatDay(checkIn.result.session.date)}, marked at {formatStamp(checkIn.result.attendedAt)}.
            </Notice>
          ):null}

          <p className="prose">
            A code only works during its own hour, once, and never after the booking is
            cancelled.
          </p>
        </section>
      </div>

      <section className="panel" aria-labelledby="attendance-heading">
        <div className="panel__head">
          <h2 id="attendance-heading" className="eyebrow">Session register</h2>

          <div className="toolbar">
            <div className="field">
              <label className="field__label" htmlFor="session-picker">Session</label>
              <select
                id="session-picker"
                className="input"
                value={selectedId}
                onChange={event=>setSelectedId(event.target.value)}
                disabled={list.loading||!sessions.length}
              >
                {sessions.map(session=>(
                  <option key={session.id} value={session.id}>
                    {formatDay(session.date)} &middot; {formatSlot(session)} &middot; {session.seatsRemaining} free
                  </option>
                ))}
              </select>
            </div>
            {selected?<SeatMeter seatsRemaining={selected.seatsRemaining} capacity={selected.capacity} />:null}
          </div>
        </div>

        {list.loading?<LoadingState label="Loading sessions" />:null}
        {!list.loading&&list.error?<ErrorState error={list.error} onRetry={list.retry} busy={list.refreshing} />:null}
        {!list.loading&&!list.error&&!sessions.length?(
          <EmptyState title="No sessions yet">Add one with the form above and it appears here.</EmptyState>
        ):null}

        {sessions.length&&detail.loading?<LoadingState label="Loading the register" />:null}
        {sessions.length&&!detail.loading&&detail.error?(
          <ErrorState error={detail.error} onRetry={detail.retry} busy={detail.refreshing} />
        ):null}

        {selected&&!detail.loading&&!detail.error?(
          <>
            <p className="prose" style={{marginBottom:'var(--gap-3)'}}>
              {attended} of {confirmed.length} booked members have been checked in.
              {queue.length?` ${queue.length} waiting.`:''}
            </p>

            {attendance.length?(
              <table className="ledger">
                <caption>Every booking taken for this hour, cancellations included.</caption>
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Code</th>
                    <th scope="col">Booked via</th>
                    <th scope="col">Status</th>
                    <th scope="col">Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(booking=>(
                    <tr key={booking.id} data-dim={booking.status==='cancelled'?'true':'false'}>
                      <td>
                        <strong>{booking.member?.name||'Removed member'}</strong>
                        <br />
                        <span className="slot__note">{booking.member?.email}</span>
                      </td>
                      <td>
                        {booking.status==='confirmed'
                          ?<span className="mono">{booking.code}</span>
                          :<span className="slot__note">&mdash;</span>}
                      </td>
                      <td className="slot__note">{booking.source==='waitlist'?'Waitlist':'Direct'}</td>
                      <td>
                        {booking.status==='cancelled'
                          ?<span className="badge badge--gone">Cancelled</span>
                          :booking.attendedAt
                            ?<span className="badge badge--held">Present</span>
                            :<span className="badge badge--queued">Expected</span>}
                      </td>
                      <td className="numeric">{formatStamp(booking.attendedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ):(
              <EmptyState title="Nobody has booked this hour yet" />
            )}

            {queue.length?(
              <table className="ledger" style={{marginTop:'var(--gap-4)'}}>
                <caption>Waitlist, in the order people joined.</caption>
                <thead>
                  <tr>
                    <th scope="col">Position</th>
                    <th scope="col">Member</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(entry=>(
                    <tr key={entry.id}>
                      <td className="numeric">#{entry.position}</td>
                      <td>
                        <strong>{entry.member?.name||'Removed member'}</strong>
                        <br />
                        <span className="slot__note">{entry.member?.email}</span>
                      </td>
                      <td className="numeric">{formatStamp(entry.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ):null}
          </>
        ):null}
      </section>
    </>
  );
}
