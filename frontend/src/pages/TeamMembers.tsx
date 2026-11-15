import React, { useState } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import { organisationService } from '../services/organisation.service';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import {
  UserPlus,
  Trash2,
  Shield,
  Mail,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

export const TeamMembers: React.FC = () => {
  const { currentOrg, userRole, members, refreshMembers } = useOrganisation();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'creator' | 'reviewer'>('reviewer');
  const [isInviting, setIsInviting] = useState(false);

  const isAdmin = userRole === 'admin';

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await organisationService.inviteMember(currentOrg.id, inviteEmail, inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteModalOpen(false);
      setInviteEmail('');
      refreshMembers();
    } catch (err) {
      toast.error('Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'creator' | 'reviewer') => {
    if (!currentOrg) return;
    try {
      await organisationService.updateMemberRole(currentOrg.id, memberId, newRole);
      toast.success('Member permissions updated');
      refreshMembers();
    } catch (err) {
      toast.error('Could not update role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName?: string) => {
    if (!currentOrg) return;
    if (window.confirm(`Are you sure you want to remove ${memberName || 'this member'} from ${currentOrg.name}?`)) {
      try {
        await organisationService.removeMember(currentOrg.id, memberId);
        toast.success('Member removed');
        refreshMembers();
      } catch (err) {
        toast.error('Failed to remove member');
      }
    }
  };

  const roleColors: Record<string, 'brand' | 'purple' | 'slate'> = {
    admin: 'purple',
    reviewer: 'brand',
    creator: 'slate'
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              Access Control & Roles
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">
              {members.length} team members
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Team & Governance Roles</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage workspace members, assign reviewer responsibilities, and control publishing authority.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setInviteModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Invite Member
          </Button>
        )}
      </div>

      {/* Members Registry Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Workspace Members ({members.length})</CardTitle>
            <CardDescription>
              Users with access to {currentOrg?.name} brand assets and compliance workflows
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2/60 border-b border-surface-border text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-6">Member</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined Date</th>
                {isAdmin && <th className="py-3 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border font-medium">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-surface-2/40 transition-colors">
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.user?.full_name || 'Member'}
                        src={member.user?.avatar_url}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold text-white">
                          {member.user?.full_name || 'Member'}
                        </p>
                        <p className="text-[10px] text-slate-500 capitalize font-mono">
                          ID: {member.user_id.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {member.user?.email}
                  </td>
                  <td className="py-3.5 px-4">
                    {isAdmin ? (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.id, e.target.value as any)}
                        className="text-xs font-semibold rounded-lg border border-surface-border px-2.5 py-1 bg-surface-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="creator">Creator</option>
                      </select>
                    ) : (
                      <Badge variant={roleColors[member.role] || 'default'} size="sm">
                        {member.role.toUpperCase()}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user?.full_name)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Matrix</CardTitle>
          <CardDescription>Enterprise governance capabilities across system layers</CardDescription>
        </CardHeader>
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full authority over organisation brand guidelines, deterministic rules, member provisioning, and API keys.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-500/5 space-y-2">
              <div className="flex items-center gap-2 text-brand-300 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <span>Reviewer</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Approve, reject, or request changes on submitted collateral. Sign off on high-risk copy and regulatory claims.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-surface-border bg-surface-2/40 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <Edit3 className="w-4 h-4 text-slate-400" />
                <span>Creator</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Submit marketing copy and graphics for automated audit analysis. Accept or adjust AI corrections.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite New Member"
        description={`Send an invitation to join the ${currentOrg?.name} brand governance workspace.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} isLoading={isInviting}>
              Send Invitation
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          <Input
            label="Work Email"
            type="email"
            placeholder="colleague@company.com"
            leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />

          <Select
            label="Workspace Role"
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as any)}
            options={[
              { value: 'reviewer', label: 'Reviewer (Legal & Brand Sign-off)' },
              { value: 'creator', label: 'Creator (Copywriting & Audit Submissions)' },
              { value: 'admin', label: 'Admin (Full Management & Rule Authoring)' }
            ]}
          />
        </form>
      </Modal>
    </div>
  );
};
