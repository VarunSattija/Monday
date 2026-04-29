import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Shield, Copy, Check, AlertCircle, Smartphone } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import api from '../../config/api';

const TwoFactorSection = () => {
  const [status, setStatus] = useState({ enabled: false, backup_codes_remaining: 0 });
  const [setupStep, setSetupStep] = useState(null); // null | 'qr' | 'verify' | 'codes'
  const [qrData, setQrData] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.get('/auth/2fa/status');
      setStatus(r.data);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const startSetup = async () => {
    try {
      setBusy(true);
      const r = await api.post('/auth/2fa/setup');
      setQrData(r.data.qr_code);
      setSecret(r.data.secret);
      setCode('');
      setSetupStep('qr');
    } catch (e) {
      toast({
        title: 'Error',
        description: e.response?.data?.detail || 'Could not start 2FA setup',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      toast({ title: 'Invalid code', description: 'Enter the 6-digit code from your app', variant: 'destructive' });
      return;
    }
    try {
      setBusy(true);
      const r = await api.post('/auth/2fa/enable', { code: code.trim() });
      setBackupCodes(r.data.backup_codes);
      setSetupStep('codes');
      fetchStatus();
      toast({ title: '2FA enabled', description: 'Two-factor authentication is now active' });
    } catch (e) {
      toast({
        title: 'Verification failed',
        description: e.response?.data?.detail || 'Invalid code',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const closeSetup = () => {
    setSetupStep(null);
    setQrData(null);
    setSecret('');
    setCode('');
    setBackupCodes([]);
    setCopiedCodes(false);
  };

  const handleDisable = async () => {
    try {
      setBusy(true);
      await api.post('/auth/2fa/disable', {
        password: disablePassword,
        code: disableCode.trim(),
      });
      toast({ title: '2FA disabled' });
      setShowDisable(false);
      setDisablePassword('');
      setDisableCode('');
      fetchStatus();
    } catch (e) {
      toast({
        title: 'Error',
        description: e.response?.data?.detail || 'Failed to disable 2FA',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({ title: 'Secret copied' });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <Card data-testid="twofa-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-500" />
          Two-Factor Authentication
          {status.enabled && <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!status.enabled ? (
          <Button
            onClick={startSetup}
            disabled={busy}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            data-testid="enable-2fa-btn"
          >
            <Smartphone className="h-4 w-4 mr-2" /> Enable 2FA
          </Button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-gray-600">
              2FA is active · {status.backup_codes_remaining} backup codes remaining.
            </p>
            <Button variant="outline" onClick={() => setShowDisable(true)} data-testid="disable-2fa-btn">
              Disable
            </Button>
          </div>
        )}
      </CardContent>

      {/* Setup dialog: step QR */}
      <Dialog open={setupStep === 'qr'} onOpenChange={(o) => { if (!o) closeSetup(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR code</DialogTitle>
            <DialogDescription>
              Open your authenticator app and scan the code below.
            </DialogDescription>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-3">
              <img src={qrData} alt="2FA QR" className="w-56 h-56" data-testid="twofa-qr" />
              <div className="w-full">
                <Label className="text-xs text-gray-500">Or enter this secret manually:</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input readOnly value={secret} className="font-mono text-sm" data-testid="twofa-secret" />
                  <Button variant="outline" size="sm" onClick={copySecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeSetup}>Cancel</Button>
            <Button
              onClick={() => setSetupStep('verify')}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              data-testid="twofa-next-btn"
            >
              Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup dialog: step verify */}
      <Dialog open={setupStep === 'verify'} onOpenChange={(o) => { if (!o) closeSetup(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify code</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app to confirm setup.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>6-digit code</Label>
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="font-mono text-lg tracking-widest text-center"
              data-testid="twofa-code-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupStep('qr')}>Back</Button>
            <Button
              onClick={verifyAndEnable}
              disabled={busy || code.length !== 6}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              data-testid="twofa-verify-btn"
            >
              {busy ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup dialog: step backup codes */}
      <Dialog open={setupStep === 'codes'} onOpenChange={(o) => { if (!o) closeSetup(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" /> 2FA Enabled
            </DialogTitle>
            <DialogDescription>
              Save these backup codes — they will not be shown again. Each code can be used once if you lose access to your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm" data-testid="backup-codes">
              {backupCodes.map((c) => (
                <div key={c} className="bg-white px-2 py-1 rounded border">{c}</div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 p-2 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Store these somewhere safe (password manager).
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyBackupCodes} data-testid="copy-backup-codes-btn">
              {copiedCodes ? <><Check className="h-4 w-4 mr-2" /> Copied</> : <><Copy className="h-4 w-4 mr-2" /> Copy all</>}
            </Button>
            <Button onClick={closeSetup}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disable 2FA</DialogTitle>
            <DialogDescription>
              Confirm with your password and a 2FA code (or backup code) to turn off 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                data-testid="disable-2fa-password"
              />
            </div>
            <div>
              <Label>2FA code or backup code</Label>
              <Input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="123456 or BACKUP-CODE"
                data-testid="disable-2fa-code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisable(false)}>Cancel</Button>
            <Button
              onClick={handleDisable}
              disabled={busy || !disablePassword || !disableCode}
              variant="destructive"
              data-testid="confirm-disable-2fa-btn"
            >
              {busy ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TwoFactorSection;
