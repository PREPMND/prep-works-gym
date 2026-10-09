export function Notice({tone='info',title,children,details}){
  const className=tone==='error'?'notice notice--error':tone==='success'?'notice notice--success':'notice';

  return (
    <div className={className} role={tone==='error'?'alert':'status'}>
      {title?<p className="notice__title">{title}</p>:null}
      {children?<p className="notice__body">{children}</p>:null}
      {details?.length?(
        <ul>
          {details.map(item=>(
            <li key={`${item.field}-${item.message}`}>{item.message}</li>
          ))}
        </ul>
      ):null}
    </div>
  );
}
