import {useState} from 'react';
import {Link,Navigate,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext.jsx';
import {Field} from '../components/Field.jsx';
import {Notice} from '../components/Notice.jsx';
import {paths} from '../routes/paths.js';

function validate({email,password}){
  const errors={};
  if(!email.trim())errors.email='Enter your email address';
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))errors.email='That does not look like an email address';
  if(!password)errors.password='Enter your password';
  return errors;
}

export function Login(){
  const {login,status}=useAuth();
  const navigate=useNavigate();
  const location=useLocation();

  const [form,setForm]=useState({email:'',password:''});
  const [errors,setErrors]=useState({});
  const [failure,setFailure]=useState(null);
  const [submitting,setSubmitting]=useState(false);

  if(status==='authenticated')return <Navigate to={location.state?.from||paths.sessions} replace />;

  const update=field=>value=>{
    setForm(previous=>({...previous,[field]:value}));
    setErrors(previous=>({...previous,[field]:undefined}));
  };

  const submit=async event=>{
    event.preventDefault();
    const found=validate(form);
    setErrors(found);
    if(Object.keys(found).length)return;

    setSubmitting(true);
    setFailure(null);
    try{
      const user=await login({email:form.email.trim(),password:form.password});
      navigate(location.state?.from||(user.role==='admin'?paths.frontDesk:paths.sessions),{replace:true});
    }catch(caught){
      setFailure(caught);
      setErrors(caught.fieldErrors||{});
    }finally{
      setSubmitting(false);
    }
  };

  return (
    <div className="authpage">
      <div className="authcard">
        <div className="authcard__head">
          <p className="eyebrow">Ironworks Gym</p>
          <h1>Book the hour, skip the notebook.</h1>
          <p className="prose">
            Sign in to see which of today&rsquo;s sessions still have seats, hold one, and keep
            your check-in code to hand.
          </p>
        </div>

        {failure?(
          <Notice tone="error" title="Could not sign you in" details={failure.details}>
            {failure.message}
          </Notice>
        ):null}

        <form className="form" onSubmit={submit} noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
            disabled={submitting}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            disabled={submitting}
          />
          <button type="submit" className="btn btn--block" disabled={submitting}>
            {submitting?'Signing in':'Sign in'}
          </button>
          <p className="form__foot">
            New here? <Link to={paths.register}>Create a member account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
