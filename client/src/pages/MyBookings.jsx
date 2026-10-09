import {useCallback,useState} from 'react';
import {api} from '../api/endpoints.js';
import {useResource} from '../hooks/useResource.js';
import {Notice} from '../components/Notice.jsx';
import {EmptyState,ErrorState,LoadingState} from '../components/ResourceState.jsx';
import {formatDay,formatSlot,formatStamp} from '../utils/format.js';

const POLL_MS=15000;

export function MyBookings(){
  const [pending,setPending]=useState(null);
  const [feedback,setFeedback]=useState(null);

  const loader=useCallback(signal=>api.myBookings(signal),[]);
  const {data,error,staleError,loading,refreshing,reload,retry}=useResource(loader,{pollMs:POLL_MS});

  const cancel=async booking=>{
    setPending(booking.id);
    setFeedback(null);
    try{
      const result=await api.cancel(booking.id);
      setFeedback(result.promoted
        ?{tone:'success',title:'Cancelled',body:'Your seat was handed to the first person waiting.'}
        :{tone:'success',title:'Cancelled',body:'That seat is back in the pool.'});
      await reload();
    }catch(caught){
      setFeedback({tone:'error',title:'Could not cancel',body:caught.message});
    }finally{
      setPending(null);
    }
  };

  const leave=async entry=>{
    setPending(entry.id);
    setFeedback(null);
    try{
      await api.leaveWaitlist(entry.session.id);
      setFeedback({tone:'success',title:'Left the waitlist',body:'You are no longer queued for that session.'});
      await reload();
    }catch(caught){
      setFeedback({tone:'error',title:'Could not leave the waitlist',body:caught.message});
    }finally{
      setPending(null);
    }
  };

  const bookings=data?.bookings||[];
  const waitlist=data?.waitlist||[];
  const active=bookings.filter(b=>b.status==='confirmed'&&!b.session?.hasStarted);
  const history=bookings.filter(b=>b.status!=='confirmed'||b.session?.hasStarted);

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">Your account</p>
        <h1>Your bookings and codes.</h1>
        <p className="prose">
          Show the code at the desk during your hour. You can cancel any time before the
          session starts.
        </p>
      </div>

      {feedback?<Notice tone={feedback.tone} title={feedback.title}>{feedback.body}</Notice>:null}
      {staleError?<Notice tone="error" title="Live updates paused">{staleError.message}</Notice>:null}

      {loading?<LoadingState label="Loading your bookings" />:null}
      {!loading&&error?<ErrorState error={error} onRetry={retry} busy={refreshing} />:null}

      {!loading&&!error?(
        <>
          <section className="panel" aria-labelledby="held-heading">
            <div className="panel__head">
              <h2 id="held-heading" className="eyebrow">Seats you hold</h2>
            </div>

            {active.length?(
              <table className="ledger">
                <caption>Upcoming sessions you are booked into.</caption>
                <thead>
                  <tr>
                    <th scope="col">Session</th>
                    <th scope="col">Check-in code</th>
                    <th scope="col">Booked</th>
                    <th scope="col"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {active.map(booking=>(
                    <tr key={booking.id}>
                      <td>
                        <strong>{formatSlot(booking.session)}</strong>
                        <br />
                        <span className="slot__day">{formatDay(booking.session.date)}</span>
                      </td>
                      <td><span className="code">{booking.code}</span></td>
                      <td className="numeric">{formatStamp(booking.bookedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={pending===booking.id}
                          onClick={()=>cancel(booking)}
                        >
                          {pending===booking.id?'Cancelling':'Cancel'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ):(
              <EmptyState title="No seats held">
                Head to the timetable and book an hour that suits you.
              </EmptyState>
            )}
          </section>

          <section className="panel" aria-labelledby="queue-heading">
            <div className="panel__head">
              <h2 id="queue-heading" className="eyebrow">Waitlists</h2>
            </div>

            {waitlist.length?(
              <table className="ledger">
                <caption>You move into the session automatically if somebody cancels.</caption>
                <thead>
                  <tr>
                    <th scope="col">Session</th>
                    <th scope="col">Position</th>
                    <th scope="col">Joined</th>
                    <th scope="col"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map(entry=>(
                    <tr key={entry.id}>
                      <td>
                        <strong>{formatSlot(entry.session)}</strong>
                        <br />
                        <span className="slot__day">{formatDay(entry.session.date)}</span>
                      </td>
                      <td className="numeric">#{entry.position}</td>
                      <td className="numeric">{formatStamp(entry.joinedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={pending===entry.id}
                          onClick={()=>leave(entry)}
                        >
                          {pending===entry.id?'Leaving':'Leave'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ):(
              <EmptyState title="Not queued anywhere">
                When a session is full you can join its waitlist from the timetable.
              </EmptyState>
            )}
          </section>

          <section className="panel" aria-labelledby="history-heading">
            <div className="panel__head">
              <h2 id="history-heading" className="eyebrow">History</h2>
            </div>

            {history.length?(
              <table className="ledger">
                <caption>Sessions that have finished, and bookings you cancelled.</caption>
                <thead>
                  <tr>
                    <th scope="col">Session</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(booking=>(
                    <tr key={booking.id} data-dim="true">
                      <td>
                        {booking.session?(
                          <>
                            <strong>{formatSlot(booking.session)}</strong>
                            <br />
                            <span className="slot__day">{formatDay(booking.session.date)}</span>
                          </>
                        ):'Session removed'}
                      </td>
                      <td>
                        {booking.status==='cancelled'
                          ?<span className="badge badge--gone">Cancelled</span>
                          :booking.attendedAt
                            ?<span className="badge badge--held">Attended</span>
                            :<span className="badge badge--gone">No show</span>}
                      </td>
                      <td className="numeric">{formatStamp(booking.attendedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ):(
              <EmptyState title="Nothing in your history yet" />
            )}
          </section>
        </>
      ):null}
    </>
  );
}
