export function LoadingState({label='Loading'}){
  return (
    <div className="state" role="status" aria-live="polite">
      <p className="eyebrow">{label}</p>
      <p className="state__body">Fetching the latest from the gym.</p>
    </div>
  );
}

export function ErrorState({error,onRetry,busy}){
  return (
    <div className="state" role="alert">
      <p className="state__title">That did not load</p>
      <p className="state__body">{error?.message||'Something went wrong.'}</p>
      {onRetry?(
        <div>
          <button type="button" className="btn btn--ghost" onClick={onRetry} disabled={busy}>
            {busy?'Retrying':'Try again'}
          </button>
        </div>
      ):null}
    </div>
  );
}

export function EmptyState({title,children}){
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      {children?<p className="state__body">{children}</p>:null}
    </div>
  );
}
