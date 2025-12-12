# DigiPlus Indoor Tracking System

Sistema de monitoreo en tiempo real de dispositivos en espacios interiores mediante tecnología de beacons BLE (Bluetooth Low Energy) y trilateración. Diseñado para rastrear la ubicación precisa de dispositivos IoT dentro de instalaciones cerradas.

## 🚀 Características

- **Tracking Indoor en Tiempo Real**: Monitoreo continuo de la ubicación de dispositivos mediante beacons BLE
- **Mapa Interactivo**: Visualización en tiempo real del plano del edificio con Konva
- **Trilateración Inteligente**: Cálculo de posición mediante trilateración y método de centroide como fallback
- **Estabilización de Posición**: Sistema avanzado que evita "saltos" visuales por fluctuaciones de señal RSSI
- **Integración LoRaWAN**: Recepción de datos mediante webhooks de The Things Network (TTN)
- **Autenticación y Roles**: Sistema de usuarios con NextAuth y control de acceso basado en roles
- **Monitoreo de Batería**: Seguimiento del nivel de batería de cada dispositivo
- **Actualizaciones en Tiempo Real**: Sincronización automática mediante Supabase Realtime

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 15** - Framework de React con App Router
- **React 19** - Biblioteca de UI
- **Konva** - Canvas 2D para visualización del mapa indoor
- **Tailwind CSS 4** - Framework de estilos
- **Radix UI** - Componentes UI accesibles
- **Heroicons** - Iconos
- **Sonner** - Notificaciones toast

### Backend
- **Next.js API Routes** - Endpoints del servidor
- **Supabase** - Base de datos PostgreSQL y Realtime subscriptions
- **NextAuth.js** - Autenticación y autorización
- **bcryptjs** - Encriptación de contraseñas

### Integración IoT
- **The Things Network (TTN)** - Plataforma LoRaWAN para recepción de datos
- **Webhooks** - Recepción de datos de dispositivos IoT

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase (para base de datos)
- Cuenta de The Things Network (para recepción de datos LoRaWAN)
- Acceso a dispositivos IoT con beacons BLE configurados

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/digiplus-indoor-tracking.git
   cd digiplus-indoor-tracking
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env.local`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=tu_secret_key_generada

   # The Things Network (opcional, para desarrollo local)
   TTN_WEBHOOK_URL=https://tu-app.ttn.com/api/v3
   ```

4. **Configurar base de datos**
   
   Ejecutar los scripts SQL necesarios en Supabase para crear las tablas:
   - `users` - Usuarios del sistema
   - `devices` - Dispositivos IoT
   - `data` - Datos de posición y telemetría
   - Funciones RPC: `get_latest_data_per_device`, `get_data_by_device_and_date`

5. **Configurar beacons**
   
   Editar `lib/beacons.js` con las coordenadas y MAC addresses de tus beacons:
   ```javascript
   export const beacons = [
     {
       name: "Beacon 1",
       mac: "E14BC6C20F37",
       x: 33.5,  // coordenada X en metros
       y: 1,     // coordenada Y en metros
       color: "red",
       background: "bg-red-500"
     },
     // ... más beacons
   ];
   ```

6. **Configurar dispositivos permitidos**
   
   Editar `utils/CONFIG.js`:
   ```javascript
   export const ALLOWED_DEVICES = [
     "eppindoor01",
     "eppindoor02",
     // ... más dispositivos
   ];
   ```

7. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

8. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 🏗️ Arquitectura del Sistema

### Componentes Principales

- **`IndoorKonva`**: Componente principal de visualización del mapa indoor con canvas Konva
- **`Dashboard`**: Panel principal con vista general de todos los dispositivos
- **`DevicesPage`**: Lista de dispositivos con estado y batería
- **`DeviceDetails`**: Vista detallada de un dispositivo con historial de posiciones
- **`useRealtimePositions`**: Hook personalizado para suscripción a actualizaciones en tiempo real

### Flujo de Datos

