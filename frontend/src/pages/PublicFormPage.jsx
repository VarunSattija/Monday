import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Render an input for a single column type
const FieldInput = ({ col, value, onChange }) => {
  const id = `field-${col.id}`;
  switch (col.type) {
    case 'text':
      return (
        <Textarea
          id={id}
          rows={2}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={col.required}
          data-testid={`public-field-${col.id}`}
        />
      );
    case 'numbers':
      return (
        <Input
          id={id}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          required={col.required}
          data-testid={`public-field-${col.id}`}
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={col.required}
          data-testid={`public-field-${col.id}`}
        />
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
            data-testid={`public-field-${col.id}`}
          />
          <span className="text-sm text-gray-600">Check if applicable</span>
        </div>
      );
    case 'link':
      return (
        <Input
          id={id}
          type="url"
          placeholder="https://"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={col.required}
          data-testid={`public-field-${col.id}`}
        />
      );
    case 'status':
    case 'priority': {
      const opts = (col.options || []).filter((o) => o.label && o.label.trim());
      return (
        <Select value={value?.label || value || ''} onValueChange={(label) => {
          const opt = opts.find((o) => o.label === label);
          onChange(opt ? { label: opt.label, color: opt.color } : label);
        }}>
          <SelectTrigger data-testid={`public-field-${col.id}`}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {opts.map((o) => (
              <SelectItem key={o.id} value={o.label}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case 'tags': {
      // Comma-separated tags
      return (
        <Input
          id={id}
          placeholder="tag1, tag2"
          value={Array.isArray(value) ? value.join(', ') : value || ''}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          data-testid={`public-field-${col.id}`}
        />
      );
    }
    default:
      return (
        <Input
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={col.required}
          data-testid={`public-field-${col.id}`}
        />
      );
  }
};

const PublicFormPage = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState('');
  const [values, setValues] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/forms/public/${formId}`);
      setForm(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Form not available');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await axios.post(`${API_BASE}/forms/public/${formId}/submit`, {
        name: name.trim(),
        column_values: values,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnother = () => {
    setSuccess(false);
    setName('');
    setValues({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <p className="text-gray-700 font-medium">{error || 'Form not available'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/acuity-logo.png" alt="Acuity Professional" className="h-9 object-contain" />
        </div>

        <Card className="shadow-xl border-orange-100">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-xl">
            <CardTitle data-testid="public-form-title">{form.name}</CardTitle>
            {form.description && (
              <CardDescription className="text-orange-50">{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {success ? (
              <div className="text-center py-10" data-testid="public-form-success">
                <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-gray-800">{form.success_message}</p>
                <Button
                  className="mt-6"
                  variant="outline"
                  onClick={handleAnother}
                  data-testid="submit-another-btn"
                >
                  Submit another response
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label>
                    Item Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Application from John Doe"
                    data-testid="public-form-name"
                  />
                </div>
                {(form.columns || []).map((col) => (
                  <div key={col.id}>
                    <Label>
                      {col.title}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {col.description && (
                      <p className="text-xs text-gray-500 mb-1">{col.description}</p>
                    )}
                    <FieldInput
                      col={col}
                      value={values[col.id]}
                      onChange={(v) => setValues({ ...values, [col.id]: v })}
                    />
                  </div>
                ))}

                {error && (
                  <p className="text-sm text-red-600" data-testid="public-form-error">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  data-testid="public-form-submit"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
                <p className="text-xs text-center text-gray-400">
                  Powered by Acuity Professional
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicFormPage;
