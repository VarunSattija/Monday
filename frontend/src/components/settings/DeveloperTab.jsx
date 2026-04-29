import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Plus, KeyRound, Copy, Trash2, Check, Code2 } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import api from '../../config/api';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const DeveloperTab = () => {
  const { workspaces } = useWorkspace();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scope, setScope] = useState('user');
  const [workspaceId, setWorkspaceId] = useState('');
  const [newKey, setNewKey] = useState(null); // shown once after creation
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api-keys');
      setKeys(res.data);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const resetForm = () => {
    setName('');
    setScope('user');
    setWorkspaceId('');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (scope === 'workspace' && !workspaceId) {
      toast({ title: 'Select a workspace', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const res = await api.post('/api-keys', {
        name: name.trim(),
        scope,
        workspace_id: scope === 'workspace' ? workspaceId : null,
      });
      setNewKey(res.data);
      setShowCreate(false);
      resetForm();
      fetchKeys();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.detail || 'Failed to create key', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId) => {
    if (!window.confirm('Revoke this key? Any scripts using it will stop working immediately.')) return;
    try {
      await api.delete(`/api-keys/${keyId}`);
      fetchKeys();
      toast({ title: 'Key revoked' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to revoke key', variant: 'destructive' });
    }
  };

  const copyKey = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const apiBase = `${process.env.REACT_APP_BACKEND_URL}/api`;
  const sampleCurl = `curl -X POST "${apiBase}/v1/boards/<BOARD_ID>/items" \\
  -H "Authorization: Bearer ak_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Candidate: Jane Doe",
    "column_values": {
      "<column_id>": "value"
    }
  }'`;

  const samplePython = `import requests

API = "${apiBase}/v1"
HEADERS = {"Authorization": "Bearer ak_...", "Content-Type": "application/json"}

# 1. List boards visible to this key
boards = requests.get(f"{API}/boards", headers=HEADERS).json()

# 2. Get a specific board's columns + groups
board = requests.get(f"{API}/boards/{boards[0]['id']}", headers=HEADERS).json()

# 3. Create an item from your CV parser output
payload = {
    "name": parsed_cv["candidate_name"],
    "column_values": {
        "<email_column_id>": parsed_cv["email"],
        "<phone_column_id>": parsed_cv["phone"],
    },
}
res = requests.post(
    f"{API}/boards/{board['id']}/items",
    json=payload,
    headers=HEADERS,
)
print(res.json())`;

  return (
    <div className="space-y-6" data-testid="developer-tab">
      {/* New key dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Personal Access Token</DialogTitle>
            <DialogDescription>
              Tokens authenticate your scripts as you. Keep them secret.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Token Name</Label>
              <Input
                placeholder="e.g. CV Parser Script"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="api-key-name-input"
              />
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger data-testid="api-key-scope-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User — access all my boards</SelectItem>
                  <SelectItem value="workspace">Workspace — limit to one workspace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === 'workspace' && (
              <div>
                <Label>Workspace</Label>
                <Select value={workspaceId} onValueChange={setWorkspaceId}>
                  <SelectTrigger data-testid="api-key-workspace-select">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              data-testid="api-key-create-btn"
            >
              {creating ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New key reveal dialog */}
      <Dialog open={!!newKey} onOpenChange={(o) => { if (!o) setNewKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token Generated</DialogTitle>
            <DialogDescription>
              Copy this token now — you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-gray-900 text-green-300 font-mono text-xs p-3 rounded-lg break-all" data-testid="api-key-reveal">
              {newKey?.key}
            </div>
            <Button
              onClick={() => copyKey(newKey?.key)}
              className="w-full"
              variant={copied ? 'default' : 'outline'}
              data-testid="api-key-copy-btn"
            >
              {copied ? <><Check className="h-4 w-4 mr-2" /> Copied</> : <><Copy className="h-4 w-4 mr-2" /> Copy to clipboard</>}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys list */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-orange-500" />
              Personal Access Tokens
            </CardTitle>
            <CardDescription>
              Use these tokens to authenticate external scripts (e.g. CV parser) with the Acuity API.
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            data-testid="new-api-key-btn"
          >
            <Plus className="h-4 w-4 mr-2" /> New Token
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-6">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No tokens yet. Generate one to get started.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${k.revoked ? 'opacity-50 bg-gray-50' : 'bg-white'}`}
                  data-testid={`api-key-row-${k.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{k.name}</span>
                      <Badge variant="outline" className="text-xs">{k.scope}</Badge>
                      {k.revoked && <Badge variant="destructive" className="text-xs">Revoked</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-1">{k.key_prefix}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!k.revoked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(k.id)}
                      className="text-red-600 hover:bg-red-50"
                      data-testid={`api-key-revoke-${k.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-orange-500" />
            API Reference
          </CardTitle>
          <CardDescription>
            Drop-in endpoints for your CV parser or any external integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-gray-500">Base URL</Label>
            <div className="bg-gray-50 p-2 rounded mt-1 font-mono text-sm break-all">{apiBase}/v1</div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-gray-500">Endpoints</Label>
            <ul className="mt-1 space-y-1 text-sm">
              <li><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">GET /api-keys/whoami</code> — verify your token</li>
              <li><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">GET /v1/boards</code> — list boards</li>
              <li><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">GET /v1/boards/{'{board_id}'}</code> — board schema (columns, groups)</li>
              <li><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">POST /v1/boards/{'{board_id}'}/items</code> — create an item</li>
            </ul>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-gray-500">Quick start (cURL)</Label>
            <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-lg overflow-auto mt-1" data-testid="api-doc-curl">{sampleCurl}</pre>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-gray-500">Python example (CV parser flow)</Label>
            <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded-lg overflow-auto mt-1" data-testid="api-doc-python">{samplePython}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeveloperTab;
