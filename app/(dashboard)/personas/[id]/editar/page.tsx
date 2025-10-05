"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PersonaData {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_de_nacimiento: string;
  fecha_de_fin: string;
}

interface DelincuenteData {
  id_persona: number;
  alias: string;
  fecha_detencion: string;
  antecedentes: string; // Cambiar de observaciones a antecedentes
}

interface EstatusData {
  id_delincuente: number;
  estado: string;
  fecha_ingreso: string;
  id_carcel: string;
  id_celda: string;
  fecha_salida_prevista: string;
  motivo_encarcelamiento: string;
}

export default function EditarPersonaPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [esDelincuente, setEsDelincuente] = useState(false)
  
  const [personaData, setPersonaData] = useState<PersonaData>({
    id: 0,
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    fecha_de_nacimiento: "",
    fecha_de_fin: ""
  })

  const [delincuenteData, setDelincuenteData] = useState<DelincuenteData>({
    id_persona: 0,
    alias: "",
    fecha_detencion: "",
    antecedentes: "" // Cambiar de observaciones a antecedentes
  })

  const [estatusData, setEstatusData] = useState<EstatusData>({
    id_delincuente: 0,
    estado: "DETENIDO",
    fecha_ingreso: "",
    id_carcel: "",
    id_celda: "",
    fecha_salida_prevista: "",
    motivo_encarcelamiento: ""
  })

  useEffect(() => {
    loadPersonaData()
  }, [params.id])

  const loadPersonaData = async () => {
    try {
      setLoadingData(true)
      
      // Cargar datos de la persona
      const personaResponse = await apiService.getPersona(parseInt(params.id))
      
      if (personaResponse.error || !personaResponse.data) {
        throw new Error('Persona no encontrada')
      }
  
          setPersonaData({
            ...personaResponse.data,
            fecha_de_fin: personaResponse.data.fecha_de_fin || ""
          })
  
      // Verificar si es delincuente usando el endpoint específico
      try {
        const delincuenteResponse = await apiService.getDelincuenteById(params.id);
        
        if (delincuenteResponse.data && !delincuenteResponse.error) {
          const delincuenteData = delincuenteResponse.data;
          
          setEsDelincuente(true);
          setDelincuenteData({
            id_persona: delincuenteData.delincuente.id_persona,
            alias: delincuenteData.delincuente.alias || "",
            fecha_detencion: delincuenteData.delincuente.fecha_detencion || "",
            antecedentes: delincuenteData.delincuente.antecedentes || ""
          });

          // Si hay estatus actual, cargarlo
          if (delincuenteData.estatusActual) {
            const estatus = delincuenteData.estatusActual;
            setEstatusData({
              id_delincuente: estatus.id_delincuente || parseInt(params.id),
              estado: estatus.estatus_penitenciario || "DETENIDO",
              fecha_ingreso: estatus.fecha_ingreso || "",
              id_carcel: estatus.id_carcel?.toString() || "",
              id_celda: estatus.id_celda || "",
              fecha_salida_prevista: estatus.fecha_salida_prevista || "",
              motivo_encarcelamiento: estatus.motivo_encarcelamiento || ""
            });
          }
        } else {
          // Si hay error o no hay data, no es delincuente
          setEsDelincuente(false);
        }
      } catch (delincuenteError) {
        // No es un error crítico, simplemente no es delincuente
        setEsDelincuente(false);
      }
      
    } catch (error) {
      console.error('Error loading persona data:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de la persona",
        variant: "destructive"
      })
    } finally {
      setLoadingData(false)
    }
  }

  const handlePersonaChange = (field: keyof PersonaData, value: string) => {
    setPersonaData(prev => ({ ...prev, [field]: value }))
  }

  const handleDelincuenteChange = (field: keyof DelincuenteData, value: string) => {
    setDelincuenteData(prev => ({ ...prev, [field]: value }))
  }

  const handleEstatusChange = (field: keyof EstatusData, value: string) => {
    setEstatusData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Filtrar campos vacíos del payload de persona
      const personaPayload = Object.fromEntries(
        Object.entries({
          nombre: personaData.nombre,
          apellido_paterno: personaData.apellido_paterno,
          apellido_materno: personaData.apellido_materno,
          fecha_de_nacimiento: personaData.fecha_de_nacimiento,
          fecha_de_fin: personaData.fecha_de_fin || null
        }).filter(([_, value]) => value !== "" && value !== null)
      )

      // Actualizar persona
      const personaResponse = await apiService.updatePersona(Number(params.id), personaPayload)
      if (personaResponse.error) {
        throw new Error(`Error actualizando persona: ${personaResponse.error}`)
      }

      let currentDelincuenteId = delincuenteData.id_persona; // Usar una variable temporal para el ID del delincuente

      // Lógica para manejar la conversión a delincuente o actualización
      if (esDelincuente) {
        if (!currentDelincuenteId || currentDelincuenteId === 0) {
          // Caso 1: La persona se convierte en delincuente (crear nuevo delincuente)
          const newDelincuentePayload = {
            id_persona: Number(params.id),
            fecha_alta_delincuente: new Date().toISOString().split('T')[0], // Añadir fecha_alta_delincuente con la fecha actual
            alias: delincuenteData.alias,
            fecha_detencion: delincuenteData.fecha_detencion || null,
            antecedentes: delincuenteData.antecedentes || null
          };

          const newDelincuenteResponse = await apiService.createDelincuente(newDelincuentePayload);
          if (newDelincuenteResponse.error) {
            throw new Error(`Error creando delincuente: ${newDelincuenteResponse.error}`);
          }
          currentDelincuenteId = newDelincuenteResponse.data.delincuente.id_persona; // Obtener el ID del nuevo delincuente
          setDelincuenteData(prev => ({ ...prev, id_persona: currentDelincuenteId })); // Actualizar el estado del ID

          toast({
            title: "Éxito",
            description: "Persona convertida a delincuente exitosamente."
          });

        } else { 
          // Caso 2: La persona ya era delincuente (actualizar datos del delincuente)
          const delincuentePayload = Object.fromEntries(
            Object.entries({
              alias: delincuenteData.alias,
              fecha_detencion: delincuenteData.fecha_detencion || null,
              antecedentes: delincuenteData.antecedentes || null
            }).filter(([_, value]) => value !== "" && value !== null)
          );

          if (Object.keys(delincuentePayload).length > 0) {
            const delincuenteResponse = await apiService.updateDelincuente(currentDelincuenteId, delincuentePayload);
            if (delincuenteResponse.error) {
              throw new Error(`Error actualizando delincuente: ${delincuenteResponse.error}`);
            }
          }
        }

        // Lógica para crear o actualizar estatus penitenciario (usando currentDelincuenteId)
        if (currentDelincuenteId && estatusData.fecha_ingreso && estatusData.id_carcel && estatusData.id_celda && estatusData.motivo_encarcelamiento) {
          let estatusResponse;

          // Determinar si ya existe un estatus para este delincuente
          // Esto puede ser más complejo si queremos actualizar un estatus 'activo' o crear uno nuevo
          // Por simplicidad, aquí asumimos que si hay un id_delincuente en estatusData y es el mismo, es una actualización
          if (estatusData.id_delincuente && estatusData.id_delincuente === currentDelincuenteId) {
            // Actualizar estatus existente
            const estatusUpdatePayload = {
              id_celda: estatusData.id_celda,
              fecha_salida_prevista: estatusData.fecha_salida_prevista || null,
              motivo_encarcelamiento: estatusData.motivo_encarcelamiento
            };

            const filteredUpdatePayload = Object.fromEntries(
              Object.entries(estatusUpdatePayload).filter(([_, value]) => value !== "" && value !== null)
            );

            if (Object.keys(filteredUpdatePayload).length > 0) {
              estatusResponse = await apiService.updateEstatus(currentDelincuenteId, filteredUpdatePayload);
            }
          } else {
            // Crear nuevo estatus (esto aplica si es un nuevo delincuente o si no tiene estatus activo)
            const estatusCreatePayload = {
              id_delincuente: currentDelincuenteId,
              fecha_ingreso: estatusData.fecha_ingreso,
              id_carcel: Number(estatusData.id_carcel),
              id_celda: estatusData.id_celda,
              fecha_salida_prevista: estatusData.fecha_salida_prevista || null,
              motivo_encarcelamiento: estatusData.motivo_encarcelamiento
            };
            estatusResponse = await apiService.createEstatus(estatusCreatePayload);
          }

          if (estatusResponse && estatusResponse.error) {
            throw new Error(`Error manejando estatus penitenciario: ${estatusResponse.error}`);
          }
        } else if (currentDelincuenteId && (estatusData.fecha_ingreso || estatusData.id_carcel || estatusData.id_celda || estatusData.motivo_encarcelamiento)) {
          // Si el checkbox de delincuente está marcado, pero faltan campos requeridos para crear/actualizar estatus
          // Esto es para proporcionar una mejor retroalimentación si el usuario intenta guardar sin todos los campos de estatus
          toast({
            title: "Advertencia",
            description: "Para crear/actualizar el estatus penitenciario, complete todos los campos requeridos (Fecha de Ingreso, ID Cárcel, ID Celda, Motivo de Encarcelamiento).",
            variant: "warning"
          });
        }
      } else if (!esDelincuente && currentDelincuenteId) {
        // Si se desmarca esDelincuente y la persona era delincuente, se podría considerar eliminar el delincuente y estatus
        // Por ahora, no implementaremos esta lógica, pero es un punto a considerar.
        toast({
          title: "Información",
          description: "La persona ya no es delincuente. Si desea eliminar sus registros como delincuente, hágalo manualmente."
        });
      }

      // Si llegamos aquí, la persona (y posiblemente el delincuente/estatus) fue actualizada/creada con éxito
      toast({
        title: "Éxito",
        description: `Persona ${esDelincuente ? 'y delincuente' : ''} actualizada/creada correctamente`
      });

      router.push('/personas');
    } catch (error) {
      console.error('Error updating persona:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar la persona",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/personas/${params.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Persona</h1>
          <p className="text-muted-foreground">
            Modificar información de {personaData.nombre} {personaData.apellido_paterno}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
            <CardDescription>Información básica de la persona</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={personaData.nombre}
                  onChange={(e) => handlePersonaChange('nombre', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido_paterno">Apellido Paterno *</Label>
                <Input
                  id="apellido_paterno"
                  value={personaData.apellido_paterno}
                  onChange={(e) => handlePersonaChange('apellido_paterno', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido_materno">Apellido Materno</Label>
                <Input
                  id="apellido_materno"
                  value={personaData.apellido_materno}
                  onChange={(e) => handlePersonaChange('apellido_materno', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_de_nacimiento">Fecha de Nacimiento *</Label>
                <Input
                  id="fecha_de_nacimiento"
                  type="date"
                  value={personaData.fecha_de_nacimiento}
                  onChange={(e) => handlePersonaChange('fecha_de_nacimiento', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_de_fin">Fecha de Fin</Label>
                <Input
                  id="fecha_de_fin"
                  type="date"
                  value={personaData.fecha_de_fin}
                  onChange={(e) => handlePersonaChange('fecha_de_fin', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkbox para delincuente */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="es_delincuente"
                checked={esDelincuente}
                onCheckedChange={setEsDelincuente}
              />
              <Label htmlFor="es_delincuente">Esta persona es un delincuente</Label>
            </div>
          </CardContent>
        </Card>

        {/* Datos de Delincuente (condicional) */}
        {esDelincuente && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Datos del Delincuente</CardTitle>
                <CardDescription>Información específica del delincuente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alias">Alias</Label>
                    <Input
                      id="alias"
                      value={delincuenteData.alias}
                      onChange={(e) => handleDelincuenteChange('alias', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_detencion">Fecha de Detención</Label>
                    <Input
                      id="fecha_detencion"
                      type="date"
                      value={delincuenteData.fecha_detencion}
                      onChange={(e) => handleDelincuenteChange('fecha_detencion', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observaciones_delincuente">Antecedentes</Label>
                  <Textarea
                    id="observaciones_delincuente"
                    value={delincuenteData.antecedentes} // Cambiar de observaciones a antecedentes
                    onChange={(e) => handleDelincuenteChange('antecedentes', e.target.value)} // Cambiar de observaciones a antecedentes
                    placeholder="Antecedentes del delincuente"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatus Penitenciario</CardTitle>
                <CardDescription>Estado actual del delincuente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_ingreso">Fecha de Ingreso *</Label>
                    <Input
                      id="fecha_ingreso"
                      type="date"
                      value={estatusData.fecha_ingreso}
                      onChange={(e) => handleEstatusChange('fecha_ingreso', e.target.value)}
                      required={esDelincuente}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_salida_prevista">Fecha de Salida Prevista</Label>
                    <Input
                      id="fecha_salida_prevista"
                      type="date"
                      value={estatusData.fecha_salida_prevista}
                      onChange={(e) => handleEstatusChange('fecha_salida_prevista', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_carcel">ID Cárcel *</Label>
                    <Input
                      id="id_carcel"
                      type="number"
                      value={estatusData.id_carcel}
                      onChange={(e) => handleEstatusChange('id_carcel', e.target.value)}
                      required={esDelincuente}
                      placeholder="Ingrese el ID de la cárcel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_celda">ID Celda *</Label>
                    <Input
                      id="id_celda"
                      value={estatusData.id_celda}
                      onChange={(e) => handleEstatusChange('id_celda', e.target.value)}
                      required={esDelincuente}
                      placeholder="Ingrese el ID de la celda"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivo_encarcelamiento">Motivo de Encarcelamiento *</Label>
                  <Textarea
                    id="motivo_encarcelamiento"
                    value={estatusData.motivo_encarcelamiento}
                    onChange={(e) => handleEstatusChange('motivo_encarcelamiento', e.target.value)}
                    rows={3}
                    required={esDelincuente}
                    placeholder="Describe el motivo del encarcelamiento..."
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Actualizando..." : "Actualizar Persona"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
