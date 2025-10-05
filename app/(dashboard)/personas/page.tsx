"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from "@/components/role-guard"
import { apiService } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Loader2, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PersonaConEstatus {
  id: number
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  fecha_de_nacimiento: string
  esDelincuente: boolean
  estado?: string
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<PersonaConEstatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    loadPersonas()
  }, [])

  const loadPersonas = async () => {
    try {
      setIsLoading(true)
      
      // Obtener personas
      const personasResponse = await apiService.getPersonas()
      
      if (personasResponse.error) {
        throw new Error(personasResponse.error)
      }
  
      // Acceder correctamente a los datos de personas
      const personasData = personasResponse.data?.personas || []
  
      // Obtener delincuentes
      const delincuentesResponse = await apiService.getDelincuentes()
      const delincuentesData = delincuentesResponse.data?.delincuentes || []
  
      // Obtener estatus - corregir el acceso a los datos
      const estatusResponse = await apiService.getEstatus()
      const estatusData = estatusResponse.data?.estatus || [] // Cambiar de .data a .data.estatus
  
      // Procesar personas con información de delincuentes y estatus
      const personasConEstatus = personasData.map((persona: any) => {
        // Verificar si es delincuente
        const esDelincuente = delincuentesData.some((del: any) => del.id_persona === persona.id)
        
        let estado = 'Civil'
        
        if (esDelincuente) {
          // Buscar estatus penitenciario
          const estatus = estatusData.find((est: any) => est.id_persona === persona.id)
          if (estatus) {
            estado = estatus.estatus_penitenciario || 'Delincuente'
          } else {
            estado = 'Delincuente'
          }
        }
  
        return {
          ...persona,
          esDelincuente,
          estado
        }
      })
  
      setPersonas(personasConEstatus)
    } catch (error) {
      console.error('Error loading personas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las personas",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePersona = async (id: number, nombre: string, apellidoPaterno: string) => {
    try {
      setDeletingId(id)
      
      const response = await apiService.deletePersona(id)
      
      if (response.error) {
        throw new Error(response.error)
      }

      toast({
        title: "Éxito",
        description: `Persona ${nombre} ${apellidoPaterno} eliminada correctamente`
      })

      // Recargar la lista
      await loadPersonas()
    } catch (error) {
      console.error('Error deleting persona:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la persona. Puede que tenga registros asociados.",
        variant: "destructive"
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando personas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personas</h1>
          <p className="text-muted-foreground">
            Administra las personas registradas en el sistema
          </p>
        </div>
        <RoleGuard allowedRoles={["administrador", "operador"]}>
          <Link href="/personas/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Persona
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
                <th className="h-12 px-4 text-left align-middle font-medium">Apellidos</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Fecha de Nacimiento</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Estado</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {personas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No hay personas registradas
                  </td>
                </tr>
              ) : (
                personas.map((persona) => (
                  <tr
                    key={persona.id}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle font-medium">{persona.id}</td>
                    <td className="p-4 align-middle">{persona.nombre}</td>
                    <td className="p-4 align-middle">
                      {persona.apellido_paterno} {persona.apellido_materno}
                    </td>
                    <td className="p-4 align-middle">
                      {persona.fecha_de_nacimiento ? (
                        format(new Date(persona.fecha_de_nacimiento), "dd/MM/yyyy", { locale: es })
                      ) : (
                        "No disponible"
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant={persona.esDelincuente ? "destructive" : "secondary"}>
                        {persona.estado}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Link href={`/personas/${persona.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                        <RoleGuard allowedRoles={["administrador", "operador"]}>
                          <Link href={`/personas/${persona.id}/editar`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </Link>
                        </RoleGuard>
                        <RoleGuard allowedRoles={["administrador"]}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={deletingId === persona.id}
                              >
                                {deletingId === persona.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-1" />
                                )}
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente a {persona.nombre} {persona.apellido_paterno}.
                                  {persona.esDelincuente && " Esta persona es un delincuente y puede tener registros asociados."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePersona(persona.id, persona.nombre, persona.apellido_paterno)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </RoleGuard>
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

