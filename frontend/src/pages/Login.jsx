import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // 2FA state
  const [stage, setStage] = useState('credentials'); // 'credentials' | '2fa'
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requires_2fa) {
        setChallengeToken(result.challenge_token);
        setStage('2fa');
        toast({ title: 'Enter 2FA code', description: 'Open your authenticator app' });
      } else {
        toast({ title: 'Success', description: 'Logged in successfully!' });
        navigate('/workspaces');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to login',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (twoFactorCode.length < 6) return;
    setLoading(true);
    try {
      await verify2FA(challengeToken, twoFactorCode.trim());
      toast({ title: 'Success', description: 'Logged in successfully!' });
      navigate('/workspaces');
    } catch (error) {
      toast({
        title: 'Invalid code',
        description: error.response?.data?.detail || 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStage('credentials');
    setTwoFactorCode('');
    setChallengeToken('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center mb-4">
            <img src="/acuity-logo.png" alt="Acuity Professional" className="h-12 object-contain" data-testid="login-logo" />
          </div>
          {stage === 'credentials' ? (
            <>
              <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
              <CardDescription className="text-center">
                Sign in to your Acuity Work Management account
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle className="text-2xl text-center">Two-factor verification</CardTitle>
              <CardDescription className="text-center">
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {stage === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-orange-600 hover:text-orange-700 font-medium" data-testid="forgot-password-link">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          )}

          {stage === '2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-4" data-testid="login-2fa-form">
              <div className="space-y-2">
                <Label htmlFor="2fa-code">6-digit code</Label>
                <Input
                  id="2fa-code"
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 8))}
                  placeholder="123456"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  data-testid="login-2fa-code"
                />
                <p className="text-xs text-gray-500 text-center">
                  You can also use a backup code if you've lost access to your app.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                disabled={loading || twoFactorCode.length < 6}
                data-testid="login-2fa-submit"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBack}
                data-testid="login-2fa-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </form>
          )}
          {stage === 'credentials' && (
            <div className="mt-4 text-center text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-orange-600 hover:text-orange-700 font-medium">
                Sign up
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
