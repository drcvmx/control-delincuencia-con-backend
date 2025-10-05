const bcrypt = require('bcryptjs');
const { supabase } = require('../src/config/database');

async function debugLogin() {
  try {

    // Hashes actuales de la base de datos
    const adminHash = "$2a$12$LQv3c1yqBWVHxkd0LQ1lqe7/d9hHQ8vUjbQVr/HsuXgXGQ9G/uyC.";
    const consultorHash = "$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";

    
    // Probar admin
    const adminTest1 = await bcrypt.compare('admin123', adminHash);
    const adminTest2 = await bcrypt.compare('admin', adminHash);
    const adminTest3 = await bcrypt.compare('123', adminHash);
    

    // Probar consultor
    const consultorTest1 = await bcrypt.compare('consultor123', consultorHash);
    const consultorTest2 = await bcrypt.compare('consultor', consultorHash);
    const consultorTest3 = await bcrypt.compare('123', consultorHash);
    

    // Generar nuevos hashes y probarlos
    const newAdminHash = await bcrypt.hash('admin123', 12);
    const newConsultorHash = await bcrypt.hash('consultor123', 12);
    
    
    // Verificar que los nuevos hashes funcionan
    const newAdminTest = await bcrypt.compare('admin123', newAdminHash);
    const newConsultorTest = await bcrypt.compare('consultor123', newConsultorHash);
    

    // Actualizar en la base de datos
    
    const { error: adminError } = await supabase
      .from('usuario')
      .update({
        password_hash: newAdminHash,
        intentos_fallidos: 0,
        bloqueado_hasta: null
      })
      .eq('username', 'admin');

    const { error: consultorError } = await supabase
      .from('usuario')
      .update({
        password_hash: newConsultorHash,
        intentos_fallidos: 0,
        bloqueado_hasta: null
      })
      .eq('username', 'consultor');

    if (adminError) {
      console.error('❌ Error actualizando admin:', adminError);
    } else {
    }

    if (consultorError) {
      console.error('❌ Error actualizando consultor:', consultorError);
    } else {
    }


  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

debugLogin();