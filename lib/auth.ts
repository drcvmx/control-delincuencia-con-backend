import { apiService } from './api';

export interface User {
  id: string;
  username: string;
  email: string;
  roles: Array<{id: number, nombre: string}>; // ✅ Cambiar de string a number
  permissions: string[];
  name?: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_ultimo_acceso?: string;
}

// Función principal de login que usa la página
export async function login(username: string, password: string): Promise<void> {
  const response = await apiService.login(username, password);
  
  if (response.error) {
    throw new Error(response.error);
  }

  if (response.data) {
    // Guardar usuario y tokens
    setCurrentUser(response.data.user);
    // Los tokens se guardan automáticamente en apiService
  } else {
    throw new Error('Error de autenticación');
  }
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Función para autenticar usuario con JWT - CORREGIDA
export async function authenticateUser(
  username: string, 
  password: string
): Promise<User | null> {
  try {
    const response = await apiService.login(username, password);
    
    // 🔍 DEBUG: Ver la respuesta del backend
    console.log('🔍 authenticateUser - Backend response:', {
      response,
      user: response.user,
      userRoles: response.user?.roles,
      rolesLength: response.user?.roles?.length || 0
    });
    
    if (response.user) {
      setCurrentUser(response.user);
      return response.user;
    }
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  const userData = localStorage.getItem("currentUser");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      
      // 🔍 DEBUG: Ver exactamente qué datos tenemos
      console.log('🔍 getCurrentUser debug:', {
        rawUserData: userData,
        parsedUser: user,
        userRoles: user?.roles,
        rolesLength: user?.roles?.length || 0
      });
      
      return user;
    } catch (error) {
      console.error('🔍 Error parsing user data:', error);
      return null;
    }
  }
  
  console.log('🔍 No user data in localStorage');
  return null;
}

export function setCurrentUser(user: User): void {
  if (typeof window !== "undefined") {
    // 🔍 DEBUG: Ver qué datos estamos guardando
    console.log('🔍 setCurrentUser debug:', {
      user,
      userRoles: user?.roles,
      rolesLength: user?.roles?.length || 0
    });
    
    localStorage.setItem("currentUser", JSON.stringify(user));
  }
}

export async function logout(): Promise<void> {
  try {
    await apiService.logout();
  } catch (error) {
    console.error('Error during logout:', error);
  }
  
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export function isAuthenticated(): boolean {
  const user = getCurrentUser();
  const token = getAuthToken();
  return user !== null && token !== null;
}

// ✅ FUNCIONES CORREGIDAS PARA ROLES
export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  if (!user?.roles) {
    console.log('🔍 hasRole: No user or roles found');
    return false;
  }
  
  const hasRoleResult = user.roles.some(r => 
    r.nombre === role || 
    r.nombre.toLowerCase() === role.toLowerCase()
  );
  
  console.log('🔍 hasRole debug:', {
    searchingFor: role,
    userRoles: user.roles.map(r => r.nombre),
    result: hasRoleResult
  });
  
  return hasRoleResult;
}

export function hasPermission(modulo: string, accion: string): boolean {
  const user = getCurrentUser();
  if (!user?.permissions) return false;
  
  const permissionKey = `${modulo}-${accion}`;
  return user.permissions.includes(permissionKey) || 
         user.permissions.includes(`${modulo}:${accion}`);
}

export function isAdmin(): boolean {
  return hasRole('administrador');
}

export function isOperador(): boolean {
  return hasRole('operador');
}

export function isUsuario(): boolean {
  return hasRole('usuario');
}

// Función para obtener el rol principal del usuario
export function getPrimaryRole(): string | null {
  const user = getCurrentUser();
  if (!user?.roles || user.roles.length === 0) return null;
  
  // Prioridad: administrador > operador > usuario
  if (user.roles.some(r => r.nombre === 'administrador')) return 'administrador';
  if (user.roles.some(r => r.nombre === 'operador')) return 'operador';
  if (user.roles.some(r => r.nombre === 'usuario')) return 'usuario';
  
  return user.roles[0].nombre;
}

// Función para verificar si puede crear
export function canCreate(modulo: string): boolean {
  return hasPermission(modulo, 'crear') || isAdmin();
}

// Función para verificar si puede editar
export function canUpdate(modulo: string): boolean {
  return hasPermission(modulo, 'actualizar') || isAdmin();
}

// Función para verificar si puede eliminar
export function canDelete(modulo: string): boolean {
  return hasPermission(modulo, 'eliminar') || isAdmin();
}

// Función para verificar si puede leer
export function canRead(modulo: string): boolean {
  return hasPermission(modulo, 'leer') || isAdmin() || isUsuario();
}

// Función para refrescar el token automáticamente
export async function refreshAuthToken(): Promise<boolean> {
  try {
    const response = await apiService.refreshToken();
    return !response.error;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

// Interceptor para manejar tokens expirados
export function setupTokenInterceptor() {
  if (typeof window === "undefined") return;

  // Verificar token cada 5 minutos
  setInterval(async () => {
    if (isAuthenticated()) {
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        // Si no se puede refrescar, cerrar sesión
        await logout();
        window.location.href = '/login';
      }
    }
  }, 5 * 60 * 1000); // 5 minutos
}
  