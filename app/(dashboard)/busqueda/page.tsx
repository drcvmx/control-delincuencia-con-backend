"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import type { Persona } from "@/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"

interface SearchFormValues {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  fecha_de_nacimiento: string
  fecha_de_fin: string
  id: string
}

export default function BusquedaPage() {
  const [isSearching, setIsSearching] = useState(false)
  const [resultados, setResultados] = useState<Persona[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const form = useForm<SearchFormValues>({
    defaultValues: {
      nombre: "",
      apellido_paterno: "",
      apellido_materno: "",
      fecha_de_nacimiento: "",
      fecha_de_fin: "",
      id: "",
    },
  })

  async function onSubmit(values: SearchFormValues) {
    try {
      setIsSearching(true)
      setHasSearched(true)

      let query = supabase.from("persona").select("*")

      if (values.id) {
        query = query.eq("id", values.id)
      }

      if (values.nombre) {
        query = query.ilike("nombre", `%${values.nombre}%`)
      }

      if (values.apellido_paterno) {
        query = query.ilike("apellido_paterno", `%${values.apellido_paterno}%`)
      }

      if (values.apellido_materno) {
        query = query.ilike("apellido_materno", `%${values.apellido_materno}%`)
      }

      if (values.fecha_de_nacimiento) {
        query = query.eq("fecha_de_nacimiento", values.fecha_de_nacimiento)
      }

      if (values.fecha_de_fin) {
        query = query.eq("fecha_de_fin", values.fecha_de_fin)
      }

      const { data, error } = await query.order("apellido_paterno", { ascending: true })

      if (error) {
        throw error
      }

      setResultados(data as Persona[])
    } catch (error) {
      console.error("Error al buscar:", error)
      alert("Error al realizar la búsqueda. Por favor, inténtalo de nuevo.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Búsqueda Avanzada</h1>
        <p className="text-muted-foreground">Busca personas por múltiples criterios</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criterios de Búsqueda</CardTitle>
          <CardDescription>Ingresa uno o más criterios para buscar personas</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID</FormLabel>
                      <FormControl>
                        <Input placeholder="ID" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apellido_paterno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido Paterno</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellido Paterno" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apellido_materno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido Materno</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellido Materno" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecha_de_nacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecha_de_fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de la Búsqueda</CardTitle>
            <CardDescription>
              {resultados.length === 0
                ? "No se encontraron resultados para los criterios especificados"
                : `Se encontraron ${resultados.length} resultado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resultados.length > 0 && (
              <div className="border rounded-md">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium">ID</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Nombre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Apellido Paterno</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Apellido Materno</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Fecha de Nacimiento</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {resultados.map((persona) => (
                        <tr
                          key={persona.id}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle">{persona.id}</td>
                          <td className="p-4 align-middle">{persona.nombre}</td>
                          <td className="p-4 align-middle">{persona.apellido_paterno}</td>
                          <td className="p-4 align-middle">{persona.apellido_materno}</td>
                          <td className="p-4 align-middle">
                            {persona.fecha_de_nacimiento
                              ? format(new Date(persona.fecha_de_nacimiento), "dd/MM/yyyy", { locale: es })
                              : "N/A"}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center gap-2">
                              <Link href={`/personas/${persona.id}`}>
                                <Button variant="outline" size="sm">
                                  Ver
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
