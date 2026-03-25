import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Users, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';
import api from '../config/api';

const JoinTeamPage = () => {
  const { teamSlug } = useParams();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('register'); // 'register' or 'login'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [checkingTeam, setCheckingTeam] = useState(true);

  useEffect(() => {
    fetchTeamInfo();
  }, [teamSlug]);

  useEffect(() => {
    if (user && teamInfo) {
      handleAutoJoin();
    }
  }, [user, teamInfo]);

  const fetchTeamInfo = async () => {
    try {
      const response = await api.get(`/teams/join-info/${teamSlug}`);
      setTeamInfo(response.data);
    } catch (error) {
      setTeamInfo(null);
    } finally {
      setCheckingTeam(false);
    }
  };

  const handleAutoJoin = async () => {
    try {
      setLoading(true);
      await api.post(`/teams/join/${teamSlug}`);
      setJoined(true);
      toast({ title: 'Welcome!', description: `You've joined ${teamInfo?.name || teamSlug}!` });
      setTimeout(() => navigate('/workspaces'), 2000);
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail === 'Already a member of this team') {
        setJoined(true);
        toast({ title: 'Welcome back!', description: 'You are already a member.' });
        setTimeout(() => navigate('/workspaces'), 1500);
      } else {
        toast({ title: 'Error', description: detail || 'Failed to join team', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      // After auth, useEffect will trigger handleAutoJoin
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Authentication failed',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (checkingTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!teamInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <img src="/acuity-logo.png" alt="Acuity Professional" className="h-12 object-contain mx-auto mb-4" />
            <CardTitle className="text-xl">Team Not Found</CardTitle>
            <CardDescription>The invite link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="bg-gradient-to-r from-amber-500 to-orange-600">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already logged in → show joining state
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <img src="/acuity-logo.png" alt="Acuity Professional" className="h-12 object-contain mx-auto mb-4" />
            {joined ? (
              <>
                <div className="mx-auto mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                </div>
                <CardTitle className="text-xl text-green-700" data-testid="join-success">
                  You've joined {teamInfo.name}!
                </CardTitle>
                <CardDescription>Redirecting to your workspace...</CardDescription>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                <CardTitle className="text-xl">Joining {teamInfo.name}...</CardTitle>
              </>
            )}
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Not logged in → show register/login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="join-team-card">
        <CardHeader className="text-center">
          <img src="/acuity-logo.png" alt="Acuity Professional" className="h-12 object-contain mx-auto mb-2" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl" data-testid="join-team-title">
            Join {teamInfo.name}
          </CardTitle>
          <CardDescription>
            {teamInfo.member_count} member{teamInfo.member_count !== 1 ? 's' : ''} already on this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="join-name-input"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="join-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="join-password-input"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              disabled={loading}
              data-testid="join-submit-btn"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {mode === 'register' ? 'Sign Up & Join Team' : 'Sign In & Join Team'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            {mode === 'register' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-orange-600 hover:underline font-medium"
                  data-testid="switch-to-login"
                >
                  Sign in instead
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-orange-600 hover:underline font-medium"
                  data-testid="switch-to-register"
                >
                  Create one
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinTeamPage;
