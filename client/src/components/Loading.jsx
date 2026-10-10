export function Spinner({label='Loading'}){
  return <span className="spinner" role="status" aria-label={label} />;
}

export function SkeletonSessions({rows=4}){
  return (
    <div aria-hidden="true">
      <ul className="sessions">
        {Array.from({length:rows},(_unused,index)=>(
          <li key={index} className="sessions__row">
            <div>
              <span className="skeleton skeleton--line" style={{width:'5.5rem',height:'1.5rem'}} />
              <span className="skeleton skeleton--line" style={{width:'3.5rem'}} />
            </div>
            <div>
              <span className="skeleton skeleton--line" style={{width:'7rem'}} />
              <span className="skeleton skeleton--line" style={{width:'9rem'}} />
            </div>
            <div className="seats">
              <span className="skeleton skeleton--line" style={{width:'6rem',height:'1.4rem'}} />
            </div>
            <div className="sessions__action">
              <span className="skeleton skeleton--line" style={{width:'7rem',height:'2.6rem'}} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkeletonTable({rows=3,columns=4}){
  return (
    <table className="ledger" aria-hidden="true">
      <tbody>
        {Array.from({length:rows},(_unused,row)=>(
          <tr key={row}>
            {Array.from({length:columns},(_u,column)=>(
              <td key={column}>
                <span className="skeleton skeleton--line" style={{width:column===0?'9rem':'4.5rem'}} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LoadingBlock({label='Loading',children,rows}){
  return (
    <div className="loadingblock">
      <p className="loadingblock__label">
        <Spinner label={label} />
        <span>{label}</span>
      </p>
      {children||<SkeletonTable rows={rows||3} />}
    </div>
  );
}
