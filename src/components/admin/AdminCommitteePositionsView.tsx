import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Shield, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Permission } from '@/hooks/usePermissions'

interface CommitteePosition {
  id: string
  organization_id: string
  name: string
  description: string | null
  permissions: Permission[]
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AdminCommitteePositionsViewProps {
  organizationId: string
}

const AVAILABLE_PERMISSIONS: { value: Permission; label: string; description: string }[] = [
  { value: 'full_admin', label: 'Full Admin Access', description: 'Complete access to all features (equivalent to admin role)' },
  { value: 'approve_members', label: 'Approve Members', description: 'Can approve/reject member applications' },
  { value: 'manage_members', label: 'Manage Members', description: 'Can edit member details' },
  { value: 'manage_memberships', label: 'Manage Memberships', description: 'Can create/edit/delete membership records' },
  { value: 'view_reports', label: 'View Reports', description: 'Can view reports and analytics' },
  { value: 'export_reports', label: 'Export Reports', description: 'Can export reports to CSV/PDF' },
  { value: 'manage_events', label: 'Manage Events', description: 'Can create/edit/delete events' },
  { value: 'manage_emails', label: 'Manage Emails', description: 'Can send email campaigns' },
  { value: 'manage_mailing_lists', label: 'Manage Mailing Lists', description: 'Can create/edit mailing lists' },
  { value: 'manage_committees', label: 'Manage Committees', description: 'Can create/edit committees and positions' },
  { value: 'manage_settings', label: 'Manage Settings', description: 'Can edit organization settings' },
  { value: 'manage_domains', label: 'Manage Domains', description: 'Can manage custom domains' },
]

export function AdminCommitteePositionsView({ organizationId }: AdminCommitteePositionsViewProps) {
  const [positions, setPositions] = useState<CommitteePosition[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPosition, setEditingPosition] = useState<CommitteePosition | null>(null)

  useEffect(() => {
    loadPositions()
  }, [organizationId])

  const loadPositions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('committee_positions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('display_order')

      if (error) throw error

      setPositions(data || [])
    } catch (error) {
      console.error('Error loading positions:', error)
      toast.error('Failed to load committee positions')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (position: CommitteePosition) => {
    setEditingPosition(position)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this position? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('committee_positions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Position deleted successfully')
      loadPositions()
    } catch (error: any) {
      console.error('Error deleting position:', error)
      toast.error(error.message || 'Failed to delete position')
    }
  }

  const toggleActive = async (position: CommitteePosition) => {
    try {
      const { error } = await supabase
        .from('committee_positions')
        .update({ is_active: !position.is_active })
        .eq('id', position.id)

      if (error) throw error

      toast.success(`Position ${!position.is_active ? 'activated' : 'deactivated'}`)
      loadPositions()
    } catch (error) {
      console.error('Error toggling position:', error)
      toast.error('Failed to update position')
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
      <PositionForm
        organizationId={organizationId}
        position={editingPosition}
        onSave={() => {
          setShowForm(false)
          setEditingPosition(null)
          loadPositions()
        }}
        onCancel={() => {
          setShowForm(false)
          setEditingPosition(null)
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
              <CardTitle>Committee Positions</CardTitle>
              <CardDescription>
                Manage committee positions and their permissions
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No committee positions created yet. Click "Add Position" to create one.
            </p>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => (
                <Card key={position.id} className={!position.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{position.name}</h3>
                          {!position.is_active && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {position.description && (
                          <p className="text-sm text-gray-600 mb-3">{position.description}</p>
                        )}
                        {position.permissions && position.permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            <Shield className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div className="flex-1 flex flex-wrap gap-2">
                              {position.permissions.map((permission) => {
                                const permDef = AVAILABLE_PERMISSIONS.find(p => p.value === permission)
                                return (
                                  <span
                                    key={permission}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                                  >
                                    {permDef?.label || permission}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No permissions assigned</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(position)}
                        >
                          {position.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(position)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(position.id)}
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

interface PositionFormProps {
  organizationId: string
  position: CommitteePosition | null
  onSave: () => void
  onCancel: () => void
}

function PositionForm({ organizationId, position, onSave, onCancel }: PositionFormProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: position?.name || '',
    description: position?.description || '',
    permissions: position?.permissions || [] as Permission[],
    is_active: position?.is_active ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Position name is required')
      return
    }

    try {
      setSaving(true)

      if (position) {
        const { error } = await supabase
          .from('committee_positions')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            permissions: formData.permissions,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', position.id)

        if (error) throw error
        toast.success('Position updated successfully')
      } else {
        const { data: maxOrderData } = await supabase
          .from('committee_positions')
          .select('display_order')
          .eq('organization_id', organizationId)
          .order('display_order', { ascending: false })
          .limit(1)
          .single()

        const nextOrder = (maxOrderData?.display_order || 0) + 1

        const { error } = await supabase
          .from('committee_positions')
          .insert({
            organization_id: organizationId,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            permissions: formData.permissions,
            is_active: formData.is_active,
            display_order: nextOrder,
          })

        if (error) throw error
        toast.success('Position created successfully')
      }

      onSave()
    } catch (error: any) {
      console.error('Error saving position:', error)
      toast.error(error.message || 'Failed to save position')
    } finally {
      setSaving(false)
    }
  }

  const togglePermission = (permission: Permission) => {
    if (formData.permissions.includes(permission)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permission)
      })
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission]
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{position ? 'Edit Position' : 'Create Position'}</CardTitle>
            <CardDescription>
              {position ? 'Update position details and permissions' : 'Create a new committee position with specific permissions'}
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
            <Label htmlFor="name">Position Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Chairman, Secretary, Treasurer"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this position's responsibilities"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <Label>Permissions</Label>
            <p className="text-sm text-gray-600">
              Select the permissions this position should have. Members assigned to this position will automatically receive these permissions.
            </p>
            <div className="space-y-3 border rounded-lg p-4">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div key={permission.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission.value}
                    checked={formData.permissions.includes(permission.value)}
                    onCheckedChange={() => togglePermission(permission.value)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={permission.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {permission.label}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
            />
            <Label htmlFor="is_active">Active (available for assignment)</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving ? 'Saving...' : position ? 'Update Position' : 'Create Position'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
