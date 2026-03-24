import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Building2 } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import api from '../config/api';

const CompanySelection = () => {
  const [selectedCompany, setSelectedCompany] = useState('Acuity-Professional');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const companies = [
    { id: 'acuity-professional', name: 'Acuity-Professional', description: 'Default company for Acuity users' },
  ];

  const handleContinue = async () => {
    setLoading(true);
    try {
      await api.post(`/auth/select-company?company_name=${selectedCompany}`);
      toast({ title: 'Success', description: 'Company selected successfully!' });
      navigate('/workspaces');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to select company',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <img src="/acuity-logo.png" alt="Acuity Professional" className="h-16 object-contain" data-testid="company-selection-logo" />
          </div>
          <CardTitle className="text-2xl text-center">Select Your Company</CardTitle>
          <CardDescription className="text-center">
            Choose the company you belong to. This will determine your team and workspace access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedCompany} onValueChange={setSelectedCompany}>
            {companies.map((company) => (
              <div
                key={company.id}
                className={`flex items-center space-x-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedCompany === company.name
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => setSelectedCompany(company.name)}
              >
                <RadioGroupItem value={company.name} id={company.id} />
                <Label htmlFor={company.id} className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-semibold text-lg">{company.name}</p>
                    <p className="text-sm text-gray-500">{company.description}</p>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> By selecting a company, you'll be added to their team and can collaborate
              on boards with other team members. Your role and permissions will be managed by team admins.
            </p>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Continue to Workspace'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySelection;
