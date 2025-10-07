import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase/client'

export type Permission = 
  | 'approve_members'
  | 'manage_members'
  | 'manage_memberships'
  | 'view_reports'
  | 'export_reports'
  | 'manage_events'
  | 'manage_emails'
  | 'manage_mailing_lists'
  | 'manage_committees'
  | 'manage_settings'
  | 'manage_domains'
  | 'full_admin'

interface PositionWithPermissions {
  id: string
  name: string
  permissions: Permission[]
}

export function usePermissions() {
  const { user } = useAuth()
  const [userPermissions, setUserPermissions] = useState<Permission[]>([])
  const [positions, setPositions] = useState<PositionWithPermissions[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPermissions() {
      if (!user?.profile) {
        setUserPermissions([])
        setPositions([])
        setLoading(false)
        return
      }

      // Super admins and regular admins have all permissions
      if (user.profile.role === 'super_admin' || user.profile.role === 'admin') {
        setUserPermissions(['full_admin'])
        setLoading(false)
        return
      }

      // Fetch user's committee memberships with positions
      const { data: memberships } = await supabase
        .from('committee_members')
        .select(`
          position_id,
          committee_positions (
            id,
            name,
            permissions
          )
        `)
        .eq('profile_id', user.profile.id)
        .not('position_id', 'is', null)

      if (!memberships) {
        setUserPermissions([])
        setPositions([])
        setLoading(false)
        return
      }

      // Extract all permissions from all positions
      const allPermissions = new Set<Permission>()
      const userPositions: PositionWithPermissions[] = []

      memberships.forEach((membership: any) => {
        if (membership.committee_positions) {
          const position = membership.committee_positions
          const positionPermissions = (position.permissions || []) as Permission[]
          
          userPositions.push({
            id: position.id,
            name: position.name,
            permissions: positionPermissions
          })

          positionPermissions.forEach(permission => {
            allPermissions.add(permission)
          })
        }
      })

      setUserPermissions(Array.from(allPermissions))
      setPositions(userPositions)
      setLoading(false)
    }

    loadPermissions()
  }, [user?.profile?.id, user?.profile?.role])

  const hasPermission = (permission: Permission): boolean => {
    // Super admins and regular admins always have all permissions
    if (user?.profile?.role === 'super_admin' || user?.profile?.role === 'admin') {
      return true
    }

    // Check if user has full_admin permission
    if (userPermissions.includes('full_admin')) {
      return true
    }

    // Check if user has the specific permission
    return userPermissions.includes(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  return {
    permissions: userPermissions,
    positions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.profile?.role === 'admin' || user?.profile?.role === 'super_admin' || userPermissions.includes('full_admin')
  }
}