1. **Dispositivo IoT** → Envía datos de beacons BLE mediante LoRaWAN
2. **The Things Network** → Recibe y procesa los datos LoRaWAN
3. **Webhook** (`/api/webhook/route.js`) → Recibe datos de TTN
4. **`insertData`** → Procesa y calcula posición mediante trilateración/centroide
5. **Estabilización** → Valida cambios significativos antes de actualizar posición
6. **Supabase** → Almacena datos en base de datos
7. **Supabase Realtime** → Notifica cambios a clientes suscritos
8. **Frontend** → Actualiza visualización en tiempo real

## 🔧 Configuración Avanzada

### Parámetros de Trilateración

Editar en `app/actions/data.js`:

```javascript
const MIN_RSSI_FOR_TRILAT = -90;  // RSSI mínimo para trilateración confiable
const MAX_DISTANCE = 40;          // Distancia máxima en metros
const MAX_MEAN_ERROR = 5;         // Error promedio máximo aceptable (metros)
```

### Parámetros de Estabilización de Posición

Editar en `app/actions/data.js`:

```javascript
const MIN_RSSI_CHANGE_THRESHOLD = 5;  // Cambio mínimo en dBm para considerar movimiento
const MIN_DISTANCE_CHANGE = 1.5;       // Distancia mínima en metros para actualizar posición
```

**Explicación de la estabilización:**
- El sistema compara los valores RSSI actuales con los anteriores
- Solo actualiza la posición si:
  - El cambio promedio de RSSI es ≥ 5 dBm **Y** la nueva posición está ≥ 1.5m de distancia
  - **O** el cambio de RSSI es ≥ 10 dBm (movimiento muy claro)
- Esto evita "saltos" visuales causados por fluctuaciones normales de señal

### Dimensiones del Plano

Editar en `app/actions/data.js` y `app/components/IndoorKonva.jsx`:

```javascript
const REAL_WIDTH = 40;   // Ancho del espacio en metros
const REAL_HEIGHT = 30;  // Alto del espacio en metros
```

### Suavizado de Movimiento en Frontend

Editar en `hooks/useRealtimePositions.jsx`:

```javascript
const ALPHA = 0.25;      // Factor de suavizado (0.1 muy suave, 0.5 rápido)
const MIN_MOVE = 3;      // Distancia mínima en metros para considerar movimiento
```

## 📡 Integración con The Things Network

### Configuración del Webhook

1. En la consola de TTN, crear una integración Webhook
2. URL del webhook: `https://tu-dominio.com/api/webhook`
3. Método: POST
4. Headers: `Content-Type: application/json`

### Estructura de Datos Esperada

El webhook espera recibir datos en formato TTN:

```json
{
  "end_device_ids": {
    "device_id": "eppindoor01",
    "dev_eui": "A81758FFFE051234"
  },
  "uplink_message": {
    "decoded_payload": {
      "batt_level": "85%",
      "pos_data": [
        {
          "mac": "E14BC6C20F37",
          "rssi": "-65dBm"
        },
        {
          "mac": "E146F59DB8DC",
          "rssi": "-72dBm"
        }
      ]
    }
  }
}
```

### Procesamiento de Datos

El sistema procesa los datos de la siguiente manera:

1. **Validación**: Verifica que el `device_id` esté en la lista de dispositivos permitidos
2. **Cálculo de Distancias**: Convierte RSSI a distancia usando el modelo de propagación logarítmica
3. **Trilateración**: Calcula posición usando 3+ beacons con señales fuertes
4. **Centroide**: Si la trilateración falla, usa método de centroide ponderado
5. **Estabilización**: Compara con posición anterior y solo actualiza si hay cambio significativo
6. **Almacenamiento**: Guarda posición, batería y valores RSSI en Supabase

## 🎮 Funcionalidades

### Dashboard Principal
- Vista general de todos los dispositivos activos
- Mapa interactivo con posiciones en tiempo real
- Indicadores visuales de estado (activo/inactivo)
- Información de batería por dispositivo

### Lista de Dispositivos
- Cards informativos por dispositivo
- Estado de actividad (activo si datos < 2 horas)
- Nivel de batería con indicadores visuales
- Última actualización
- Enlace a detalles del dispositivo

