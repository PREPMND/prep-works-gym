import {useCallback,useState} from 'react';
import {api} from '../api/endpoints.js';
import {useAuth} from '../auth/AuthContext.jsx';
import {useResource} from '../hooks/useResource.js';
import {Notice} from '../components/Notice.jsx';
import {SeatDots} from '../components/SeatDots.jsx';
import {EmptyState,ErrorState,LoadingState} from '../components/ResourceState.jsx';
import {formatDay,formatSlot,pluralise} from '../utils/format.js';
import {formatMoney} from '../utils/money.js';

const POLL_MS=10000;

function patchSessions(current,sessionId,change){
  if(!current)return current;
  return {
    ...current,
    sessions:current.sessions.map(session=>(
      session.id===sessionId?{...session,...change(session)}:session
    ))
  };
}

export function Sessions(){
  const {isAdmin}=useAuth();
  const [date,setDate]=useState('');
  const [onlyAvailable,setOnlyAvailable]=useState(false);
  const [pending,setPending]=useState({});
  const [feedback,setFeedback]=useState(null);

  const loader=useCallback(
    signal=>api.listSessions({date:date||undefined,onlyAvailable:onlyAvailable?'true':undefined},signal),
    [date,onlyAvailable]
  );

  const {data,setData,error,staleError,loading,refreshing,reload,retry}=useResource(loader,{
    deps:[date,onlyAvailable],
    pollMs:POLL_MS
  });

  const runAction=async(session,kind)=>{
    const snapshot=data;
    setPending(previous=>({...previous,[session.id]:kind}));
    setFeedback(null);

    if(kind==='book'){
      setData(current=>patchSessions(current,session.id,item=>({
        seatsTaken:item.seatsTaken+1,
        seatsRemaining:Math.max(item.seatsRemaining-1,0),
        isFull:item.seatsRemaining-1<=0,
        viewer:{...item.viewer,bookingId:'pending',waitlistPosition:null}
      })));
    }

    if(kind==='cancel'){
      setData(current=>patchSessions(current,session.id,item=>({
        seatsTaken:Math.max(item.seatsTaken-1,0),
        seatsRemaining:item.seatsRemaining+1,
        isFull:false,
        viewer:{...item.viewer,bookingId:null,checkInCode:null}
      })));
    }

    try{
      if(kind==='book'){
        const result=await api.book(session.id);
        setFeedback({tone:'success',title:'Seat held',body:`Your code for ${formatSlot(session)} is ${result.booking.code}.`});
      }
      if(kind==='cancel'){
        const result=await api.cancel(session.viewer.bookingId);
        setFeedback(result.promoted
          ?{tone:'success',title:'Booking cancelled',body:'Your seat went straight to the first person on the waitlist.'}
          :{tone:'success',title:'Booking cancelled',body:'The seat is back in the pool.'});
      }
      if(kind==='waitlist'){
        const result=await api.joinWaitlist(session.id);
        setFeedback({tone:'success',title:'On the waitlist',body:`You are number ${result.entry.position} in the queue.`});
      }
      if(kind==='leave'){
        await api.leaveWaitlist(session.id);
        setFeedback({tone:'success',title:'Left the waitlist',body:'You will not be moved into that session.'});
      }
      await reload();
    }catch(caught){
      setData(snapshot);
      setFeedback({tone:'error',title:'That did not work',body:caught.message});
    }finally{
      setPending(previous=>{
        const next={...previous};
        delete next[session.id];
        return next;
      });
    }
  };

  const sessions=data?.sessions||[];

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">Timetable</p>
        <h1>One hour. Twenty people. First come, first served.</h1>
        <div className="pagehead__meta">
          <p className="prose">
            Seat counts refresh on their own every {POLL_MS/1000} seconds, so what you see is
            what is actually left.
          </p>
          <span className="livedot"><i aria-hidden="true" />{refreshing?'Updating':'Live'}</span>
        </div>
      </div>

      {feedback?(
        <Notice tone={feedback.tone} title={feedback.title}>{feedback.body}</Notice>
      ):null}

      {staleError?(
        <Notice tone="error" title="Live updates paused">
          {staleError.message} The figures below may be out of date.
        </Notice>
      ):null}

      <section className="panel" aria-labelledby="timetable-heading">
        <div className="panel__head">
          <h2 id="timetable-heading" className="eyebrow">Upcoming sessions</h2>

          <div className="toolbar">
            <div className="field">
              <label className="field__label" htmlFor="filter-date">Filter by date</label>
              <input
                id="filter-date"
                className="input"
                type="date"
                value={date}
                onChange={event=>setDate(event.target.value)}
              />
            </div>

            <div className="checkfield">
              <input
                id="filter-available"
                type="checkbox"
                checked={onlyAvailable}
                onChange={event=>setOnlyAvailable(event.target.checked)}
              />
              <label htmlFor="filter-available">Only sessions with seats</label>
            </div>

            {date?(
              <button type="button" className="linkbutton" onClick={()=>setDate('')}>Clear date</button>
            ):null}
          </div>
        </div>

        {loading?<LoadingState label="Loading the timetable" />:null}

        {!loading&&error?<ErrorState error={error} onRetry={retry} busy={refreshing} />:null}

        {!loading&&!error&&!sessions.length?(
          <EmptyState title="Nothing on the board">
            {date
              ?'No sessions were scheduled for that date. Try clearing the filter.'
              :'The gym has not published any upcoming sessions yet.'}
          </EmptyState>
        ):null}

        {!loading&&!error&&sessions.length?(
          <ul className="sessions">
            {sessions.map(session=>{
              const busy=Boolean(pending[session.id]);
              const held=Boolean(session.viewer?.bookingId);
              const queued=Boolean(session.viewer?.waitlistPosition);

              return (
                <li key={session.id} className="sessions__row" data-dim={session.hasStarted?'true':'false'}>
                  <div>
                    <p className="slot__hour">{formatSlot(session)}</p>
                    <p className="slot__day">{formatDay(session.date)}</p>
                    <p className="price" data-free={session.price?'false':'true'}>
                      {session.price?formatMoney(session.price):'Free'}
                    </p>
                  </div>

                  <div>
                    <p className="slot__title">
                      {session.isInProgress
                        ?'Running now'
                        :session.hasStarted
                          ?'Session finished'
                          :`${session.seatsRemaining} ${pluralise(session.seatsRemaining,'seat')} left`}
                    </p>
                    <p className="slot__note">
                      {held?'You are booked in.':null}
                      {queued?`You are number ${session.viewer.waitlistPosition} on the waitlist.`:null}
                      {!held&&!queued&&session.isFull?'Full, but you can queue for a cancellation.':null}
                      {!held&&!queued&&!session.isFull&&!session.hasStarted?'Open for booking.':null}
                    </p>
                  </div>

                  <SeatDots seatsRemaining={session.seatsRemaining} capacity={session.capacity} mine={held} />

                  <div className="sessions__action inline">
                    {held?<span className="badge badge--held">Held</span>:null}
                    {queued?<span className="badge badge--queued">Queued</span>:null}
                    {!held&&!queued&&session.isFull?<span className="badge badge--full">Full</span>:null}

                    {isAdmin?(
                      <span className="badge badge--gone">Staff view</span>
                    ):session.hasStarted?(
                      <span className="badge badge--gone">{session.isInProgress?'In progress':'Closed'}</span>
                    ):held?(
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>runAction(session,'cancel')}>
                        {busy?'Cancelling':'Cancel'}
                      </button>
                    ):queued?(
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>runAction(session,'leave')}>
                        {busy?'Leaving':'Leave queue'}
                      </button>
                    ):session.isFull?(
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>runAction(session,'waitlist')}>
                        {busy?'Joining':'Join waitlist'}
                      </button>
                    ):(
                      <button type="button" className="btn" disabled={busy} onClick={()=>runAction(session,'book')}>
                        {busy?'Booking':'Book'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ):null}
      </section>
    </>
  );
}
