const rupees=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2});

export function formatMoney(paise){
  return rupees.format((paise||0)/100);
}

export function toPaise(rupeeInput){
  const parsed=Number(rupeeInput);
  return Number.isFinite(parsed)?Math.round(parsed*100):Number.NaN;
}
