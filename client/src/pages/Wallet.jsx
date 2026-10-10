import {useCallback,useState} from 'react';
import {api} from '../api/endpoints.js';
import {useResource} from '../hooks/useResource.js';
import {Field} from '../components/Field.jsx';
import {Notice} from '../components/Notice.jsx';
import {EmptyState,ErrorState,LoadingState} from '../components/ResourceState.jsx';
import {formatMoney,toPaise} from '../utils/money.js';
import {formatHour,formatStamp} from '../utils/format.js';

const PRESETS=[200,500,1000];

export function Wallet(){
  const [amount,setAmount]=useState('500');
  const [amountError,setAmountError]=useState(null);
  const [starting,setStarting]=useState(false);

  const [pendingTopUp,setPendingTopUp]=useState(null);
  const [demoOtp,setDemoOtp]=useState(null);
  const [otp,setOtp]=useState('');
  const [otpError,setOtpError]=useState(null);
  const [confirming,setConfirming]=useState(false);
  const [feedback,setFeedback]=useState(null);

  const loader=useCallback(signal=>api.wallet(signal),[]);
  const {data,error,loading,refreshing,reload,retry}=useResource(loader);

  const start=async event=>{
    event.preventDefault();
    const paise=toPaise(amount);
    if(!Number.isFinite(paise)||paise<100){
      setAmountError('Enter at least ₹1');
      return;
    }

    setAmountError(null);
    setStarting(true);
    setFeedback(null);
    try{
      const result=await api.startTopUp(paise);
      setPendingTopUp(result.topUp);
      setDemoOtp(result.demoOtp||null);
      setOtp('');
    }catch(caught){
      setFeedback({tone:'error',title:'Could not start that top-up',body:caught.message});
      setAmountError(caught.fieldErrors?.amount);
    }finally{
      setStarting(false);
    }
  };

  const confirm=async event=>{
    event.preventDefault();
    if(!/^\d{6}$/.test(otp.trim())){
      setOtpError('The code is 6 digits');
      return;
    }

    setOtpError(null);
    setConfirming(true);
    try{
      const result=await api.confirmTopUp(pendingTopUp.id,otp.trim());
      setFeedback({tone:'success',title:'Wallet topped up',body:`${formatMoney(result.topUp.amount)} added. Your balance is now ${formatMoney(result.balance)}.`});
      setPendingTopUp(null);
      setDemoOtp(null);
      setOtp('');
      await reload();
    }catch(caught){
      setOtpError(caught.fieldErrors?.otp||null);
      if(!caught.fieldErrors?.otp){
        setFeedback({tone:'error',title:'Could not confirm that top-up',body:caught.message});
        if(caught.status===409){
          setPendingTopUp(null);
          setDemoOtp(null);
        }
      }
    }finally{
      setConfirming(false);
    }
  };

  const abandon=()=>{
    setPendingTopUp(null);
    setDemoOtp(null);
    setOtp('');
    setOtpError(null);
  };

  const entries=data?.entries||[];

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow">Wallet</p>
        <h1>Credit for paid sessions.</h1>
        <p className="prose">
          Most hours are free. Paid ones are taken from this balance when you book, and put
          straight back if you cancel.
        </p>
      </div>

      <Notice tone="info" title="This is a simulation">
        No real payment provider is involved. Top-ups issue a one-time code that the API
        returns to you outside production, so the flow can be demonstrated without keys,
        accounts or real money.
      </Notice>

      {feedback?<Notice tone={feedback.tone} title={feedback.title}>{feedback.body}</Notice>:null}

      {loading?<LoadingState label="Loading your wallet" />:null}
      {!loading&&error?<ErrorState error={error} onRetry={retry} busy={refreshing} />:null}

      {!loading&&!error?(
        <>
          <section className="panel" aria-labelledby="balance-heading">
            <div className="panel__head">
              <h2 id="balance-heading" className="eyebrow">Balance</h2>
            </div>

            <div className="split">
              <div>
                <p className="balance numeric">{formatMoney(data.balance)}</p>
                <p className="slot__note">Available to spend on paid sessions.</p>
              </div>

              <div>
                {pendingTopUp?(
                  <form className="form" onSubmit={confirm} noValidate>
                    <div className="stub">
                      <p className="eyebrow">Confirm {formatMoney(pendingTopUp.amount)}</p>
                      <p className="stub__ref mono">{pendingTopUp.reference}</p>
                      {demoOtp?(
                        <p className="stub__otp">
                          Demo code: <span className="code">{demoOtp}</span>
                        </p>
                      ):(
                        <p className="stub__otp slot__note">
                          A real deployment would text this code to you. This one is written to
                          the server log instead, and is only shown here when the operator sets
                          DEMO_SHOW_OTP.
                        </p>
                      )}
                      <p className="slot__note">The code expires five minutes after it is issued.</p>
                    </div>

                    <Field
                      label="One-time code"
                      value={otp}
                      onChange={value=>{setOtp(value);setOtpError(null);}}
                      error={otpError}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      disabled={confirming}
                    />

                    <div className="inline">
                      <button type="submit" className="btn" disabled={confirming}>
                        {confirming?'Confirming':'Confirm top-up'}
                      </button>
                      <button type="button" className="linkbutton" onClick={abandon} disabled={confirming}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ):(
                  <form className="form" onSubmit={start} noValidate>
                    <Field
                      label="Top up by"
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={value=>{setAmount(value);setAmountError(null);}}
                      hint="In rupees."
                      error={amountError}
                      disabled={starting}
                    />

                    <div className="inline">
                      {PRESETS.map(preset=>(
                        <button
                          key={preset}
                          type="button"
                          className="btn btn--ghost"
                          onClick={()=>setAmount(String(preset))}
                          disabled={starting}
                        >
                          {formatMoney(preset*100)}
                        </button>
                      ))}
                    </div>

                    <button type="submit" className="btn" disabled={starting}>
                      {starting?'Sending code':'Send one-time code'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>

          <section className="panel" aria-labelledby="ledger-heading">
            <div className="panel__head">
              <h2 id="ledger-heading" className="eyebrow">Statement</h2>
            </div>

            {entries.length?(
              <table className="ledger">
                <caption>Every movement, newest first. Nothing changes the balance without a line here.</caption>
                <thead>
                  <tr>
                    <th scope="col">What</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Balance after</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry=>(
                    <tr key={entry.id}>
                      <td>
                        <strong>{entry.note}</strong>
                        <br />
                        <span className="slot__note">
                          {entry.kind==='top-up'?'Added':entry.kind==='refund'?'Returned':'Spent'}
                          {entry.session?` · ${entry.session.date} ${formatHour(entry.session.startHour)}`:''}
                        </span>
                      </td>
                      <td className="numeric">
                        <span className={entry.kind==='charge'?'amount amount--out':'amount amount--in'}>
                          {entry.kind==='charge'?'−':'+'}{formatMoney(entry.amount)}
                        </span>
                      </td>
                      <td className="numeric">{formatMoney(entry.balanceAfter)}</td>
                      <td className="numeric">{formatStamp(entry.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ):(
              <EmptyState title="Nothing has moved yet">
                Top up above, then book a paid session to see it recorded here.
              </EmptyState>
            )}
          </section>
        </>
      ):null}
    </>
  );
}
