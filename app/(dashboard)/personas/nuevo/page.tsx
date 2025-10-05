"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { apiService } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

export default function NuevaPersonaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [esDelincuente, setEsDelincuente] = useState(false)
  
  const [personaData, setPersonaData] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    fecha_de_nacimiento: "",
    fecha_de_fin: ""
  })

  const [delincuenteData, setDelincuenteData] = useState({
    alias: "",
    fecha_detencion: "",
    antecedentes: "",
    lugar_detencion: ""
  })

  const [estatusData, setEstatusData] = useState({
    fecha_ingreso: "",
    id_carcel: "",
    id_celda: "",
    fecha_salida_prevista: "",
    motivo_encarcelamiento: ""
  })

  const handlePersonaChange = (field: string, value: string) => {
    setPersonaData(prev => ({ ...prev, [field]: value }))
  }

  const handleDelincuenteChange = (field: string, value: string) => {
    setDelincuenteData(prev => ({ ...prev, [field]: value }))
  }

  const handleEstatusChange = (field: string, value: string) => {
    setEstatusData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. Crear persona
      const personaResponse = await apiService.createPersona(personaData)
      
      if (personaResponse.error) {
        throw new Error(personaResponse.error)
      }

      const personaId = personaResponse.data.id

      // 2. Si es delincuente, crear registro de delincuente
      if (esDelincuente) {
        const delincuentePayload = {
          id_persona: personaId,
          fecha_alta_delincuente: new Date().toISOString().split('T')[0],
          alias: delincuenteData.alias || null,
          antecedentes: delincuenteData.antecedentes || null,
          fecha_detencion: delincuenteData.fecha_detencion || null,
          lugar_detencion: delincuenteData.lugar_detencion || null
        }

        const delincuenteResponse = await apiService.createDelincuente(delincuentePayload)
        
        if (delincuenteResponse.error) {
          throw new Error(delincuenteResponse.error)
        }

        // 3. Crear estatus penitenciario si hay datos completos
        if (estatusData.fecha_ingreso && estatusData.id_carcel && estatusData.id_celda && estatusData.motivo_encarcelamiento) {
          const estatusPayload = {
            id_delincuente: personaId,
            id_carcel: parseInt(estatusData.id_carcel),
            id_celda: estatusData.id_celda,
            fecha_ingreso: estatusData.fecha_ingreso,
            fecha_salida_prevista: estatusData.fecha_salida_prevista || null,
            motivo_encarcelamiento: estatusData.motivo_encarcelamiento
          }

          const estatusResponse = await apiService.createEstatus(estatusPayload)
          
          if (estatusResponse.error) {
            throw new Error(estatusResponse.error)
          }
        }
      }

      toast({
        title: "Éxito",
        description: `Persona ${esDelincuente ? 'y delincuente' : ''} registrada correctamente`
      })

      router.push('/personas')
    } catch (error) {
      console.error('Error creating persona:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar la persona",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Persona</h1>
        <p className="text-muted-foreground">Registrar una nueva persona en el sistema</p>
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
                <Label htmlFor="apellido_materno">Apellido Materno *</Label>
                <Input
                  id="apellido_materno"
                  value={personaData.apellido_materno}
                  onChange={(e) => handlePersonaChange('apellido_materno', e.target.value)}
                  required
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
                      placeholder="Alias o apodo (opcional)"
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
                  <div className="space-y-2">
                    <Label htmlFor="lugar_detencion">Lugar de Detención</Label>
                    <Input
                      id="lugar_detencion"
                      value={delincuenteData.lugar_detencion}
                      onChange={(e) => handleDelincuenteChange('lugar_detencion', e.target.value)}
                      placeholder="Lugar donde fue detenido (opcional)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="antecedentes">Antecedentes</Label>
                  <Textarea
                    id="antecedentes"
                    value={delincuenteData.antecedentes}
                    onChange={(e) => handleDelincuenteChange('antecedentes', e.target.value)}
                    placeholder="Antecedentes penales (opcional)"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatus Penitenciario</CardTitle>
                <CardDescription>Estado actual del delincuente (opcional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
                    <Input
                      id="fecha_ingreso"
                      type="date"
                      value={estatusData.fecha_ingreso}
                      onChange={(e) => handleEstatusChange('fecha_ingreso', e.target.value)}
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
                    <Label htmlFor="id_carcel">ID Cárcel</Label>
                    <Input
                      id="id_carcel"
                      type="number"
                      value={estatusData.id_carcel}
                      onChange={(e) => handleEstatusChange('id_carcel', e.target.value)}
                      placeholder="Ingrese el ID de la cárcel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id_celda">ID Celda</Label>
                    <Input
                      id="id_celda"
                      value={estatusData.id_celda}
                      onChange={(e) => handleEstatusChange('id_celda', e.target.value)}
                      placeholder="Ingrese el ID de la celda"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivo_encarcelamiento">Motivo de Encarcelamiento</Label>
                  <Textarea
                    id="motivo_encarcelamiento"
                    value={estatusData.motivo_encarcelamiento}
                    onChange={(e) => handleEstatusChange('motivo_encarcelamiento', e.target.value)}
                    placeholder="Describe el motivo del encarcelamiento..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Registrando..." : "Registrar Persona"}
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
