import {useState} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext.jsx';
import {Field} from '../components/Field.jsx';
import {Notice} from '../components/Notice.jsx';
import {paths} from '../routes/paths.js';

function validate({name,email,password}){
  const errors={};
  if(name.trim().length<2)errors.name='Enter your full name';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))errors.email='That does not look like an email address';
  if(password.length<8)errors.password='Use at least 8 characters';
  return errors;
}

export function Register(){
  const {register,status}=useAuth();
  const navigate=useNavigate();

  const [form,setForm]=useState({name:'',email:'',password:''});
  const [errors,setErrors]=useState({});
  const [failure,setFailure]=useState(null);
  const [submitting,setSubmitting]=useState(false);

  if(status==='authenticated')return <Navigate to={paths.sessions} replace />;

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
      await register({name:form.name.trim(),email:form.email.trim(),password:form.password});
      navigate(paths.sessions,{replace:true});
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
          <p className="eyebrow">New member</p>
          <h1>Set up your account.</h1>
          <p className="prose">
            Members book their own sessions. Staff accounts are created by the gym, not here.
          </p>
        </div>

        {failure?(
          <Notice tone="error" title="Could not create your account" details={failure.details}>
            {failure.message}
          </Notice>
        ):null}

        <form className="form" onSubmit={submit} noValidate>
          <Field
            label="Full name"
            autoComplete="name"
            value={form.name}
            onChange={update('name')}
            error={errors.name}
            disabled={submitting}
          />
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
            autoComplete="new-password"
            hint="At least 8 characters."
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            disabled={submitting}
          />
          <button type="submit" className="btn btn--block" disabled={submitting}>
            {submitting?'Creating account':'Create account'}
          </button>
          <p className="form__foot">
            Already a member? <Link to={paths.login}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