### Detalles del Dispositivo
- Mapa individual con historial de posiciones
- Gráficos de trayectoria
- Filtros por fecha y hora
- Exportación de datos
- Información detallada de telemetría

### Sistema de Usuarios
- Autenticación con NextAuth
- Roles y permisos configurables
- Gestión de usuarios (crear, editar, eliminar)
- Perfil de usuario editable

## 📊 Algoritmos de Posicionamiento

### Trilateración

El sistema utiliza trilateración multilateración para calcular la posición cuando hay 3 o más beacons disponibles:

1. Ordena beacons por distancia (más cercanos primero)
2. Usa hasta 5 beacons más cercanos
3. Resuelve sistema de ecuaciones no lineales
4. Valida error promedio de la solución
5. Si el error es ≤ 5m, usa la trilateración
6. Si no, usa método de centroide como fallback

### Método de Centroide

Cuando la trilateración no es confiable:

1. Calcula distancia desde cada beacon usando RSSI
2. Ponderación inversa al cuadrado de la distancia
3. Promedio ponderado de posiciones de beacons
4. Asegura que la posición esté dentro de los límites del plano

### Conversión RSSI a Distancia

Utiliza el modelo de propagación logarítmica:

```
d = 10^((RSSI_1m - RSSI) / (10 * n))

Donde:
- RSSI_1m = -59 dBm (valor de referencia a 1 metro)
- n = 2.8 (factor de propagación)
```

## 🔒 Seguridad

### Autenticación
- NextAuth.js con estrategia JWT
- Credenciales almacenadas con bcryptjs
- Sesiones seguras con cookies httpOnly

### Validación de Datos
- Validación de dispositivos permitidos en webhook
- Sanitización de datos de entrada
- Verificación de tipos y formatos

### Control de Acceso
- Sistema de roles (admin, usuario, etc.)
- Rutas protegidas con middleware
- Verificación de permisos en componentes

## 🚀 Despliegue

### Producción

1. **Build del proyecto**
   ```bash
   npm run build
   ```

2. **Iniciar servidor**
   ```bash
   npm start
   ```

### Variables de Entorno en Producción

Asegúrate de configurar todas las variables de entorno en tu plataforma de hosting:
- Vercel: Configuración → Environment Variables
- Netlify: Site settings → Environment variables
- Otros: Según la plataforma

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

### Pruebas Locales

1. **Simular datos de webhook**
   ```bash
   curl -X POST http://localhost:3000/api/webhook \
     -H "Content-Type: application/json" \
     -d @test-data.json
   ```

2. **Verificar logs**
   - Los logs del servidor mostrarán el procesamiento de datos
   - Revisar consola del navegador para actualizaciones en tiempo real

## 📈 Roadmap

### Versión 1.1
- [ ] Mejoras en algoritmo de estabilización
- [ ] Calibración automática de beacons
- [ ] Alertas configurables (batería baja, inactividad)
- [ ] Exportación de reportes en PDF

### Versión 1.2
- [ ] Geofencing y zonas restringidas
- [ ] Análisis de patrones de movimiento
- [ ] Dashboard con métricas avanzadas
- [ ] API REST para integraciones externas

### Versión 2.0
- [ ] Machine Learning para mejora de precisión
- [ ] Predicción de trayectorias
- [ ] Integración con sistemas de seguridad
- [ ] Soporte para múltiples plantas/edificios

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## 📞 Soporte

- **Email**: soporte@digiplus.com
- **Documentación**: [docs.digiplus.com](https://docs.digiplus.com)
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/digiplus-indoor-tracking/issues)

## 🙏 Agradecimientos

- **Supabase** por la infraestructura de base de datos y realtime
- **The Things Network** por la plataforma LoRaWAN
- **Konva** por la librería de canvas 2D
- **Next.js** por el framework de React
- **La comunidad open source** por las herramientas y librerías utilizadas

---

**DigiPlus Indoor Tracking System** - Sistema de tracking indoor preciso mediante beacons BLE y trilateración.
