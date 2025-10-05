"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Acceso Denegado</CardTitle>
          <CardDescription>No tienes permisos suficientes para acceder a esta sección del sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si crees que esto es un error, contacta al administrador del sistema.
            </p>
            <Link href="/">
              <Button className="w-full">Volver al Inicio</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
