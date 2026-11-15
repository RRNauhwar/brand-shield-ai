import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-white">Sign in to BrandShield AI</h2>
        <p className="text-xs text-slate-400 mt-1">
          Access your brand intelligence and compliance workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg font-medium font-mono">
            {error}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Password
            </label>
            <span className="text-[11px] text-brand-400 hover:text-brand-300 cursor-pointer">
              Forgot password?
            </span>
          </div>
          <Input
            type="password"
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full mt-2"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-surface-border text-center">
        <p className="text-xs text-slate-400">
          Don't have a workspace yet?{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Create an organization
          </Link>
        </p>
      </div>
    </div>
  );
};
