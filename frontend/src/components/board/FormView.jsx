import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Copy, Trash2, ExternalLink, Settings, Save, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from '../../hooks/use-toast';
import api from '../../config/api';

const FormView = ({ board, groups }) => {
  const [forms, setForms] = useState([]);
  const [activeForm, setActiveForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchForms = useCallback(async () => {
    if (!board?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/forms/board/${board.id}`);
      setForms(res.data);
      if (res.data.length > 0 && !activeForm) {
        setActiveForm(res.data[0]);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load forms', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [board?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleCreateForm = async () => {
    try {
      // Default field config: all visible, name required
      const fields = (board.columns || []).map((c) => ({
        column_id: c.id,
        hidden: false,
        required: false,
        label: c.title,
      }));
      const res = await api.post('/forms', {
        board_id: board.id,
        name: `${board.name} Form`,
        description: '',
        group_id: groups?.[0]?.id || null,
        fields,
      });
      setForms([res.data, ...forms]);
      setActiveForm(res.data);
      toast({ title: 'Form created', description: 'Your shareable form is ready' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create form', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!activeForm) return;
    try {
      setSaving(true);
      const res = await api.put(`/forms/${activeForm.id}`, {
        name: activeForm.name,
        description: activeForm.description,
        group_id: activeForm.group_id,
        fields: activeForm.fields,
        success_message: activeForm.success_message,
        enabled: activeForm.enabled,
      });
      setActiveForm(res.data);
      setForms(forms.map((f) => (f.id === res.data.id ? res.data : f)));
      toast({ title: 'Saved', description: 'Form configuration updated' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save form', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (formId) => {
    if (!window.confirm('Delete this form? Anyone with the link will lose access.')) return;
    try {
      await api.delete(`/forms/${formId}`);
      const remaining = forms.filter((f) => f.id !== formId);
      setForms(remaining);
      setActiveForm(remaining[0] || null);
      toast({ title: 'Deleted' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete form', variant: 'destructive' });
    }
  };

  const updateField = (columnId, patch) => {
    setActiveForm({
      ...activeForm,
      fields: activeForm.fields.map((f) =>
        f.column_id === columnId ? { ...f, ...patch } : f
      ),
    });
  };

  const getPublicUrl = (formId) =>
    `${window.location.origin}/f/${formId}`;

  const copyLink = (formId) => {
    navigator.clipboard.writeText(getPublicUrl(formId));
    toast({ title: 'Link copied', description: 'Share this link to collect submissions' });
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading forms...</div>;
  }

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50" data-testid="form-view">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Forms list / selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {forms.map((f) => (
            <Button
              key={f.id}
              variant={activeForm?.id === f.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveForm(f)}
              className={activeForm?.id === f.id ? 'bg-orange-500 hover:bg-orange-600' : ''}
              data-testid={`form-tab-${f.id}`}
            >
              {f.name}
              {!f.enabled && <Badge variant="secondary" className="ml-2 text-xs">Disabled</Badge>}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateForm}
            data-testid="create-form-btn"
          >
            <Plus className="h-4 w-4 mr-1" /> New Form
          </Button>
        </div>

        {!activeForm && (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
              <p className="text-gray-500 mb-4">
                Create a public form to collect submissions directly into this board.
              </p>
              <Button
                onClick={handleCreateForm}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                data-testid="empty-create-form-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first form
              </Button>
            </CardContent>
          </Card>
        )}

        {activeForm && (
          <>
            {/* Public link banner */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Public Link</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        readOnly
                        value={getPublicUrl(activeForm.id)}
                        className="font-mono text-sm"
                        data-testid="form-public-url"
                      />
                      <Button variant="outline" size="sm" onClick={() => copyLink(activeForm.id)} data-testid="copy-form-link-btn">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(getPublicUrl(activeForm.id), '_blank')} data-testid="open-form-btn">
                        <ExternalLink className="h-4 w-4 mr-1" /> Preview
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={activeForm.enabled}
                        onCheckedChange={(v) => setActiveForm({ ...activeForm, enabled: v })}
                        data-testid="form-enabled-switch"
                      />
                      <span className="text-sm">{activeForm.enabled ? 'Live' : 'Disabled'}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(activeForm.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Form Settings</CardTitle>
                <CardDescription>Configure how the form looks and where submissions land.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Form Title</Label>
                    <Input
                      value={activeForm.name}
                      onChange={(e) => setActiveForm({ ...activeForm, name: e.target.value })}
                      data-testid="form-title-input"
                    />
                  </div>
                  <div>
                    <Label>Submit to Group</Label>
                    <Select
                      value={activeForm.group_id || ''}
                      onValueChange={(v) => setActiveForm({ ...activeForm, group_id: v })}
                    >
                      <SelectTrigger data-testid="form-group-select">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {(groups || []).map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={activeForm.description || ''}
                    onChange={(e) => setActiveForm({ ...activeForm, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Success Message</Label>
                  <Input
                    value={activeForm.success_message || ''}
                    onChange={(e) => setActiveForm({ ...activeForm, success_message: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Field configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Fields</CardTitle>
                <CardDescription>
                  Toggle visibility and required state per column. The Item Name is always required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(board.columns || []).map((col) => {
                    const cfg = activeForm.fields.find((f) => f.column_id === col.id) || {
                      column_id: col.id,
                      hidden: false,
                      required: false,
                      label: col.title,
                    };
                    return (
                      <div
                        key={col.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                        data-testid={`form-field-${col.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{col.title}</span>
                            <Badge variant="outline" className="text-xs">{col.type}</Badge>
                          </div>
                          <Input
                            placeholder="Custom label (optional)"
                            value={cfg.label || ''}
                            onChange={(e) => updateField(col.id, { label: e.target.value })}
                            className="mt-2 h-7 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!cfg.hidden}
                              onCheckedChange={(v) => updateField(col.id, { hidden: !v })}
                              data-testid={`field-visible-${col.id}`}
                            />
                            <span className="text-xs text-gray-600">Visible</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={cfg.required}
                              disabled={cfg.hidden}
                              onCheckedChange={(v) => updateField(col.id, { required: v })}
                              data-testid={`field-required-${col.id}`}
                            />
                            <span className="text-xs text-gray-600">Required</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(getPublicUrl(activeForm.id), '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" /> Preview
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    data-testid="save-form-btn"
                  >
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default FormView;
