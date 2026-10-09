export function SeatDots({seatsRemaining,capacity,mine}){
  const taken=Math.max(capacity-seatsRemaining,0);
  const seats=Array.from({length:capacity},(_unused,index)=>{
    if(mine&&index===0)return 'mine';
    return index<taken?'taken':'free';
  });

  return (
    <div className="seats">
      <div
        className="seats__grid"
        role="img"
        aria-label={`${seatsRemaining} of ${capacity} seats free${mine?', one of them yours':''}`}
      >
        {seats.map((state,index)=>(
          <span key={index} className="seat" data-state={state} />
        ))}
      </div>
      <p className="seats__count numeric">
        <b>{seatsRemaining}</b>
        <span className="seats__of"> free of {capacity}</span>
      </p>
    </div>
  );
}
