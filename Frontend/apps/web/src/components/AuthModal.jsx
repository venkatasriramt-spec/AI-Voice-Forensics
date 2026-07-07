import React, { useState, useEffect } from 'react';
import { Shield, Mail, Lock, Loader2, Eye, EyeOff, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password Strength State
  const [passwordStrength, setPasswordStrength] = useState({ 
    level: 'weak', 
    score: 0, 
    feedback: '', 
    reqs: { length: false, upper: false, lower: false, number: false, special: false, uncommon: false } 
  });
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(true);

  // CAPTCHA State
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(null);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  
  const { login, signup, signInWithGoogle } = useAuth();

  const generateCaptcha = () => {
    const operators = ['+', '-', '×'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1 = Math.floor(Math.random() * 20) + 1;
    let num2 = Math.floor(Math.random() * 20) + 1;

    // Ensure positive results for subtraction
    if (operator === '-' && num1 < num2) {
      [num1, num2] = [num2, num1];
    }

    let answer;
    if (operator === '+') answer = num1 + num2;
    else if (operator === '-') answer = num1 - num2;
    else if (operator === '×') answer = num1 * num2;

    setCaptchaQuestion(`What is ${num1} ${operator} ${num2}?`);
    setCaptchaAnswer(answer);
    setUserCaptchaInput('');
    setIsCaptchaVerified(false);
    setCaptchaError(false);
  };

  useEffect(() => {
    if (isOpen) {
      generateCaptcha();
    }
  }, [isOpen]);

  const handleCaptchaChange = (e) => {
    const val = e.target.value;
    setUserCaptchaInput(val);
    
    if (val === '') {
      setIsCaptchaVerified(false);
      setCaptchaError(false);
      return;
    }

    const numVal = parseInt(val, 10);
    if (numVal === captchaAnswer) {
      setIsCaptchaVerified(true);
      setCaptchaError(false);
    } else {
      setIsCaptchaVerified(false);
      setCaptchaError(true);
    }
  };

  const calculatePasswordStrength = (val) => {
    const reqs = {
      length: val.length >= 12,
      upper: /[A-Z]/.test(val),
      lower: /[a-z]/.test(val),
      number: /[0-9]/.test(val),
      special: /[@#$*!&%]/.test(val),
      uncommon: !/(password|1234|qwerty|asdf)/i.test(val) && val.length > 0
    };

    let score = 0;
    if (val.length >= 12) score += 30;
    else if (val.length >= 8) score += 15;
    
    if (reqs.upper) score += 15;
    if (reqs.lower) score += 15;
    if (reqs.number) score += 15;
    if (reqs.special) score += 15;
    
    if (val.length >= 16) score += 10;
    if (!reqs.uncommon) score = Math.max(0, score - 30); // Penalty for common words

    let level = 'weak';
    let feedback = 'Weak Password';
    
    if (val.length <= 7 || (!reqs.upper && !reqs.special && !reqs.uncommon)) {
      level = 'weak';
      feedback = 'Weak Password';
      score = Math.min(score, 30);
    } else if (val.length >= 12 && reqs.upper && reqs.lower && reqs.number && reqs.special && reqs.uncommon) {
      level = 'strong';
      feedback = 'Strong Password';
      score = Math.max(score, 80);
    } else {
      level = 'medium';
      feedback = 'Medium Password';
      if (score > 79) score = 79;
      if (score < 40) score = 40;
    }

    if (val.length === 0) {
      score = 0;
      level = 'weak';
      feedback = '';
    }

    return { level, score, feedback, reqs };
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    setPasswordStrength(calculatePasswordStrength(val));
  };

  const resetState = () => {
    setEmail('');
    setPassword('');
    setError('');
    setIsSubmitting(false);
    setShowPassword(false);
    setPasswordStrength({ level: 'weak', score: 0, feedback: '', reqs: { length: false, upper: false, lower: false, number: false, special: false, uncommon: false } });
    generateCaptcha();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const getErrorMessage = (err) => {
    const message = err?.message || '';
    if (message.includes('auth/email-already-in-use')) {
      return 'Account creation failed. Email is already in use.';
    }
    if (message.includes('auth/weak-password')) {
      return 'Password is too weak (min 8 characters).';
    }
    if (message.includes('auth/invalid-credential')) {
      return 'Invalid email or password';
    }
    return message || 'An error occurred. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!isLogin && passwordStrength.level === 'weak') {
      setError('Please use a stronger passphrase.');
      return;
    }

    if (!isCaptchaVerified) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const RequirementCheck = ({ met, text }) => (
    <div className="flex items-center gap-1.5 text-xs">
      {met ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-muted-foreground/50" />}
      <span className={met ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] border-primary/20 bg-background/95 backdrop-blur-xl p-0 overflow-hidden shadow-[0_0_40px_rgba(0,217,255,0.1)]">
        
        {/* Decorative Top Border Glow */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        <div className="p-6">
          <DialogHeader className="mb-6 space-y-3 text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-xl border border-primary/20 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(0,217,255,0.15)]">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {isLogin ? 'Secure Gateway' : 'Initialize Access'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {isLogin 
                ? 'Authenticate to access the Threat Analysis Engine.' 
                : 'Create your operational credentials to proceed.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-card border-border/50 focus-visible:ring-primary/50 text-foreground"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Passphrase
                </Label>
                {!isLogin && (
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordRequirements(!showPasswordRequirements)} 
                    className="text-[10px] uppercase tracking-wider font-mono text-primary/80 hover:text-primary transition-colors"
                  >
                    {showPasswordRequirements ? 'Hide Guidelines' : 'Show Guidelines'}
                  </button>
                )}
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="pl-9 pr-9 bg-card border-border/50 focus-visible:ring-primary/50 text-foreground transition-all"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Real-time Strength Indicator (Signup Only) */}
              {!isLogin && (password || showPasswordRequirements) && (
                <div className="mt-3 p-3 bg-card/30 border border-border/40 rounded-xl space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-mono">
                      <span className={`font-bold transition-colors duration-300 ${
                        !password ? 'text-muted-foreground' :
                        passwordStrength.level === 'weak' ? 'text-red-500' : 
                        passwordStrength.level === 'medium' ? 'text-yellow-500' : 
                        'text-green-500'
                      }`}>
                        {password ? passwordStrength.feedback : 'Awaiting Input'}
                      </span>
                      <span className="text-muted-foreground">{password.length} chars</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          !password ? 'bg-transparent' :
                          passwordStrength.level === 'weak' ? 'bg-red-500' : 
                          passwordStrength.level === 'medium' ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`} 
                        style={{ width: `${Math.min(100, passwordStrength.score)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 gap-x-1 pt-1">
                    <RequirementCheck met={passwordStrength.reqs.length} text="12+ Characters" />
                    <RequirementCheck met={passwordStrength.reqs.uncommon} text="No common words" />
                    <RequirementCheck met={passwordStrength.reqs.upper} text="Uppercase (A-Z)" />
                    <RequirementCheck met={passwordStrength.reqs.lower} text="Lowercase (a-z)" />
                    <RequirementCheck met={passwordStrength.reqs.number} text="Numbers (0-9)" />
                    <RequirementCheck met={passwordStrength.reqs.special} text="Symbol (@#$*!)" />
                  </div>
                </div>
              )}
            </div>

            {/* CAPTCHA Section */}
            <div className="space-y-3 p-4 bg-card/40 border border-border/50 rounded-xl mt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-foreground tracking-wide">
                  {captchaQuestion}
                </Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={generateCaptcha} 
                  aria-label="Generate new CAPTCHA challenge"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="relative">
                <Input
                  type="number"
                  value={userCaptchaInput}
                  onChange={handleCaptchaChange}
                  placeholder="Enter your answer"
                  aria-label="Enter CAPTCHA answer"
                  className={`bg-background transition-colors ${
                    isCaptchaVerified 
                      ? 'border-green-500 focus-visible:ring-green-500/50' 
                      : captchaError 
                        ? 'border-destructive focus-visible:ring-destructive/50' 
                        : 'border-border/50 focus-visible:ring-primary/50'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              
              {isCaptchaVerified && (
                <div className="flex items-center gap-1.5 text-sm text-green-500 font-medium">
                  <Check className="w-4 h-4" />
                  <span>✓ Verified as human</span>
                </div>
              )}
              
              {captchaError && !isCaptchaVerified && userCaptchaInput !== '' && (
                <div className="flex items-center gap-1.5 text-sm text-destructive font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>Incorrect answer. Please try again.</span>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-2 transition-all duration-200 shadow-[0_0_15px_rgba(0,217,255,0.2)]"
              disabled={isSubmitting || (!isLogin && passwordStrength.level === 'weak') || !isCaptchaVerified}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isLogin ? 'Authenticate Session' : 'Create Credentials'}
            </Button>
          </form>

          <div className="mt-6 relative flex items-center">
            <div className="flex-grow border-t border-border/40" />
            <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs font-mono uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-border/40" />
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full bg-card hover:bg-card/80 border-border/50 text-foreground transition-all duration-200"
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Don't have credentials? " : "Already authenticated? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                if (isLogin) {
                  setShowPasswordRequirements(true);
                }
                generateCaptcha();
              }}
              className="text-primary hover:text-primary/80 font-medium hover:underline focus:outline-none transition-colors"
            >
              {isLogin ? 'Request Access' : 'Sign In'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;