"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Users, Search, UserCheck, Building, Shield, BarChart3 } from "lucide-react"
import { RoleGuard } from "@/components/role-guard"
import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/auth"

const routes = [
  {
    href: "/",
    label: "Dashboard",
    icon: BarChart3,
    active: false,
  },
 
  {
    href: "/busqueda",
    label: "Búsqueda",
    icon: Search,
    active: false,
  },
]

const adminOnlyRoutes = [
]

export function MainNav() {
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

  return (
    <div className="mr-4 hidden md:flex">
      <nav className="flex items-center space-x-6 text-sm font-medium">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === route.href ? "text-foreground" : "text-foreground/60"
            )}
          >
            {route.label}
          </Link>
        ))}
        
        <RoleGuard allowedRoles={["administrador"]}>
          {adminOnlyRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === route.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              {route.label}
            </Link>
          ))}
        </RoleGuard>
      </nav>
    </div>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="pr-0">
          <nav className="flex flex-col space-y-3">
            {routes.map((route) => {
              const Icon = route.icon
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground/80",
                    pathname === route.href ? "text-foreground" : "text-foreground/60"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{route.label}</span>
                </Link>
              )
            })}
            
            <RoleGuard allowedRoles={["administrador"]}>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Administración</p>
                {adminOnlyRoutes.map((route) => {
                  const Icon = route.icon
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground/80",
                        pathname === route.href ? "text-foreground" : "text-foreground/60"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{route.label}</span>
                    </Link>
                  )
                })}
              </div>
            </RoleGuard>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}