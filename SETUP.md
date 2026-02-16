# INSTRUCCIONES DE INSTALACIÓN

## ⚠️ Paso Importante: Descargar SheetJS

La librería SheetJS es necesaria para la funcionalidad de exportación a Excel. Sigue estos pasos:

### Opción 1: Descarga Manual (Recomendado)

1. Visita: https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js
2. Guarda el archivo como `xlsx.full.min.js` en la carpeta `libs/`
3. La ruta final debe ser: `ConsultasMinedu/libs/xlsx.full.min.js`

### Opción 2: Usar CDN (Alternativa)

Si no puedes descargar el archivo, puedes usar la versión CDN:

1. Abre `index.html`
2. Busca la línea:
   ```html
   <script src="libs/xlsx.full.min.js"></script>
   ```
3. Reemplázala con:
   ```html
   <script src="https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"></script>
   ```

## 📋 Configuración de Supabase

1. Crea una cuenta en https://supabase.com
2. Crea un nuevo proyecto
3. Ve a SQL Editor y ejecuta el contenido de `supabase_setup.sql`
4. Ve a Settings > API
5. Copia:
   - Project URL
   - anon/public API key
6. Pega estos valores en `config.js`:
   ```javascript
   SUPABASE_URL: 'tu-url-aqui',
   SUPABASE_KEY: 'tu-key-aqui',
   ```

## 🚀 Ejecutar la Aplicación

### Método 1: Abrir directamente
- Doble clic en `index.html`
- ⚠️ Algunas funciones pueden no funcionar por restricciones CORS

### Método 2: Servidor Local (Recomendado)

**Con Python:**
```bash
cd ConsultasMinedu
python -m http.server 8000
```
Luego abre: http://localhost:8000

**Con Node.js:**
```bash
cd ConsultasMinedu
npx http-server -p 8000
```
Luego abre: http://localhost:8000

**Con VS Code:**
1. Instala la extensión "Live Server"
2. Click derecho en `index.html`
3. Selecciona "Open with Live Server"

## ✅ Verificación

1. Abre la consola del navegador (F12)
2. Deberías ver:
   - ✅ Supabase is configured (si configuraste Supabase)
   - ✅ SheetJS library loaded
   - ✅ Supabase client library loaded
   - ✅ Application initialized successfully

## 🔐 Acceso de Administrador

- **Usuario:** No requiere login
- **Contraseña Admin:** `admin123` (cámbiala en `config.js`)

## 📝 Primer Uso

1. Inicia sesión como admin (sidebar izquierdo)
2. Ve a "📤 Carga y Sincronización"
3. Selecciona un archivo `.lis`
4. Espera a que se procese
5. Descarga Excel o sincroniza a Supabase
6. Prueba la búsqueda por DNI

## ❓ Problemas Comunes

### "SheetJS library not loaded"
- Descarga `xlsx.full.min.js` manualmente (ver arriba)
- O usa la versión CDN

### "Supabase not configured"
- Actualiza `config.js` con tus credenciales
- Verifica que el schema esté creado en Supabase

### La página no carga
- Usa un servidor local (no abras el archivo directamente)
- Verifica que todos los archivos estén en su lugar

## 📁 Archivos Necesarios

Verifica que tengas esta estructura:

```
ConsultasMinedu/
├── index.html ✅
├── config.js ✅
├── supabase_setup.sql ✅
├── README.md ✅
├── SETUP.md ✅ (este archivo)
├── assets/
│   ├── css/
│   │   ├── main.css ✅
│   │   ├── components.css ✅
│   │   └── responsive.css ✅
│   └── js/
│       ├── app.js ✅
│       ├── components/
│       │   ├── search.js ✅
│       │   ├── admin.js ✅
│       │   └── viewer.js ✅
│       └── utils/
│           ├── helpers.js ✅
│           ├── parser.js ✅
│           └── supabase.js ✅
└── libs/
    └── xlsx.full.min.js ⚠️ (descargar manualmente)
```

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación estará lista para usar.
