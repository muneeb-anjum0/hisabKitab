import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Field } from '../components/comic/Comic';

export function FirebaseSetup() {
  const required = ['API Key', 'Auth Domain', 'Project ID', 'Storage Bucket', 'Messaging Sender ID', 'App ID'];
  return <main className="setup-page">
    <section className="setup-masthead"><span>HISAB</span><b>KITAB!</b></section>
    <section className="setup-card panel">
      <span className="kicker red">CONFIGURATION REQUIRED</span>
      <h1>HISABKITAB NEEDS FIREBASE.</h1>
      <p>Firebase credentials have not been added yet. No account or financial data can be used until the app is connected.</p>
      <code>.env.local</code>
      <ul>{required.map((item) => <li key={item}>□ {item}</li>)}</ul>
      <p>Copy the six values from your Firebase Web App configuration, save the file, then restart:</p>
      <pre>npm run dev</pre>
      <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">OPEN FIREBASE CONSOLE →</a>
    </section>
  </main>;
}

export default function Auth() {
  const auth = useAuth();
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (isSignup && values.password !== values.confirm) {
      setError('Passwords do not match.'); return;
    }
    setBusy(true);
    try {
      if (isSignup) await auth.emailSignup(values.name.trim(), values.email.trim(), values.password);
      else await auth.emailLogin(values.email.trim(), values.password);
    } catch (authError) { setError(authError.message); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    setError(''); setMessage('');
    if (!values.email.trim()) { setError('Enter your email first.'); return; }
    setBusy(true);
    try {
      await auth.resetPassword(values.email.trim());
      setMessage('Password reset email sent. Check your inbox.');
    } catch (resetError) { setError(resetError.message); }
    finally { setBusy(false); }
  };

  const google = async () => {
    setBusy(true); setError('');
    try { await auth.googleLogin(); }
    catch (googleError) { setError(googleError.message); setBusy(false); }
  };

  return <main className="auth-page">
    <section className="auth-art">
      <div className="auth-logo"><span>HISAB</span><b>KITAB!</b></div>
      <div className="pow">₹</div>
      <h1>MONEY.<br/><em>SPLIT CLEARLY.</em><br/>SPENT SMARTLY.</h1>
      <p>Your personal and household money, without the mystery.</p>
    </section>
    <section className="auth-form panel">
      <span className="kicker red">OPEN THE BOOK</span>
      <h2>{isSignup ? 'MAKE AN ACCOUNT' : 'WELCOME BACK!'}</h2>
      <p>{isSignup ? 'Start a ledger that actually makes sense.' : 'Your money story is waiting.'}</p>
      <form onSubmit={submit}>
        {isSignup && <Field label="YOUR NAME"><input required autoComplete="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })}/></Field>}
        <Field label="EMAIL"><input type="email" required autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })}/></Field>
        <Field label="PASSWORD"><input type="password" required minLength="6" autoComplete={isSignup ? 'new-password' : 'current-password'} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })}/></Field>
        {isSignup && <Field label="CONFIRM PASSWORD"><input type="password" required minLength="6" autoComplete="new-password" value={values.confirm} onChange={(e) => setValues({ ...values, confirm: e.target.value })}/></Field>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        <Button disabled={busy}>{busy ? 'ONE SEC…' : isSignup ? 'CREATE ACCOUNT' : 'LOG IN'}</Button>
        <button type="button" className="google" disabled={busy} onClick={google}>G&nbsp; CONTINUE WITH GOOGLE</button>
      </form>
      {!isSignup && <button className="forgot" disabled={busy} onClick={reset}>Forgot password?</button>}
      <button className="auth-switch" onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); setMessage(''); }}>
        {isSignup ? 'Already have an account? Log in' : 'New here? Create an account'}
      </button>
    </section>
  </main>;
}
