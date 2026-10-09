import {useCallback,useEffect,useState} from 'react';

const MODE_KEY='gym.theme';
const PALETTE_KEY='gym.palette';

export const PALETTES=[
  {id:'pine',label:'Pine',swatch:'#1f5d6b'},
  {id:'clay',label:'Clay',swatch:'#9a4a2f'},
  {id:'indigo',label:'Indigo',swatch:'#3f4b9a'},
  {id:'graphite',label:'Graphite',swatch:'#3b4248'}
];

function read(key,allowed,fallback){
  try{
    const saved=window.localStorage.getItem(key);
    if(allowed.includes(saved))return saved;
  }catch{
    return fallback;
  }
  return fallback;
}

function preferredMode(){
  const saved=read(MODE_KEY,['light','dark'],null);
  if(saved)return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
}

export function useTheme(){
  const [mode,setMode]=useState(preferredMode);
  const [palette,setPalette]=useState(()=>read(PALETTE_KEY,PALETTES.map(p=>p.id),'pine'));

  useEffect(()=>{
    document.documentElement.dataset.theme=mode;
    document.documentElement.dataset.palette=palette;
    try{
      window.localStorage.setItem(MODE_KEY,mode);
      window.localStorage.setItem(PALETTE_KEY,palette);
    }catch{
      return;
    }
  },[mode,palette]);

  const toggle=useCallback(()=>{
    setMode(current=>(current==='dark'?'light':'dark'));
  },[]);

  return {theme:mode,toggle,palette,setPalette,palettes:PALETTES};
}
