const BASE_URL=import.meta.env.VITE_API_URL||'http://localhost:4000/api';
const TOKEN_KEY='gym.token';

export class RequestError extends Error{
  constructor({status,code,message,details}){
    super(message);
    this.name='RequestError';
    this.status=status;
    this.code=code;
    this.details=details||[];
  }

  get fieldErrors(){
    const map={};
    for(const item of this.details){
      const key=String(item.field||'').replace(/^body\./,'');
      if(key&&!map[key])map[key]=item.message;
    }
    return map;
  }
}

export function readToken(){
  try{
    return window.localStorage.getItem(TOKEN_KEY);
  }catch{
    return null;
  }
}

export function writeToken(token){
  try{
    if(token)window.localStorage.setItem(TOKEN_KEY,token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }catch{
    return;
  }
}

function buildUrl(path,query){
  const url=new URL(BASE_URL.replace(/\/$/,'')+path,window.location.origin);
  for(const [key,value] of Object.entries(query||{})){
    if(value===undefined||value===null||value==='')continue;
    url.searchParams.set(key,String(value));
  }
  return url.toString();
}

export async function request(path,{method='GET',body,query,signal}={}){
  const token=readToken();

  let response;
  try{
    response=await fetch(buildUrl(path,query),{
      method,
      signal,
      headers:{
        ...(body?{'content-type':'application/json'}:{}),
        ...(token?{authorization:`Bearer ${token}`}:{})
      },
      body:body?JSON.stringify(body):undefined
    });
  }catch(error){
    if(error.name==='AbortError')throw error;
    throw new RequestError({status:0,code:'NETWORK',message:'Could not reach the server. Check that the API is running.'});
  }

  if(response.status===204)return null;

  let payload=null;
  try{
    payload=await response.json();
  }catch{
    payload=null;
  }

  if(!response.ok){
    const error=payload?.error||{};
    throw new RequestError({
      status:response.status,
      code:error.code||'UNKNOWN',
      message:error.message||`The request failed with status ${response.status}`,
      details:error.details
    });
  }

  return payload;
}
