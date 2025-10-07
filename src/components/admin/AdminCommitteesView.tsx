import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Users, X, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Committee {
  id: string
  organization_id: string
  name: string
  description: string | null
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CommitteeMember {
  id: string
  committee_id: string
  profile_id: string
  position_id: string | null
  profiles: {
    first_name: string
    last_name: string
    email: string
  }
  committee_positions: {
    name: string
  } | null
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface CommitteePosition {
  id: string
  name: string
}

interface AdminCommitteesViewProps {
  organizationId: string
}

export function AdminCommitteesView({ organizationId }: AdminCommitteesViewProps) {
  const [committees, setCommittees] = useState<Committee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null)
  const [managingMembersCommittee, setManagingMembersCommittee] = useState<Committee | null>(null)

  useEffect(() => {
    loadCommittees()
  }, [organizationId])

  const loadCommittees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('committees')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name')

      if (error) throw error

      setCommittees(data || [])
    } catch (error) {
      console.error('Error loading committees:', error)
      toast.error('Failed to load committees')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (committee: Committee) => {
    setEditingCommittee(committee)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this committee? This will also remove all committee members.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('committees')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Committee deleted successfully')
      loadCommittees()
    } catch (error: any) {
      console.error('Error deleting committee:', error)
      toast.error(error.message || 'Failed to delete committee')
    }
  }

  const toggleActive = async (committee: Committee) => {
    try {
      const { error } = await supabase
        .from('committees')
        .update({ is_active: !committee.is_active })
        .eq('id', committee.id)

      if (error) throw error

      toast.success(`Committee ${!committee.is_active ? 'activated' : 'deactivated'}`)
      loadCommittees()
    } catch (error) {
      console.error('Error toggling committee:', error)
      toast.error('Failed to update committee')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showForm) {
    return (
      <CommitteeForm
        organizationId={organizationId}
        committee={editingCommittee}
        onSave={() => {
          setShowForm(false)
          setEditingCommittee(null)
          loadCommittees()
        }}
        onCancel={() => {
          setShowForm(false)
          setEditingCommittee(null)
        }}
      />
    )
  }

  if (managingMembersCommittee) {
    return (
      <CommitteeMembersManager
        organizationId={organizationId}
        committee={managingMembersCommittee}
        onBack={() => {
          setManagingMembersCommittee(null)
          loadCommittees()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Committees</CardTitle>
              <CardDescription>
                Manage your organization's committees
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Committee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {committees.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No committees created yet. Click "Add Committee" to create one.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {committees.map((committee) => (
                <Card key={committee.id} className={!committee.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="h-5 w-5 text-gray-400" />
                          <h3 className="font-semibold">{committee.name}</h3>
                          {!committee.is_active && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {committee.description && (
                          <p className="text-sm text-gray-600 ml-8">{committee.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setManagingMembersCommittee(committee)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Members
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(committee)}
                        >
                          {committee.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(committee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(committee.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface CommitteeFormProps {
  organizationId: string
  committee: Committee | null
  onSave: () => void
  onCancel: () => void
}

function CommitteeForm({ organizationId, committee, onSave, onCancel }: CommitteeFormProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: committee?.name || '',
    description: committee?.description || '',
    is_active: committee?.is_active ?? true,
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Committee name is required')
      return
    }

    try {
      setSaving(true)

      const slug = generateSlug(formData.name)

      if (committee) {
        const { error } = await supabase
          .from('committees')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            slug,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', committee.id)

        if (error) throw error
        toast.success('Committee updated successfully')
      } else {
        const { error } = await supabase
          .from('committees')
          .insert({
            organization_id: organizationId,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            slug,
            is_active: formData.is_active,
          })

        if (error) throw error
        toast.success('Committee created successfully')
      }

      onSave()
    } catch (error: any) {
      console.error('Error saving committee:', error)
      toast.error(error.message || 'Failed to save committee')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{committee ? 'Edit Committee' : 'Create Committee'}</CardTitle>
            <CardDescription>
              {committee ? 'Update committee details' : 'Create a new committee'}
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Committee Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Board of Directors, Events Committee"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this committee's purpose and responsibilities"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving ? 'Saving...' : committee ? 'Update Committee' : 'Create Committee'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface CommitteeMembersManagerProps {
  organizationId: string
  committee: Committee
  onBack: () => void
}

function CommitteeMembersManager({ organizationId, committee, onBack }: CommitteeMembersManagerProps) {
  const [members, setMembers] = useState<CommitteeMember[]>([])
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([])
  const [positions, setPositions] = useState<CommitteePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [selectedPositionId, setSelectedPositionId] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [committee.id, organizationId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [membersRes, positionsRes, profilesRes] = await Promise.all([
        supabase
          .from('committee_members')
          .select(`
            id,
            committee_id,
            profile_id,
            position_id,
            profiles!inner(first_name, last_name, email),
            committee_positions(name)
          `)
          .eq('committee_id', committee.id),
        supabase
          .from('committee_positions')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('last_name')
      ])

      if (membersRes.error) throw membersRes.error
      if (positionsRes.error) throw positionsRes.error
      if (profilesRes.error) throw profilesRes.error

      setMembers(membersRes.data as any || [])
      setPositions(positionsRes.data || [])
      
      // Filter out profiles that are already members
      const memberProfileIds = new Set(membersRes.data?.map(m => m.profile_id) || [])
      const available = (profilesRes.data || []).filter(p => !memberProfileIds.has(p.id))
      setAvailableProfiles(available)
    } catch (error) {
      console.error('Error loading committee members:', error)
      toast.error('Failed to load committee members')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedProfileId) {
      toast.error('Please select a member')
      return
    }

    try {
      setAdding(true)

      const { error } = await supabase
        .from('committee_members')
        .insert({
          committee_id: committee.id,
          profile_id: selectedProfileId,
          position_id: selectedPositionId || null
        })

      if (error) throw error

      toast.success('Member added to committee')
      setShowAddDialog(false)
      setSelectedProfileId('')
      setSelectedPositionId('')
      loadData()
    } catch (error: any) {
      console.error('Error adding member:', error)
      toast.error(error.message || 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the committee?')) {
      return
    }

    try {
      setRemovingId(memberId)

      const { error } = await supabase
        .from('committee_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Member removed from committee')
      loadData()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.message || 'Failed to remove member')
    } finally {
      setRemovingId(null)
    }
  }

  const handleUpdatePosition = async (memberId: string, newPositionId: string) => {
    try {
      const { error } = await supabase
        .from('committee_members')
        .update({ position_id: newPositionId || null })
        .eq('id', memberId)

      if (error) throw error

      toast.success('Position updated')
      loadData()
    } catch (error: any) {
      console.error('Error updating position:', error)
      toast.error(error.message || 'Failed to update position')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manage Members: {committee.name}</CardTitle>
              <CardDescription>
                Add or remove members from this committee and assign positions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
              <Button variant="outline" onClick={onBack}>
                <X className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No members in this committee yet. Click "Add Member" to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                            <h3 className="font-semibold">
                              {member.profiles.first_name} {member.profiles.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{member.profiles.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-48">
                          <Select
                            value={member.position_id || 'none'}
                            onValueChange={(value) => handleUpdatePosition(member.id, value === 'none' ? '' : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No position" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="none">No position</SelectItem>
                              {positions.map((pos) => (
                                <SelectItem key={pos.id} value={pos.id}>
                                  {pos.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingId === member.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {removingId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to {committee.name}</DialogTitle>
            <DialogDescription>
              Select a member and optionally assign them a position
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[300px]">
                  {availableProfiles.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No available members</div>
                  ) : (
                    availableProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name} ({profile.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position (Optional)</Label>
              <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
                <SelectTrigger>
                  <SelectValue placeholder="No position" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="">No position</SelectItem>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={adding || !selectedProfileId}>
              {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
