import {useCallback,useEffect,useState} from 'react';

const STORAGE_KEY='gym.theme';

function preferred(){
  try{
    const saved=window.localStorage.getItem(STORAGE_KEY);
    if(saved==='light'||saved==='dark')return saved;
  }catch{
    return 'light';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';
}

export function useTheme(){
  const [theme,setTheme]=useState(preferred);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    try{
      window.localStorage.setItem(STORAGE_KEY,theme);
    }catch{
      return;
    }
  },[theme]);

  const toggle=useCallback(()=>{
    setTheme(current=>(current==='dark'?'light':'dark'));
  },[]);

  return {theme,toggle};
}
