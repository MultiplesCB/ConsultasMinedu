# Sistema de Consultas MINEDU

Sistema web de consulta de boletas de pago con evaluación y sincronización a la nube.

## 📁 Estructura del Proyecto

```
ConsultasMinedu/
├── index.html                          # Aplicación principal
├── config.js                           # Configuración (Supabase, Admin)
├── supabase_setup.sql                  # Schema de base de datos
├── assets/
│   ├── css/
│   │   ├── main.css                   # Estilos globales
│   │   ├── components.css             # Estilos de componentes
│   │   └── responsive.css             # Estilos responsive
│   └── js/
│       ├── app.js                     # Aplicación principal
│       ├── components/
│       │   ├── search.js              # Interfaz de búsqueda
│       │   ├── admin.js               # Panel de administración
│       │   └── viewer.js              # Visualizador de boletas
│       └── utils/
│           ├── helpers.js             # Funciones auxiliares
│           ├── parser.js              # Parser de archivos .lis
│           └── supabase.js            # Cliente Supabase
└── libs/
    └── xlsx.full.min.js               # Librería SheetJS
```

## 🚀 Instalación

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script `supabase_setup.sql` en el SQL Editor de Supabase
3. Copia tu URL y API Key (anon/public)

### 2. Configurar la Aplicación

Edita el archivo `config.js`:

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://tu-proyecto.supabase.co',
  SUPABASE_KEY: 'tu-anon-key-aqui',
  ADMIN_PASSWORD: 'admin123',  // Cambia esto
  // ... resto de configuración
};
```

### 3. Ejecutar la Aplicación

Simplemente abre `index.html` en tu navegador web. No requiere servidor web, pero se recomienda usar uno para evitar restricciones CORS:

**Opción 1: Live Server (VS Code)**
```bash
# Instala la extensión Live Server en VS Code
# Click derecho en index.html > "Open with Live Server"
```

**Opción 2: Python HTTP Server**
```bash
python -m http.server 8000
# Abre http://localhost:8000
```

**Opción 3: Node.js HTTP Server**
```bash
npx http-server -p 8000
# Abre http://localhost:8000
```

## 👥 Roles de Usuario

### Usuario (Por defecto)
- ✅ Búsqueda de boletas por DNI
- ✅ Visualización de boletas
- ✅ Información detallada de ingresos y descuentos

### Administrador
- **Contraseña por defecto:** `admin123` (cámbiala en `config.js`)
- **Panel de Administración:** Carga de archivos, parseo y sincronización.
- **Evaluación Crediticia:** Cálculo automático según norma (50%).
- **Exportación:** Descarga de datos en formato Excel.
- **Base de Datos:** Integración robusta con Supabase.

## 📦 Funcionalidades

### Carga de Archivos .lis
1. Inicia sesión como administrador
2. Ve a la pestaña "📤 Carga y Sincronización"
3. Selecciona tu archivo `.lis` o `.txt`
4. El sistema parseará automáticamente los datos
5. Verás una vista previa de los registros

### Exportar a Excel
- Después de cargar un archivo, haz clic en "📥 Descargar Excel"
- Se descargará un archivo `.xlsx` con todos los registros

### Sincronizar a Supabase
- Haz clic en "☁️ Sincronizar a Supabase"
- Los datos se subirán en lotes de 100 registros
- Verás una barra de progreso durante la sincronización

### Consultar Boletas
- Ingresa un DNI de 8 dígitos
- Haz clic en "Buscar"
- Verás la boleta completa con:
  - Información personal
  - Ingresos detallados
  - Descuentos detallados
  - Resumen financiero

## 🎨 Características Técnicas

- ✅ **HTML5, CSS3, JavaScript puro** (sin frameworks)
- ✅ **Responsive Design** (móvil, tablet, desktop)
- ✅ **Parser de archivos .lis** con soporte Latin-1
- ✅ **Integración con Supabase** (PostgreSQL)
- ✅ **Exportación a Excel** con SheetJS
- ✅ **Diseño moderno** inspirado en Material Design
- ✅ **Notificaciones toast** para feedback
- ✅ **Validación de datos** en tiempo real

## 🔧 Configuración Avanzada

### Cambiar el Tamaño de Lote para Supabase
```javascript
// En config.js
BATCH_SIZE: 100,  // Cambia este valor (50-500 recomendado)
```

### Deshabilitar Funcionalidades
```javascript
// En config.js
ENABLE_EXCEL_EXPORT: false,    // Deshabilita exportación Excel
ENABLE_SUPABASE_SYNC: false,   // Deshabilita sincronización
```

### Cambiar Contraseña de Admin
```javascript
// En config.js
ADMIN_PASSWORD: 'tu-nueva-contraseña-segura',
```

## 📝 Formato de Archivo .lis

El parser espera archivos `.lis` con el siguiente formato:

- **Línea de ID:** `1234567890 NOMBRE APELLIDO`
- **Totales:** `T HABERES: 1234.56`
- **Detalles:** `+123 CONCEPTO    1234.56`
- **Metadata:** `DNI 12345678`, `BCO. NACION 1234567890`

## 🐛 Solución de Problemas

### "Supabase no está configurado"
- Verifica que `SUPABASE_URL` y `SUPABASE_KEY` estén correctamente configurados en `config.js`
- Asegúrate de que no contengan los valores por defecto

### "Error al parsear archivo"
- Verifica que el archivo sea un `.lis` válido
- Asegúrate de que el archivo tenga codificación Latin-1 (ISO-8859-1)

### "Error en la sincronización"
- Verifica tu conexión a internet
- Revisa que el schema de Supabase esté correctamente configurado
- Verifica los permisos RLS en Supabase

### Excel no se descarga
- Verifica que el archivo `libs/xlsx.full.min.js` exista
- Abre la consola del navegador para ver errores

## 📚 Librerías Utilizadas

- **Supabase JS Client** (v2): Cliente para PostgreSQL
- **SheetJS** (v0.20.2): Exportación a Excel

## 🔒 Seguridad

- ⚠️ **Importante:** Cambia la contraseña de administrador por defecto
- ⚠️ No expongas tu `SUPABASE_KEY` en repositorios públicos
- ⚠️ Configura correctamente las políticas RLS en Supabase para producción

## 📄 Licencia

Este proyecto es de uso interno. Todos los derechos reservados.

---

**Desarrollado para:** MINEDU  
**Versión:** 1.0.0  
**Fecha:** 2024
