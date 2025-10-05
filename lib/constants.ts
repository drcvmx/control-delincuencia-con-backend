export const CARCELES = {
    1: "El Altiplano (oficialmente CEFERESO n.º 1, en Almoloya de Juárez, Estado de México)",
    2: "Puente Grande (oficialmente CEFERESO n.º 2 Occidente, en Jalisco)",
    3: "Islas Marías (antigua colonia penal federal, en Nayarit)",
    4: "Reclusorio Norte (Ciudad de México)",
    5: "Reclusorio Oriente (Ciudad de México)",
    6: "Reclusorio Sur (Ciudad de México)",
    7: "El Hongo (en Baja California)",
    8: "Cereso de Cancún (Centro de Reinserción Social Benito Juárez, en Quintana Roo)",
    9: "Cárcel Distrital de Tizayuca (en Hidalgo)",
    10: "Cereso de Acapulco (Centro Regional de Reinserción Social de Acapulco de Juárez, en Guerrero)",
  } as const
  
  export type CarcelId = keyof typeof CARCELES