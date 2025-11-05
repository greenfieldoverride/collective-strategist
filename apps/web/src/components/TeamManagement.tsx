import { useState } from 'react'
import { Venture, InviteMemberRequest, VentureMemberRole } from '../types/venture'
import { ventureApi } from '../services/ventureApi'

interface TeamManagementProps {
  venture: Venture
  onVentureUpdate: (venture: Venture) => void
}

export default function TeamManagement({ venture, onVentureUpdate }: TeamManagementProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteMemberRequest>({
    email: '',
    role: 'collaborator',
    permissions: [],
    personalMessage: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const canManageMembers = venture.currentUserPermissions?.includes('manage_members') || 
                          venture.currentUserPermissions?.includes('admin_all')

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteForm.email.trim()) {
      setError('Email is required')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      
      await ventureApi.inviteMember(venture.id, inviteForm)
      
      // Reset form and close modal
      setInviteForm({
        email: '',
        role: 'collaborator',
        permissions: [],
        personalMessage: ''
      })
      setIsInviteOpen(false)
      
      // Refresh venture data
      const updatedVenture = await ventureApi.getVenture(venture.id)
      onVentureUpdate(updatedVenture)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleIcon = (role: VentureMemberRole) => {
    switch (role) {
      case 'owner': return '👑'
      case 'co_owner': return '🤝'
      case 'contributor': return '✍️'
      case 'collaborator': return '🤝'
      case 'observer': return '👁️'
      default: return '👤'
    }
  }

  const getRoleLabel = (role: VentureMemberRole) => {
    switch (role) {
      case 'owner': return 'Owner'
      case 'co_owner': return 'Co-Owner'
      case 'contributor': return 'Contributor'
      case 'collaborator': return 'Collaborator'
      case 'observer': return 'Observer'
      default: return role
    }
  }

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'manage_members': return 'Manage Team'
      case 'manage_billing': return 'Manage Billing'
      case 'create_conversations': return 'Create Conversations'
      case 'access_analytics': return 'Access Analytics'
      case 'export_data': return 'Export Data'
      case 'manage_integrations': return 'Manage Integrations'
      case 'admin_all': return 'Full Admin'
      default: return permission
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="team-management">
      <div className="team-header">
        <div className="team-title">
          <h3>Team Members</h3>
          <span className="member-count">
            {venture.members?.length || 0} / {venture.maxMembers} members
          </span>
        </div>
        
        {canManageMembers && (
          <button 
            onClick={() => setIsInviteOpen(true)}
            className="btn-primary"
            disabled={(venture.members?.length || 0) >= venture.maxMembers}
          >
            + Invite Member
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Members List */}
      <div className="members-list">
        {venture.members?.length === 0 ? (
          <div className="empty-state">
            <p>No team members yet</p>
            {canManageMembers && (
              <button onClick={() => setIsInviteOpen(true)} className="btn-secondary">
                Invite Your First Team Member
              </button>
            )}
          </div>
        ) : (
          venture.members?.map((member) => (
            <div key={member.id} className="member-card">
              <div className="member-avatar">
                {getRoleIcon(member.role)}
              </div>
              
              <div className="member-info">
                <div className="member-header">
                  <span className="member-name">
                    {member.userId === venture.primaryBillingOwner ? 'You' : member.userId}
                  </span>
                  <span className="member-role">
                    {getRoleLabel(member.role)}
                  </span>
                </div>
                
                <div className="member-meta">
                  <span className="join-date">
                    Joined {formatDate(member.joinedAt)}
                  </span>
                  {member.lastActiveAt && (
                    <span className="last-active">
                      Last active {formatDate(member.lastActiveAt)}
                    </span>
                  )}
                </div>

                {member.permissions.length > 0 && (
                  <div className="member-permissions">
                    <span className="permissions-label">Permissions:</span>
                    <div className="permissions-list">
                      {member.permissions.map((permission) => (
                        <span key={permission} className="permission-tag">
                          {getPermissionLabel(permission)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {venture.costSharingEnabled && member.costSharePercentage && (
                  <div className="cost-share">
                    <span>Cost share: {member.costSharePercentage}%</span>
                  </div>
                )}
              </div>

              {canManageMembers && member.userId !== venture.primaryBillingOwner && (
                <div className="member-actions">
                  <button className="btn-icon" title="Edit member">
                    ✏️
                  </button>
                  <button className="btn-icon danger" title="Remove member">
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Billing Tier Info */}
      <div className="billing-info">
        <div className="billing-tier">
          <h4>Billing Tier</h4>
          <div className="tier-details">
            {venture.billingTier === 'liberation' ? (
              <>
                <span className="tier-badge liberation">Liberation</span>
                <p>Free for sovereign circles and Greenfield Override affiliates</p>
              </>
            ) : (
              <>
                <span className="tier-badge professional">Professional</span>
                <p>Full access to all features</p>
              </>
            )}
          </div>
        </div>

        {venture.costSharingEnabled && (
          <div className="cost-sharing-info">
            <h4>Cost Sharing</h4>
            <p>Method: {venture.costSharingMethod}</p>
            {venture.costSharingNotes && (
              <p className="cost-notes">{venture.costSharingNotes}</p>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Invite Team Member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleInviteMember} className="modal-form">
              <div className="form-group">
                <label htmlFor="invite-email">Email Address *</label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@example.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="invite-role">Role *</label>
                <select
                  id="invite-role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ 
                    ...prev, 
                    role: e.target.value as VentureMemberRole 
                  }))}
                  disabled={isLoading}
                >
                  <option value="observer">👁️ Observer</option>
                  <option value="collaborator">🤝 Collaborator</option>
                  <option value="contributor">✍️ Contributor</option>
                  <option value="co_owner">🤝 Co-Owner</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="invite-message">Personal Message</label>
                <textarea
                  id="invite-message"
                  value={inviteForm.personalMessage}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, personalMessage: e.target.value }))}
                  placeholder="Add a personal message to the invitation"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setIsInviteOpen(false)}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
