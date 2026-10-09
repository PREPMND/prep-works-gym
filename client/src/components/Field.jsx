import {useId} from 'react';

export function Field({label,hint,error,type='text',value,onChange,...rest}){
  const id=useId();
  const hintId=`${id}-hint`;
  const errorId=`${id}-error`;
  const describedBy=[hint?hintId:null,error?errorId:null].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={event=>onChange(event.target.value)}
        aria-invalid={error?'true':'false'}
        aria-describedby={describedBy||undefined}
        {...rest}
      />
      {hint?<span className="field__hint" id={hintId}>{hint}</span>:null}
      {error?<span className="field__error" id={errorId}>{error}</span>:null}
    </div>
  );
}
