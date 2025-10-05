import useSWR from 'swr';

// Función para obtener estadísticas del endpoint
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }
  const result = await response.json();
  return result.data || { personasCount: 0, delincuentesCount: 0 };
};

export interface StatsData {
  personasCount: number;
  delincuentesCount: number;
}

export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<StatsData>(
    'http://localhost:3001/api/stats',
    fetcher,
    {
      revalidateOnFocus: false, // Evitar revalidación al enfocar la ventana
      revalidateOnReconnect: false, // Evitar revalidación al reconectar
      refreshInterval: 300000, // Revalidar cada 5 minutos en lugar de cada minuto
      dedupingInterval: 60000, // Evitar peticiones duplicadas en 1 minuto
      fallbackData: { personasCount: 0, delincuentesCount: 0 },
      shouldRetryOnError: false, // No reintentar en caso de error
      focusThrottleInterval: 60000, // Limitar revalidaciones por enfoque
      loadingTimeout: 3000, // Timeout para considerar carga lenta
      errorRetryCount: 2 // Limitar número de reintentos
    }
  );

  return {
    stats: data,
    isLoading,
    isError: error,
    mutate
  };
}