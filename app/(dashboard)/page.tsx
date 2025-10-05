"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, UserCheck, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import { useStats } from "@/hooks/use-stats"

// Eliminamos revalidate ya que usaremos SWR para el caché del cliente
// export const revalidate = 0

export default function DashboardPage() {
  const { stats, isLoading, isError } = useStats();

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Sistema de Control de Delincuencia</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-destructive">Error al cargar estadísticas</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            <Link href="/personas" className="group">
              <Card className="border-2 hover:border-blue-500 transition-all duration-300 hover:shadow-lg h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Personas</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-600 dark:text-blue-400">
                    {stats?.personasCount || 0}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Registradas en el sistema</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/delincuentes" className="group">
              <Card className="border-2 hover:border-red-500 transition-all duration-300 hover:shadow-lg h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Delincuentes</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-red-100 dark:bg-red-950">
                    <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-red-600 dark:text-red-400">
                    {stats?.delincuentesCount || 0}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Registrados actualmente</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Search Section */}
          <Card className="border-2">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Búsqueda Avanzada</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    Busca personas por múltiples criterios
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <Link href="/busqueda">
                <Button size="lg" className="w-full h-10 sm:h-11 md:h-12 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-400 dark:hover:bg-blue-500">
                  <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Buscar Personas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}


