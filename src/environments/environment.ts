// src/environments/environment.prod.ts (PRODUCCIÓN - DEFINITIVO)
// ⚠️ NO incluir /api/ al final - Los servicios lo agregan automáticamente
export const environment = {
  production: true,
  backendLogin: 'https://tesis-fonokids-joaquin-backend-login-production.up.railway.app',  // ✅ SIN /api/
  backendApi: 'https://tesis-fonokids-joaquin-backend-ia-production.up.railway.app'       // ✅ SIN /api/
};

// RESULTADO:
// auth.service: https://...backend-login...railway.app + /api/auth = https://...backend-login...railway.app/api/auth ✅
// historial.service: https://...backend-ia...railway.app + /api/historial-actividades = https://...backend-ia...railway.app/api/historial-actividades ✅