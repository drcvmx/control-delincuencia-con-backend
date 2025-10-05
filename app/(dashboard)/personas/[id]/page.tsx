"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from "@/components/role-guard"
import { apiService } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Edit, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

interface PersonaDetalle {
  persona: any;
  delincuente?: any;
  crimenes?: any[];
  historialPenitenciario?: any[];
  estatusActual?: any;
}

export default function PersonaDetallePage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const [detalles, setDetalles] = useState<PersonaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPersonaDetalle();
  }, [params.id]);

  const loadPersonaDetalle = async () => {
    try {
      setLoading(true);
      setError(null);



      // Obtener datos de la persona
      const personaResponse = await apiService.getPersona(parseInt(params.id));
      


      if (personaResponse.error || !personaResponse.data) {
        throw new Error("No se pudo cargar la información de la persona");
      }

      const persona = personaResponse.data;

      // Primero verificar si es delincuente consultando la lista de delincuentes
      let delincuenteData = null;
      try {
        const delincuentesResponse = await apiService.getDelincuentes();
        const esDelincuenteEnLista = delincuentesResponse.data?.delincuentes?.find(
          (d: any) => d.id_persona === parseInt(params.id)
        );

        // Solo si es delincuente, obtener información completa
        if (esDelincuenteEnLista) {
          const delincuenteResponse = await apiService.getDelincuenteById(params.id);

          
          if (delincuenteResponse.data && !delincuenteResponse.error) {
            delincuenteData = delincuenteResponse.data;
          }
        }
      } catch (delincuenteError) {

      }

      const detallesPersona = {
        persona,
        delincuente: delincuenteData?.delincuente || null,
        crimenes: delincuenteData?.crimenes || [],
        historialPenitenciario: delincuenteData?.historialPenitenciario || [],
        estatusActual: delincuenteData?.estatusActual || null
      };


      
      setDetalles(detallesPersona);

    } catch (error) {
      console.error('Error cargando detalles de persona:', error);
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      setError(errorMsg);
      toast({
        title: "Error",
        description: "Error al cargar los detalles de la persona",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!detalles?.persona) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Persona no encontrada</h2>
              <p className="text-gray-600 mb-4">No se pudo encontrar la información de esta persona.</p>
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { persona, delincuente, crimenes, historialPenitenciario, estatusActual } = detalles;
  const esDelincuente = !!delincuente;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {persona.nombre} {persona.apellido_paterno} {persona.apellido_materno}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={esDelincuente ? "destructive" : "secondary"}>
                {esDelincuente ? "Delincuente" : "Civil"}
              </Badge>
              {persona.fecha_de_fin && (
                <Badge variant="outline">Fallecido</Badge>
              )}
            </div>
          </div>
        </div>
        <RoleGuard allowedRoles={['administrador', 'operador']}>
          <Link href={`/personas/${params.id}/editar`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        </RoleGuard>
      </div>

      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Nombre Completo</label>
            <p className="text-sm">
              {persona.nombre} {persona.apellido_paterno} {persona.apellido_materno}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Fecha de Nacimiento</label>
            <p className="text-sm">
              {persona.fecha_de_nacimiento ? 
                format(new Date(persona.fecha_de_nacimiento), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 
                "No disponible"
              }
            </p>
          </div>
          {persona.fecha_de_fin && (
            <div>
              <label className="text-sm font-medium text-gray-500">Fecha de Defunción</label>
              <p className="text-sm">
                {format(new Date(persona.fecha_de_fin), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-500">Estado Vital</label>
            <p className="text-sm">
              {persona.fecha_de_fin ? "Fallecido" : "Vivo"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Información de Delincuente */}
      {esDelincuente && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información de Delincuente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Alias</label>
                <p className="text-sm">{delincuente.alias || "No especificado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Alta</label>
                <p className="text-sm">
                  {delincuente.fecha_alta_delincuente ? 
                    format(new Date(delincuente.fecha_alta_delincuente), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 
                    "No especificada"
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Detención</label>
                <p className="text-sm">
                  {delincuente.fecha_detencion ? 
                    format(new Date(delincuente.fecha_detencion), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 
                    "No especificada"
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Lugar de Detención</label>
                <p className="text-sm">{delincuente.lugar_detencion || "No especificado"}</p>
              </div>
              {delincuente.antecedentes && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Antecedentes</label>
                  <p className="text-sm">{delincuente.antecedentes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatus Penitenciario Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Estatus Penitenciario Actual</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

              
              {estatusActual ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estado</label>
                    <Badge variant={estatusActual.fecha_salida_real ? "secondary" : "destructive"}>
                      {estatusActual.fecha_salida_real ? "Liberado" : "Recluido"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cárcel</label>
                    <p className="text-sm">{estatusActual.nombre_carcel || "No especificada"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Celda</label>
                    <p className="text-sm">{estatusActual.id_celda || "No especificada"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha de Ingreso</label>
                    <p className="text-sm">
                      {estatusActual.fecha_ingreso ? 
                        format(new Date(estatusActual.fecha_ingreso), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 
                        "No especificada"
                      }
                    </p>
                  </div>
                  {estatusActual.fecha_salida_prevista && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de Salida Prevista</label>
                      <p className="text-sm">
                        {format(new Date(estatusActual.fecha_salida_prevista), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                  {estatusActual.fecha_salida_real && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de Salida Real</label>
                      <p className="text-sm">
                        {format(new Date(estatusActual.fecha_salida_real), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Motivo de Encarcelamiento</label>
                    <p className="text-sm">{estatusActual.motivo_encarcelamiento || "No especificado"}</p>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">No hay información de estatus penitenciario disponible.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Crímenes */}
          {crimenes && crimenes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Crímenes</CardTitle>
                <CardDescription>
                  Crímenes asociados a este delincuente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {crimenes.map((crimen, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Descripción del Crimen</label>
                          <p className="text-sm">{crimen.crimen?.descripcion || "No especificada"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Fecha del Crimen</label>
                          <p className="text-sm">
                            {crimen.crimen?.fecha_ocurrencia ? 
                              format(new Date(crimen.crimen.fecha_ocurrencia), "dd 'de' MMMM 'de' yyyy", { locale: es }) : 
                              "No especificada"
                            }
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Ubicación</label>
                          <p className="text-sm">{crimen.crimen?.ubicacion || "No especificada"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Rol en el Crimen</label>
                          <p className="text-sm">{crimen.rol || "No especificado"}</p>
                        </div>
                        {crimen.fecha_participacion && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Fecha de Participación</label>
                            <p className="text-sm">
                              {format(new Date(crimen.fecha_participacion), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial Penitenciario */}
          {historialPenitenciario && historialPenitenciario.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historial Penitenciario</CardTitle>
                <CardDescription>
                  Historial completo de encarcelamientos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historialPenitenciario.map((periodo, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{periodo.carcel?.nombre_oficial || "Cárcel no especificada"}</h4>
                        <Badge variant={periodo.fecha_salida_real ? "secondary" : "destructive"}>
                          {periodo.fecha_salida_real ? "Finalizado" : "Activo"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="font-medium text-gray-500">Celda:</label>
                          <span className="ml-2">{periodo.id_celda || "No especificada"}</span>
                        </div>
                        <div>
                          <label className="font-medium text-gray-500">Fecha de Ingreso:</label>
                          <span className="ml-2">
                            {periodo.fecha_ingreso ? 
                              format(new Date(periodo.fecha_ingreso), "dd/MM/yyyy", { locale: es }) : 
                              "No especificada"
                            }
                          </span>
                        </div>
                        {periodo.fecha_salida_prevista && (
                          <div>
                            <label className="font-medium text-gray-500">Salida Prevista:</label>
                            <span className="ml-2">
                              {format(new Date(periodo.fecha_salida_prevista), "dd/MM/yyyy", { locale: es })}
                            </span>
                          </div>
                        )}
                        {periodo.fecha_salida_real && (
                          <div>
                            <label className="font-medium text-gray-500">Salida Real:</label>
                            <span className="ml-2">
                              {format(new Date(periodo.fecha_salida_real), "dd/MM/yyyy", { locale: es })}
                            </span>
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="font-medium text-gray-500">Motivo:</label>
                          <span className="ml-2">{periodo.motivo_encarcelamiento || "No especificado"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

