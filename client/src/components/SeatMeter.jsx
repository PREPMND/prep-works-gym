export function SeatMeter({seatsRemaining,capacity}){
  const taken=Math.max(capacity-seatsRemaining,0);
  const percent=capacity?Math.round((taken/capacity)*100):0;
  const full=seatsRemaining<=0;

  return (
    <div className="seats">
      <p className="seats__count">
        <b>{String(seatsRemaining).padStart(2,'0')}</b>
        <span className="seats__of"> / {capacity} free</span>
      </p>
      <div
        className="seats__bar"
        data-full={full?'true':'false'}
        role="img"
        aria-label={`${taken} of ${capacity} seats taken`}
      >
        <span style={{width:`${percent}%`}} />
      </div>
    </div>
  );
}
