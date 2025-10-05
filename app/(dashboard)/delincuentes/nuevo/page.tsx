"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiService } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface Persona {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  cedula: string;
}

export default function NuevoDelincuentePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [delincuentesExistentes, setDelincuentesExistentes] = useState<number[]>([])
  
  const [formData, setFormData] = useState({
    id_persona: "",
    fecha_alta_delincuente: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    alias: "",
    antecedentes: "",
    fecha_detencion: "",
    lugar_detencion: ""
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {

      
      const [personasResponse, delincuentesResponse] = await Promise.all([
        apiService.getPersonas(),
        apiService.getDelincuentes()
      ])



      // CORREGIDO: acceder correctamente a los datos
      if (personasResponse.data && personasResponse.data.personas) {
        setPersonas(personasResponse.data.personas)
      }

      if (delincuentesResponse.data && delincuentesResponse.data.delincuentes) {
        const existentes = delincuentesResponse.data.delincuentes.map((d: any) => d.id_persona)
        setDelincuentesExistentes(existentes)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Preparar datos según lo que espera el backend
      const delincuenteData = {
        id_persona: parseInt(formData.id_persona),
        fecha_alta_delincuente: formData.fecha_alta_delincuente,
        alias: formData.alias || null,
        antecedentes: formData.antecedentes || null,
        fecha_detencion: formData.fecha_detencion || null,
        lugar_detencion: formData.lugar_detencion || null
      }



      const response = await apiService.createDelincuente(delincuenteData)



      if (response.error) {
        throw new Error(response.error)
      }

      toast({
        title: "Éxito",
        description: response.message || "Delincuente registrado correctamente"
      })

      router.push('/delincuentes')
    } catch (error) {
      console.error('Error creating delincuente:', error)
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const personasDisponibles = personas.filter(p => !delincuentesExistentes.includes(p.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Delincuente</h1>
        <p className="text-muted-foreground">Registrar una nueva persona como delincuente</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Delincuente</CardTitle>
          <CardDescription>
            Complete los datos para registrar un nuevo delincuente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="id_persona">Persona *</Label>
              <Select
                value={formData.id_persona}
                onValueChange={(value) => setFormData(prev => ({ ...prev, id_persona: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar persona" />
                </SelectTrigger>
                <SelectContent>
                  {personasDisponibles.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id.toString()}>
                      {persona.nombre} {persona.apellido_paterno} {persona.apellido_materno} - {persona.cedula}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_alta_delincuente">Fecha de Alta como Delincuente *</Label>
              <Input
                id="fecha_alta_delincuente"
                type="date"
                value={formData.fecha_alta_delincuente}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_alta_delincuente: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alias">Alias</Label>
              <Input
                id="alias"
                value={formData.alias}
                onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                placeholder="Alias o apodo (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="antecedentes">Antecedentes</Label>
              <Textarea
                id="antecedentes"
                value={formData.antecedentes}
                onChange={(e) => setFormData(prev => ({ ...prev, antecedentes: e.target.value }))}
                placeholder="Antecedentes penales (opcional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_detencion">Fecha de Detención</Label>
              <Input
                id="fecha_detencion"
                type="date"
                value={formData.fecha_detencion}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_detencion: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lugar_detencion">Lugar de Detención</Label>
              <Input
                id="lugar_detencion"
                value={formData.lugar_detencion}
                onChange={(e) => setFormData(prev => ({ ...prev, lugar_detencion: e.target.value }))}
                placeholder="Lugar donde fue detenido (opcional)"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Registrando..." : "Registrar Delincuente"}
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
        </CardContent>
      </Card>
    </div>
  )
}


