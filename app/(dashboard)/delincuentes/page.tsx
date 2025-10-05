"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RoleGuard } from "@/components/role-guard"
import { apiService } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface Delincuente {
  id_persona: number
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  alias: string | null
  fecha_detencion: string | null
  carcel_actual: string | null
  celda_actual: string | null
  fecha_ingreso_actual: string | null
  estado_actual: string
  edad: number
  total_crimenes: number
}

export default function DelincuentesPage() {
  const [delincuentes, setDelincuentes] = useState<Delincuente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDelincuentes()
  }, [])

  const loadDelincuentes = async () => {
    try {
      setLoading(true)
      setError(null)
      
 
      
      const response = await apiService.getDelincuentes()
      
 
      
      if (response.error) {
        throw new Error(response.error)
      }

      if (response.data && response.data.delincuentes) {
 
        
        // Agregar esta línea para depurar los datos
        
        // Verificar específicamente los campos problemáticos
        response.data.delincuentes.forEach(d => {
 
        })
        
        setDelincuentes(response.data.delincuentes)
      } else {
 
        setDelincuentes([])
      }

    } catch (error) {
      console.error("Error in loadDelincuentes:", error);
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      setError(errorMsg);
      toast({
        title: "Error",
        description: "Error al cargar los delincuentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando delincuentes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Delincuentes</h1>
            <p className="text-muted-foreground">Listado de delincuentes registrados en el sistema</p>
          </div>
        </div>
        
        <div className="border rounded-md p-8 text-center">
          <div className="text-red-500 mb-4">
            <p className="text-lg font-medium">Error al cargar los datos</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={loadDelincuentes} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delincuentes</h1>
          <p className="text-muted-foreground">
            Listado de delincuentes registrados en el sistema ({delincuentes.length} registros)
          </p>
        </div>
        <RoleGuard allowedRoles={["administrador"]}>
          <Link href="/delincuentes/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Delincuente
            </Button>
          </Link>
        </RoleGuard>
      </div>

      <div className="border rounded-md">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium">ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Nombre</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Alias</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Edad</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Estado</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Cárcel Actual</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Celda</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Fecha Ingreso</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Crímenes</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {delincuentes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-muted-foreground">
                    No hay delincuentes registrados
                  </td>
                </tr>
              ) : (
                delincuentes.map((delincuente) => (
                  <tr
                    key={delincuente.id_persona}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle">{delincuente.id_persona}</td>
                    <td className="p-4 align-middle">
                      {delincuente.nombre} {delincuente.apellido_paterno} {delincuente.apellido_materno}
                    </td>
                    <td className="p-4 align-middle">{delincuente.alias || "N/A"}</td>
                    <td className="p-4 align-middle">{delincuente.edad} años</td>
                    <td className="p-4 align-middle">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        delincuente.estado_actual === 'Recluido' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {delincuente.estado_actual}
                      </span>
                    </td>
                    <td className="p-4 align-middle">{delincuente.carcel_actual || "N/A"}</td>
                    <td className="p-4 align-middle">{delincuente.celda_actual || "N/A"}</td>
                    <td className="p-4 align-middle">
                      {delincuente.fecha_ingreso_actual
                        ? format(new Date(delincuente.fecha_ingreso_actual), "dd/MM/yyyy", { locale: es })
                        : "N/A"}
                    </td>
                    <td className="p-4 align-middle">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {delincuente.total_crimenes}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Link href={`/personas/${delincuente.id_persona}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


