import React, { useState } from 'react';
import { Page, UserState } from '../types';
import { UserPlus, ShieldAlert, KeyRound, Info, Check, Loader2 } from 'lucide-react';
import { 
  isFirebaseReady, 
  authRegister, 
  authLogin, 
  lookupEmailByUsername,
  authLogout
} from '../services/firebaseService';
import { 
  saveUserProfile, 
  fetchUserProfile, 
  getDefaultUserMetrics, 
  isUserBlacklisted,
  isUserPermanentlyDeleted,
  normalizeIdentifier
} from '../services/db';
import firebaseConfig from '../../firebase-applet-config.json';

interface RegisterViewProps {
  onPageChange: (page: Page) => void;
  onRegisterSuccess: (user: Partial<UserState>) => void;
}

export default function RegisterView({ onPageChange, onRegisterSuccess }: RegisterViewProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(true); // switchable for instant log-in!
  
  // Registration States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [usdtTrc20, setUsdtTrc20] = useState('');
  const [bitcoin, setBitcoin] = useState('');
  const [ethereum, setEthereum] = useState('');
  const [usdtErc20, setUsdtErc20] = useState('');
  const [email, setEmail] = useState('');
  const [reemail, setReemail] = useState('');
  const [secQuestion, setSecQuestion] = useState('');
  const [secAnswer, setSecAnswer] = useState('');
  const [agree, setAgree] = useState(false);
  const [referredByInput, setReferredByInput] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('ref') || '';
    } catch {
      return '';
    }
  });
  
  // Login States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Loading States
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName || !username || !password || !email) {
      setErrorMsg('Please populate at least Full Name, Username, Password, and E-mail.');
      return;
    }
    if (password !== repassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password should be at least 8 characters long.');
      return;
    }
    if (!agree) {
      setErrorMsg('You must agree with the Terms & Conditions.');
      return;
    }

    setLoadingRegister(true);
    setSuccessMsg('Registering Account');

    const normUsername = normalizeIdentifier(username);
    const normEmail = normalizeIdentifier(email);

    try {
      // Hard Permanent Deletion & Blacklist Check before attempting any operation
      const isDeleted = await isUserPermanentlyDeleted({
        username: normUsername,
        email: normEmail
      });

      if (isDeleted) {
        setLoadingRegister(false);
        setSuccessMsg('');
        setErrorMsg('This account has been permanently disabled and cannot be recreated.');
        return;
      }

      let uid = `user_${normUsername}`;

      if (isFirebaseReady) {
        try {
          uid = await authRegister(normEmail, password);
        } catch (regErr: any) {
          setLoadingRegister(false);
          setSuccessMsg('');
          if (
            regErr?.message?.includes('permanently disabled') ||
            regErr?.message?.includes('cannot be recreated')
          ) {
            setErrorMsg('This account has been permanently disabled and cannot be recreated.');
            return;
          }
          if (regErr?.code === 'auth/email-already-in-use' || regErr?.message?.includes('email-already-in-use')) {
            setErrorMsg('This email is already in use. Please sign in or use another email.');
            return;
          }
          throw regErr;
        }
      }

      const profile: UserState = {
        ...getDefaultUserMetrics(normEmail, username.trim(), fullName.trim(), {
          usdtTrc20,
          bitcoin,
          ethereum,
          usdtErc20
        }),
        referredBy: referredByInput.trim(),
        referralsCount: 0,
        referralEarnings: 0
      };

      await saveUserProfile(uid, profile);
      
      // Store local helper map to resolve username to external email during sign-in
      localStorage.setItem(`user_email_map_${normUsername}`, normEmail);
      
      setSuccessMsg('Account registered successfully! Loading wallet dashboard...');
      setTimeout(() => {
        onRegisterSuccess({ ...profile, uid, isLoggedIn: true, email: normEmail });
        onPageChange('Dashboard');
      }, 1000);
    } catch (err: any) {
      setLoadingRegister(false);
      setSuccessMsg('');
      console.error(err);
      if (
        err?.message?.includes('permanently disabled') ||
        err?.message?.includes('cannot be recreated')
      ) {
        setErrorMsg('This account has been permanently disabled and cannot be recreated.');
      } else if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        setErrorMsg('auth/operation-not-allowed');
      } else if (err?.code === 'auth/email-already-in-use' || err?.message?.includes('email-already-in-use')) {
        setErrorMsg('This email is already in use. Please sign in or use another email.');
      } else {
        setErrorMsg(err?.message || 'Failed to register account.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginUsername || !loginPassword) {
      setErrorMsg('Please enter both your Username/Email and Password.');
      return;
    }

    setLoadingLogin(true);
    setSuccessMsg('Logging in to account...');
    const rawInput = loginUsername.trim();
    const isInputEmail = rawInput.includes('@');
    const normInput = normalizeIdentifier(rawInput);

    // 1. Resolve email if username was provided
    let parsedEmail = rawInput;
    if (!isInputEmail) {
      const mappedEmail = localStorage.getItem(`user_email_map_${normInput}`);
      if (mappedEmail) {
        parsedEmail = mappedEmail;
      } else if (isFirebaseReady) {
        const foundEmail = await lookupEmailByUsername(normInput);
        if (foundEmail) {
          parsedEmail = foundEmail;
          localStorage.setItem(`user_email_map_${normInput}`, foundEmail);
        } else {
          setLoadingLogin(false);
          setSuccessMsg('');
          setErrorMsg("Account doesn't exist or this account has been permanently disabled.");
          return;
        }
      } else {
        parsedEmail = `${normInput}@worldvest.local`;
      }
    }

    const normResolvedEmail = normalizeIdentifier(parsedEmail);

    // 2. Authenticate directly
    let uid = '';
    let profile: UserState | null = null;

    try {
      if (isFirebaseReady) {
        try {
          uid = await authLogin(normResolvedEmail, loginPassword);
        } catch (authErr: any) {
          setLoadingLogin(false);
          setSuccessMsg('');
          const errText = authErr?.message || '';
          if (
            errText.includes('permanently disabled') ||
            errText.includes("Account doesn't exist") ||
            errText.includes('user-not-found')
          ) {
            setErrorMsg("Account doesn't exist or this account has been permanently disabled.");
          } else if (errText.includes('wrong-password') || errText.includes('invalid-credential')) {
            setErrorMsg("Invalid password. Please check your credentials and try again.");
          } else {
            setErrorMsg(authErr?.message || "Invalid credentials. Please try again.");
          }
          return;
        }

        // Fetch live database profile from Firestore
        profile = await fetchUserProfile(uid);

        if (!profile) {
          console.warn("[AUTH-REJECT] Missing user profile in Firestore for UID:", uid);
          await authLogout().catch(() => {});
          setLoadingLogin(false);
          setSuccessMsg('');
          setErrorMsg("Account doesn't exist or this account has been permanently disabled.");
          return;
        }

        // Check account suspension
        if (profile.suspended) {
          await authLogout().catch(() => {});
          setLoadingLogin(false);
          setSuccessMsg('');
          setErrorMsg("This account has been suspended by an administrator.");
          return;
        }
      } else {
        // Fallback when Firebase is offline
        const localUid = `user_${normInput}`;
        profile = await fetchUserProfile(localUid);
        if (!profile || profile.suspended) {
          setLoadingLogin(false);
          setSuccessMsg('');
          setErrorMsg("Account doesn't exist or this account has been permanently disabled.");
          return;
        }
        uid = localUid;
      }

      setSuccessMsg('Authentication successful! Loading dashboard...');
      if (profile) {
        onRegisterSuccess({ ...profile, uid, isLoggedIn: true });
      }
      onPageChange('Dashboard');
    } catch (err: any) {
      console.error("[LOGIN-ERROR]", err);
      setLoadingLogin(false);
      setSuccessMsg('');
      setErrorMsg(err?.message || "Unable to complete login. Please verify your connection.");
    }
  };

  return (
    <div className="bg-[#f2f5f8] font-sans pb-24">
      {/* Dynamic Header */}
      <div className="bg-[#0b1b2e] py-16 text-center text-white border-b border-[#C59B4E]/20 mb-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white mb-2">
            {isRegisterMode ? 'Register' : 'Access Wallet'}
          </h1>
          <div className="text-slate-400 text-xs md:text-sm font-semibold tracking-wider">
            <span className="hover:text-white cursor-pointer" onClick={() => onPageChange('Home')}>Home</span>
            <span className="mx-2 text-[#C59B4E]">•</span>
            <span className="text-[#C59B4E]">{isRegisterMode ? 'Register' : 'Login'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {isRegisterMode ? (
          /* Registration Form Block */
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-slate-100">
            <div className="border-b border-slate-100 pb-6 mb-8 text-center sm:text-left">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 font-display mb-1 flex items-center justify-center sm:justify-start gap-2">
                <UserPlus className="text-[#C59B4E]" size={24} />
                Registration at WorldVest Capital
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Welcome!! Create Your Account</p>
            </div>

            {errorMsg && (
              errorMsg === 'auth/operation-not-allowed' ? (
                <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-5 text-xs font-medium mb-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <ShieldAlert size={16} className="shrink-0 text-amber-600" />
                    <span>Firebase Auth Provider (Email & Password) is Disabled</span>
                  </div>
                  <p className="leading-relaxed">
                    Authentication requires Email/Password sign-in to be manually enabled in your Firebase console. Please follow these simple steps to activate it:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 font-semibold text-amber-900 bg-white/50 p-3 rounded-lg border border-amber-100">
                    <li>Open the <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`} target="_blank" rel="noopener noreferrer" className="text-[#C59B4E] hover:underline inline-flex items-center gap-0.5">Firebase Console Providers Page <strong className="underline">here</strong></a>.</li>
                    <li>If prompted, verify your project is <span className="font-mono text-xs text-amber-800">{firebaseConfig.projectId}</span>.</li>
                    <li>Click <strong>"Add new provider"</strong> or click on <strong>"Email/Password"</strong>.</li>
                    <li>Toggle the <strong>Email/Password</strong> switch to <strong>Enabled</strong> (leave the passwordless sign-in option turned off).</li>
                    <li>Click <strong>"Save"</strong>.</li>
                  </ol>
                  <div className="text-amber-850 text-[11px] leading-normal pt-1.5 border-t border-amber-200/50">
                    💡 <strong>Pro Tip:</strong> After enabling, refresh this page or click Create Account again to immediately register!
                  </div>
                </div>
              ) : errorMsg === 'auth/invalid-credential' ? (
                <div className="bg-red-50 text-red-900 border border-red-200 rounded-xl p-5 text-xs font-medium mb-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <ShieldAlert size={16} className="shrink-0 text-red-600" />
                    <span>Invalid Credentials or Passkey Pin</span>
                  </div>
                  <p className="leading-relaxed">
                    We could not sign you in with those details. Please check for common issues:
                  </p>
                  <ul className="list-disc list-inside space-y-1 bg-white/50 p-3 rounded-lg border border-red-100 text-red-850">
                    <li><strong>E-mail Login:</strong> If you registered with an external Email (e.g. at Gmail or Yahoo), please enter your <strong>Full Email Address</strong> instead of just your username.</li>
                    <li><strong>Password match:</strong> Ensure your Passkey Pin code is correct.</li>
                    <li><strong>Not registered?</strong> If you haven't created an account yet, click <span className="text-[#C59B4E] font-semibold cursor-pointer underline" onClick={() => setIsRegisterMode(true)}>Create Account</span> to register instantly.</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-4 text-xs font-semibold mb-6 flex items-center gap-2">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )
            )}

            {successMsg && (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg p-4 text-xs font-semibold mb-6 flex items-center gap-2">
                <Check size={14} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Identity</span>
                  <input 
                    type="text" 
                    placeholder="Your Full Name" 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field" 
                  />
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Target Username</span>
                  <input 
                    type="text" 
                    placeholder="Your Username" 
                    required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field" 
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Passkey Pin</span>
                  <input 
                    type="password" 
                    placeholder="Define Password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field font-mono" 
                  />
                </div>

                {/* Retype Password */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Confirm PIN</span>
                  <input 
                    type="password" 
                    placeholder="Retype Password" 
                    required 
                    value={repassword}
                    onChange={(e) => setRepassword(e.target.value)}
                    className="input-field font-mono" 
                  />
                </div>

                {/* USDT TRC20 wallet */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">USDT TRC20 Wallet Address</span>
                  <input 
                    type="text" 
                    placeholder="Your USDT TRC20 Wallet Address" 
                    value={usdtTrc20}
                    onChange={(e) => setUsdtTrc20(e.target.value)}
                    className="input-field font-mono text-xs" 
                  />
                </div>

                {/* Bitcoin wallet */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Bitcoin Wallet Address</span>
                  <input 
                    type="text" 
                    placeholder="Your BITCOIN Wallet Address" 
                    value={bitcoin}
                    onChange={(e) => setBitcoin(e.target.value)}
                    className="input-field font-mono text-xs" 
                  />
                </div>

                {/* Ethereum wallet */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ethereum Wallet Address</span>
                  <input 
                    type="text" 
                    placeholder="Your ETHEREUM Wallet Address" 
                    value={ethereum}
                    onChange={(e) => setEthereum(e.target.value)}
                    className="input-field font-mono text-xs" 
                  />
                </div>

                {/* USDT ERC20 wallet */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">USDT ERC20 Wallet Address</span>
                  <input 
                    type="text" 
                    placeholder="Your USDT ERC20 Wallet Address" 
                    value={usdtErc20}
                    onChange={(e) => setUsdtErc20(e.target.value)}
                    className="input-field font-mono text-xs" 
                  />
                </div>

                {/* E-mail address */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">E-mail address</span>
                  <input 
                    type="email" 
                    placeholder="Your E-mail Address" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field text-xs" 
                  />
                </div>

                {/* Retype Email */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Retype Email</span>
                  <input 
                    type="email" 
                    placeholder="Retype Your E-mail" 
                    required 
                    value={reemail}
                    onChange={(e) => setReemail(e.target.value)}
                    className="input-field text-xs" 
                  />
                </div>

                {/* Security question */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Security question</span>
                  <input 
                    type="text" 
                    placeholder="Secret question" 
                    value={secQuestion}
                    onChange={(e) => setSecQuestion(e.target.value)}
                    className="input-field" 
                  />
                </div>

                {/* Security answer */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Security answer</span>
                  <input 
                    type="password" 
                    placeholder="Secret answer" 
                    value={secAnswer}
                    onChange={(e) => setSecAnswer(e.target.value)}
                    className="input-field font-mono" 
                  />
                </div>

                {/* Referral Username (Upline) */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#C59B4E] uppercase tracking-widest pl-1">Referral / Upline Username (Optional)</span>
                  <input 
                    type="text" 
                    placeholder="User who referred you (optional)" 
                    value={referredByInput}
                    onChange={(e) => setReferredByInput(e.target.value)}
                    className="input-field text-xs text-[#B3873B] font-bold" 
                  />
                </div>
              </div>

              {/* Your Upline status block */}
              <div className="text-center md:text-left text-xs text-slate-400 font-bold border-t border-b border-slate-100 py-3 uppercase tracking-wider my-1">
                Your Upline <span className="text-[#C59B4E] font-black">{referredByInput.trim() ? referredByInput.trim() : 'N/A (none)'}</span>
              </div>

              {/* Password strength tip matching screenshot */}
              <div className="flex gap-2.5 items-start bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] md:text-xs text-slate-500 font-medium">
                <Info size={16} className="text-[#C59B4E] shrink-0 mt-0.5" />
                <p>The password should be at least 8 characters long. To make it stronger use uppercase & lowercase letters &! symbols like !#&%</p>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer mt-2">
                <input 
                  type="checkbox" 
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="rounded text-[#C59B4E] focus:ring-[#C59B4E]" 
                />
                <span className="text-xs text-slate-500 font-semibold tracking-wide">
                  I Agree with the{' '}
                  <span className="text-[#C59B4E] hover:underline">Terms & conditions</span>
                </span>
              </label>

              {/* CREATE ACCOUNT Button */}
              <button 
                type="submit"
                disabled={loadingRegister}
                className={`w-full mt-2 py-4 px-6 font-black text-xs uppercase tracking-widest rounded-lg transition-all duration-200 border flex items-center justify-center gap-2.5 ${
                  loadingRegister
                    ? 'bg-slate-300 border-slate-300 text-slate-600 cursor-not-allowed opacity-90 shadow-none'
                    : 'bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.99] text-white border-[#0B2545] shadow-md cursor-pointer'
                }`}
              >
                {loadingRegister ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-slate-600" />
                    <span>Loading Request...</span>
                  </>
                ) : (
                  <span>CREATE ACCOUNT &gt;</span>
                )}
              </button>

              {/* Switch to Login login segment */}
              <div className="text-center mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Have an Account?{' '}
                <button 
                  type="button" 
                  onClick={() => setIsRegisterMode(false)}
                  className="text-[#C59B4E] font-black hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Login Mode Form */
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-slate-100 max-w-lg mx-auto">
            <div className="border-b border-slate-100 pb-5 mb-6 text-center">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 font-display mb-1 flex items-center justify-center gap-2">
                <KeyRound className="text-[#C59B4E]" size={22} />
                Access Your Secure Wallet
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Authentication Required</p>
            </div>

            {errorMsg && (
              errorMsg === 'auth/operation-not-allowed' ? (
                <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-5 text-xs font-medium mb-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <ShieldAlert size={16} className="shrink-0 text-amber-600" />
                    <span>Firebase Auth Provider (Email & Password) is Disabled</span>
                  </div>
                  <p className="leading-relaxed">
                    Authentication requires Email/Password sign-in to be manually enabled in your Firebase console. Please follow these simple steps to activate it:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 font-semibold text-amber-900 bg-white/50 p-3 rounded-lg border border-amber-100">
                    <li>Open the <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`} target="_blank" rel="noopener noreferrer" className="text-[#C59B4E] hover:underline inline-flex items-center gap-0.5">Firebase Console Providers Page <strong className="underline">here</strong></a>.</li>
                    <li>If prompted, verify your project is <span className="font-mono text-xs text-amber-800">{firebaseConfig.projectId}</span>.</li>
                    <li>Click <strong>"Add new provider"</strong> or click on <strong>"Email/Password"</strong>.</li>
                    <li>Toggle the <strong>Email/Password</strong> switch to <strong>Enabled</strong> (leave the passwordless sign-in option turned off).</li>
                    <li>Click <strong>"Save"</strong>.</li>
                  </ol>
                  <div className="text-amber-850 text-[11px] leading-normal pt-1.5 border-t border-amber-200/50">
                    💡 <strong>Pro Tip:</strong> After enabling, refresh this page or click Sign In again to connect instantly!
                  </div>
                </div>
              ) : errorMsg === 'auth/invalid-credential' ? (
                <div className="bg-red-50 text-red-900 border border-red-200 rounded-xl p-5 text-xs font-medium mb-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <ShieldAlert size={16} className="shrink-0 text-red-600" />
                    <span>Invalid Credentials or Passkey Pin</span>
                  </div>
                  <p className="leading-relaxed">
                    We could not sign you in with those details. Please check for common issues:
                  </p>
                  <ul className="list-disc list-inside space-y-1 bg-white/50 p-3 rounded-lg border border-red-100 text-red-850">
                    <li><strong>E-mail Login:</strong> If you registered with an external Email (e.g. at Gmail or Yahoo), please enter your <strong>Full Email Address</strong> instead of just your username.</li>
                    <li><strong>Password match:</strong> Ensure your Passkey Pin code is correct.</li>
                    <li><strong>Not registered?</strong> If you haven't created an account yet, click <span className="text-[#C59B4E] font-semibold cursor-pointer underline" onClick={() => setIsRegisterMode(true)}>Create Account</span> to register instantly.</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3.5 text-xs font-semibold mb-5 flex items-center gap-2">
                  <ShieldAlert size={14} />
                  <span>{errorMsg}</span>
                </div>
              )
            )}

            {successMsg && (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg p-3.5 text-xs font-semibold mb-5 flex items-center gap-2">
                <Check size={14} className="text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Username or Email Address</span>
                <input 
                  type="text" 
                  placeholder="Your username or email address" 
                  required 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="input-field" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Passkey Pin</span>
                <input 
                  type="password" 
                  placeholder="Password Code" 
                  required 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="input-field font-mono" 
                />
              </div>

              <button 
                type="submit"
                disabled={loadingLogin}
                className={`w-full mt-3 py-3.5 px-6 font-black text-xs uppercase tracking-widest rounded-lg transition-all duration-200 border flex items-center justify-center gap-2.5 ${
                  loadingLogin
                    ? 'bg-slate-300 border-slate-300 text-slate-600 cursor-not-allowed opacity-90 shadow-none'
                    : 'bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.99] text-white border-[#0B2545] shadow-md cursor-pointer'
                }`}
              >
                {loadingLogin ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-slate-600" />
                    <span>Logging in to account...</span>
                  </>
                ) : (
                  <span>SIGN IN &gt;</span>
                )}
              </button>

              <div className="text-center mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col gap-2">
                <div>
                  New to WorldVest Capital?{' '}
                  <button 
                    type="button" 
                    onClick={() => setIsRegisterMode(true)}
                    className="text-[#C59B4E] font-black hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
