import {Navigate,useLocation} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext.jsx';
import {LoadingState} from '../components/ResourceState.jsx';
import {paths} from './paths.js';

export function ProtectedRoute({role,children}){
  const {status,user}=useAuth();
  const location=useLocation();

  if(status==='loading'){
    return (
      <div className="shell">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if(status!=='authenticated'){
    return <Navigate to={paths.login} replace state={{from:location.pathname}} />;
  }

  if(role&&user.role!==role){
    return (
      <div className="pagehead">
        <p className="eyebrow">403 &mdash; Forbidden</p>
        <h1>Staff only</h1>
        <p className="prose">
          The front desk is limited to admin accounts. Your account is signed in as a member,
          so the gym&rsquo;s booking records are not available here.
        </p>
      </div>
    );
  }

  return children;
}
