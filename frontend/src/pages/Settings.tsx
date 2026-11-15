import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Avatar } from '../components/ui/Avatar';
import {
  Building2,
  User,
  Bell,
  Key,
  Save,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { currentOrg, updateOrg, userRole } = useOrganisation();

  // Org settings state
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [orgDesc, setOrgDesc] = useState(currentOrg?.description || '');
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // User profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notification toggles
  const [notifAuditComplete, setNotifAuditComplete] = useState(true);
  const [notifReviewRequest, setNotifReviewRequest] = useState(true);
  const [notifCriticalAlert, setNotifCriticalAlert] = useState(true);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsSavingOrg(true);
    try {
      await updateOrg({ name: orgName, description: orgDesc });
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    setTimeout(() => {
      updateUser({
        ...user,
        full_name: fullName,
        email
      });
      setIsSavingProfile(false);
      toast.success('Profile updated successfully');
    }, 400);
  };

  // API Key state for the current workspace
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem(`brandshield_api_key_${currentOrg?.id}`) || null;
  });

  const handleGenerateApiKey = () => {
    if (!currentOrg) return;
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const newKey = `bsh_live_${currentOrg.id.slice(0, 8)}_${randomHex}`;
    localStorage.setItem(`brandshield_api_key_${currentOrg.id}`, newKey);
    setApiKey(newKey);
    toast.success('Generated new live workspace API Key!');
  };

  const handleRevokeApiKey = () => {
    if (!currentOrg) return;
    if (window.confirm('Are you sure you want to revoke this API key? Any active CI/CD or CMS integrations using it will stop working.')) {
      localStorage.removeItem(`brandshield_api_key_${currentOrg.id}`);
      setApiKey(null);
      toast.success('API key revoked successfully.');
    }
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    toast.success('Copied API Key to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
            System & Workspace Configuration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Workspace & Account Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure organisation identity, user profile details, and compliance notifications.
        </p>
      </div>

      {/* Organisation Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            <div>
              <CardTitle>Organisation Profile</CardTitle>
              <CardDescription>Brand identity and metadata for this workspace</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleSaveOrg} className="space-y-4">
            <Input
              label="Organisation Name"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              required
              disabled={userRole !== 'admin'}
            />

            <Textarea
              label="Description & Industry Context"
              value={orgDesc}
              onChange={e => setOrgDesc(e.target.value)}
              rows={3}
              disabled={userRole !== 'admin'}
            />

            {userRole === 'admin' && (
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" isLoading={isSavingOrg} leftIcon={<Save className="w-4 h-4" />}>
                  Save Organisation Settings
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      {/* User Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand-400" />
            <div>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Your personal account settings and display name</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={fullName} src={user?.avatar_url} size="lg" />
              <div>
                <p className="text-xs font-semibold text-slate-400">Workspace Role</p>
                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider font-mono">
                  {userRole}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" isLoading={isSavingProfile} leftIcon={<Save className="w-4 h-4" />}>
                Update Profile
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-400" />
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control alerts for audit events and reviewer actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-2/60 border border-surface-border">
            <div>
              <p className="text-xs font-semibold text-white">Audit Completion Alerts</p>
              <p className="text-[11px] text-slate-400">
                Notify when background RAG & OCR processing finishes on your content
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifAuditComplete}
              onChange={e => setNotifAuditComplete(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-surface-border bg-surface-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-2/60 border border-surface-border">
            <div>
              <p className="text-xs font-semibold text-white">Reviewer Assignments & Comments</p>
              <p className="text-[11px] text-slate-400">
                Receive notifications when changes are requested or approvals granted
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifReviewRequest}
              onChange={e => setNotifReviewRequest(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-surface-border bg-surface-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-2/60 border border-surface-border">
            <div>
              <p className="text-xs font-semibold text-white">Critical Compliance Interceptions</p>
              <p className="text-[11px] text-slate-400">
                Alert legal counsel immediately when high-risk regulatory claims are submitted
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifCriticalAlert}
              onChange={e => setNotifCriticalAlert(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-surface-border bg-surface-1 focus:ring-brand-500"
            />
          </div>
        </CardBody>
      </Card>

      {/* API Keys & Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-400" />
            <div>
              <CardTitle>Developer API & CI/CD Integrations</CardTitle>
              <CardDescription>Connect BrandShield AI to your CMS, GitHub, or Figma workflows</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6 space-y-4">
          {apiKey ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-surface-2/60 rounded-xl border border-surface-border gap-3">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs font-semibold text-white">Active Workspace API Key</p>
                </div>
                <p className="font-mono text-xs text-slate-400 truncate mt-1">
                  {apiKey.slice(0, 18)}••••••••••••••••{apiKey.slice(-4)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pass as <code className="text-brand-300 bg-surface-1 px-1 rounded">Authorization: Bearer &lt;key&gt;</code> in your CI/CD or CMS headers.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={copyApiKey} leftIcon={<Copy className="w-3.5 h-3.5" />}>
                  Copy Key
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRevokeApiKey} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                  Revoke
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-2/30 border border-dashed border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-white">No API Key Generated</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generate a secret API token to connect BrandShield AI governance to your GitHub Actions, Figma plugin, or Headless CMS.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleGenerateApiKey} leftIcon={<Key className="w-4 h-4" />}>
                Generate API Key
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
