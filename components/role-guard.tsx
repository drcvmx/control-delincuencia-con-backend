"use client"

import type React from "react"
import { getCurrentUser, hasRole, hasPermission } from "@/lib/auth"
import { useEffect, useState } from "react"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requiredPermission?: { modulo: string; accion: string }
  fallback?: React.ReactNode
}

export function RoleGuard({ 
  children, 
  allowedRoles = [], 
  requiredPermission,
  fallback = null 
}: RoleGuardProps) {
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
  }, [allowedRoles])

  if (isLoading) {
    return null
  }

  if (!user) {
    return <>{fallback}</>
  }

  // Verificar permisos específicos si se proporcionan
  if (requiredPermission) {
    const hasRequiredPermission = hasPermission(
      requiredPermission.modulo, 
      requiredPermission.accion
    );
    if (!hasRequiredPermission) {
      return <>{fallback}</>
    }
  }

  // Verificar roles si se proporcionan
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    if (!hasAllowedRole) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
