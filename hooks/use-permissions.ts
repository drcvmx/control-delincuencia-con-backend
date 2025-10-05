import { useState, useEffect } from 'react'
import { getCurrentUser, hasRole, hasPermission, canCreate, canUpdate, canDelete, canRead } from '@/lib/auth'

export function usePermissions() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = () => {
      try {
        const currentUser = getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  return {
    user,
    isLoading,
    hasRole: (role: string) => hasRole(role),
    hasPermission: (modulo: string, accion: string) => hasPermission(modulo, accion),
    canCreate: (modulo: string) => canCreate(modulo),
    canUpdate: (modulo: string) => canUpdate(modulo),
    canDelete: (modulo: string) => canDelete(modulo),
    canRead: (modulo: string) => canRead(modulo),
    isAdmin: () => hasRole('administrador'),
    isOperador: () => hasRole('operador'),
    isUsuario: () => hasRole('usuario')
  }
}