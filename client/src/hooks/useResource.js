import {useCallback,useEffect,useRef,useState} from 'react';

export function useResource(loader,{deps=[],pollMs=0}={}){
  const loaderRef=useRef(loader);
  loaderRef.current=loader;

  const [data,setData]=useState(null);
  const [error,setError]=useState(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [staleError,setStaleError]=useState(null);

  const activeRef=useRef(null);
  const mountedRef=useRef(true);

  useEffect(()=>()=>{
    mountedRef.current=false;
    activeRef.current?.abort();
  },[]);

  const run=useCallback(async(mode)=>{
    activeRef.current?.abort();
    const controller=new AbortController();
    activeRef.current=controller;

    if(mode==='initial')setLoading(true);
    else setRefreshing(true);

    try{
      const result=await loaderRef.current(controller.signal);
      if(!mountedRef.current||controller.signal.aborted)return;
      setData(result);
      setError(null);
      setStaleError(null);
    }catch(caught){
      if(caught.name==='AbortError'||!mountedRef.current)return;
      if(mode==='initial')setError(caught);
      else setStaleError(caught);
    }finally{
      if(mountedRef.current&&!controller.signal.aborted){
        setLoading(false);
        setRefreshing(false);
      }
    }
  },[]);

  useEffect(()=>{
    run('initial');
  },[run,...deps]);

  useEffect(()=>{
    if(!pollMs)return undefined;
    const id=window.setInterval(()=>{
      if(document.visibilityState==='visible')run('poll');
    },pollMs);
    return ()=>window.clearInterval(id);
  },[pollMs,run,...deps]);

  const reload=useCallback(()=>run('refresh'),[run]);
  const retry=useCallback(()=>run('initial'),[run]);

  return {data,setData,error,staleError,loading,refreshing,reload,retry};
}
