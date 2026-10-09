import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {api} from '../api/endpoints.js';
import {readToken,writeToken} from '../api/client.js';

const AuthContext=createContext(null);

export function AuthProvider({children}){
  const [user,setUser]=useState(null);
  const [status,setStatus]=useState(readToken()?'loading':'anonymous');

  useEffect(()=>{
    if(status!=='loading')return undefined;
    const controller=new AbortController();

    api.me(controller.signal)
      .then(result=>{
        setUser(result.user);
        setStatus('authenticated');
      })
      .catch(error=>{
        if(error.name==='AbortError')return;
        writeToken(null);
        setUser(null);
        setStatus('anonymous');
      });

    return ()=>controller.abort();
  },[status]);

  const adopt=useCallback(result=>{
    writeToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  },[]);

  const login=useCallback(async credentials=>adopt(await api.login(credentials)),[adopt]);
  const register=useCallback(async details=>adopt(await api.register(details)),[adopt]);

  const logout=useCallback(()=>{
    writeToken(null);
    setUser(null);
    setStatus('anonymous');
  },[]);

  const value=useMemo(()=>({
    user,
    status,
    isAdmin:user?.role==='admin',
    login,
    register,
    logout
  }),[user,status,login,register,logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){
  const context=useContext(AuthContext);
  if(!context)throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
