import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, User, Building2, CheckCircle, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      await register(email, password, fullName, orgName || 'My Brand Workspace');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-white">Create your workspace</h2>
        <p className="text-xs text-slate-400 mt-1">
          Set up automated brand intelligence for your organization
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg font-medium font-mono">
            {error}
          </div>
        )}

        <Input
          label="Full Name"
          type="text"
          placeholder="e.g. Jane Doe"
          leftIcon={<User className="w-4 h-4 text-slate-500" />}
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />

        <Input
          label="Work Email"
          type="email"
          placeholder="name@company.com"
          leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <Input
          label="Organization / Brand Name"
          type="text"
          placeholder="e.g. Acme Corporation"
          leftIcon={<Building2 className="w-4 h-4 text-slate-500" />}
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          required
        />

        <Input
          label="Password (min 8 characters)"
          type="password"
          placeholder="••••••••••••"
          leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <div className="p-3 bg-surface-2/60 border border-surface-border rounded-xl text-xs text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Full Enterprise AI Governance Capabilities</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Powered by Gemini 2.5 Flash, 1536-dim vector RAG, and multi-channel campaign consistency analysis.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full mt-2"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Create Workspace
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-surface-border text-center">
        <p className="text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
