import {useCallback,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../api/endpoints.js';
import {paths} from '../routes/paths.js';
import {useAuth} from '../auth/AuthContext.jsx';
import {useResource} from '../hooks/useResource.js';
import {Notice} from '../components/Notice.jsx';
import {SeatDots} from '../components/SeatDots.jsx';
import {EmptyState,ErrorState} from '../components/ResourceState.jsx';
import {LoadingBlock,SkeletonSessions,Spinner} from '../components/Loading.jsx';
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
  const [checkout,setCheckout]=useState(null);

  const walletLoader=useCallback(
    signal=>(isAdmin?Promise.resolve(null):api.wallet(signal)),
    [isAdmin]
  );
  const wallet=useResource(walletLoader,{deps:[isAdmin]});
  const balance=wallet.data?.balance??null;

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
        setFeedback({
          tone:'success',
          title:'Seat held',
          body:session.price>0
            ?`${formatMoney(session.price)} taken from your wallet. Your code for ${formatSlot(session)} is ${result.booking.code}.`
            :`Your code for ${formatSlot(session)} is ${result.booking.code}.`
        });
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
      setCheckout(null);
      await Promise.all([reload(),isAdmin?Promise.resolve():wallet.reload()]);
    }catch(caught){
      setData(snapshot);
      setFeedback({
        tone:'error',
        title:caught.status===402?'Not enough credit':'That did not work',
        body:caught.message
      });
      if(caught.status!==402)setCheckout(null);
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

      {checkout?(()=>{
        const short=balance!==null&&balance<checkout.price;
        const busy=Boolean(pending[checkout.id]);
        return (
          <section className="checkout" aria-labelledby="checkout-heading" aria-live="polite">
            <p className="eyebrow" id="checkout-heading">Confirm payment</p>
            <h3>{formatSlot(checkout)} on {formatDay(checkout.date)}</h3>

            <dl className="checkout__lines numeric">
              <div>
                <dt>Session</dt>
                <dd>{formatMoney(checkout.price)}</dd>
              </div>
              <div>
                <dt>Wallet balance</dt>
                <dd>{balance===null?'—':formatMoney(balance)}</dd>
              </div>
              <div className="checkout__total">
                <dt>Balance after</dt>
                <dd>{balance===null?'—':formatMoney(Math.max(balance-checkout.price,0))}</dd>
              </div>
            </dl>

            {short?(
              <p className="field__error">
                You are {formatMoney(checkout.price-balance)} short. Top up your wallet to book this hour.
              </p>
            ):null}

            <div className="inline">
              {short?(
                <Link className="btn" to={paths.wallet}>Top up wallet</Link>
              ):(
                <button type="button" className="btn" disabled={busy} onClick={()=>runAction(checkout,'book')}>
                  {busy?<><Spinner />Paying</>:`Pay ${formatMoney(checkout.price)} and book`}
                </button>
              )}
              <button type="button" className="linkbutton" onClick={()=>setCheckout(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </section>
        );
      })():null}

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

        {loading?(
          <LoadingBlock label="Loading the timetable">
            <SkeletonSessions rows={4} />
          </LoadingBlock>
        ):null}

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

                  <div className="sessions__action">
                    {held?<span className="badge badge--held">Held</span>
                      :queued?<span className="badge badge--queued">Queued</span>
                        :session.isInProgress?<span className="badge badge--gone">Live</span>
                          :session.hasStarted?<span className="badge badge--gone">Closed</span>
                            :session.isFull?<span className="badge badge--full">Full</span>
                              :<span className="badge badge--open">Open</span>}

                    {isAdmin||session.hasStarted?(
                      <span className="sessions__nil">&mdash;</span>
                    ):held?(
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>runAction(session,'cancel')}>
                        {busy?<><Spinner />Cancelling</>:'Cancel'}
                      </button>
                    ):queued?(
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>runAction(session,'leave')}>
                        {busy?<><Spinner />Leaving</>:'Leave queue'}
                      </button>
                    ):session.isFull?(
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={()=>runAction(session,'waitlist')}>
                        {busy?<><Spinner />Joining</>:'Join waitlist'}
                      </button>
                    ):session.price>0?(
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={()=>{setFeedback(null);setCheckout(session);}}
                      >
                        {busy?'Paying':`Book · ${formatMoney(session.price)}`}
                      </button>
                    ):(
                      <button type="button" className="btn" disabled={busy} onClick={()=>runAction(session,'book')}>
                        {busy?<><Spinner />Booking</>:'Book'}
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
