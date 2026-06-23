# CHANGES - Todos los cambios realizados

## 1. Menú Hamburguesa (3 rayitas) — abrir presionando

### Problema
El icono del menú hamburguesa (3 rayitas) en el `GlassHeader` no funcionaba al presionarlo. Solo se podía abrir el menú lateral deslizando desde el borde izquierdo.

### Solución
Se agregó `onMenuPress` a todos los `GlassHeader` para que abran el drawer tanto con el botón como con el deslizamiento.

### Archivos modificados

#### `components/ui/GlassHeader.tsx`
- Sin cambios (el prop `onMenuPress` ya existía)

#### `app/(drawer)/(tabs)/index.tsx`
- Agregado `useNavigation` a import de `expo-router`
- Agregado `const navigation = useNavigation()`
- Agregado `onMenuPress={() => (navigation.getParent() as any)?.openDrawer()}`
  (Usa `getParent()` porque está anidado dentro de tabs → drawer)

#### `app/(drawer)/(tabs)/events.tsx`
- Agregado `useNavigation` a import de `expo-router`
- Agregado `const navigation = useNavigation()`
- Agregado `onMenuPress={() => (navigation.getParent() as any)?.openDrawer()}`
  (Usa `getParent()` porque está anidado dentro de tabs → drawer)

#### `app/(drawer)/aulas.tsx`
- Agregado `useNavigation` a import de `expo-router`
- Agregado `const navigation = useNavigation()`
- Agregado `onMenuPress={() => (navigation as any).openDrawer()}`

#### `app/(drawer)/buildings.tsx`
- Agregado `useNavigation` a import de `expo-router`
- Agregado `const navigation = useNavigation()`
- Agregado `onMenuPress={() => (navigation as any).openDrawer()}`

#### `app/(drawer)/favorites.tsx`
- Agregado `useNavigation` a import de `expo-router`
- Agregado `const navigation = useNavigation()`
- Agregado `onMenuPress={() => (navigation as any).openDrawer()}`

#### `app/(drawer)/config.tsx`
- Agregado `useNavigation` a import de `expo-router`
- Agregado `const navigation = useNavigation()`
- Agregado `onMenuPress={() => (navigation as any).openDrawer()}`

#### `app/(drawer)/help.tsx`
- Agregado `useNavigation` a import de `expo-router`
- Agregado `const navigation = useNavigation()`
- Agregado `onMenuPress={() => (navigation as any).openDrawer()}`

---

## 2. Eliminación de redirección a dev-login

#### `app/index.tsx`
- Eliminada la línea que redirigía a `/auth/dev-login` cuando `isDevMode()` era true
- Eliminado el import de `isDevMode` de `@/core/config/env`
- Ahora siempre redirige a `/auth/login` si no hay usuario autenticado

---

## 3. Ajustes en GlassHeader (cambios pre-existentes)

#### `components/ui/GlassHeader.tsx`
- `HEADER_HEIGHT` cambiado de 64 a 80
- `iconBtn` (botón hamburguesa) cambiado de 40×40 a 60×60 (mejora área táctil)

---

## 4. Metadatos de package.json (cambios pre-existentes)

#### `package.json`
- Agregados campos: `description`, `repository`, `keywords`, `author`, `license`, `bugs`, `homepage`

#### `package-lock.json`
- Actualizado automáticamente por cambio en `package.json`

---

## 5. Chat Privado — Compatibilidad backend

### Problema
Los eventos Socket.IO del chat privado no coincidían con los que espera el backend. Además, cada hook creaba su propia conexión Socket.IO (`forceNew: true`) sin compartirla.

### Solución
Se creó un servicio singleton de Socket.IO y se actualizaron los nombres de eventos para que coincidan con el backend.

#### `src/services/socket.ts` (NUEVO)
- Servicio singleton `conectarSocket(token?)` / `getSocket()` / `desconectarSocket()`
- Configura transporte `websocket` (obligatorio en React Native)
- Acepta token JWT opcional en `auth`
- Maneja eventos `connect`, `disconnect`, `connect_error`

#### `src/features/chat/application/private-chat.hooks.ts`
- Eliminada creación inline de socket (`io(...)` con `forceNew: true`)
- Ahora usa `conectarSocket()` / `getSocket()` del singleton
- `join-room` → `unirse-conversacion`
- `leave-room` → `salir-conversacion`
- `private-message` (emit) → `enviar-mensaje-privado`
- `private-message` (recibir) → `mensaje-privado-recibido`
- Eliminado listener `previous-messages` (REST es la fuente primaria)
- En `connect` emite `usuario-conectado` con `{ _id, nombre, email, rol }`

#### `src/features/chat/application/chat.hooks.ts`
- Eliminada creación inline de socket (`io(...)` con `forceNew: true`)
- Eliminada función `getSocketUrl()`
- Ahora usa `conectarSocket()` del singleton
- Ya no llama `socket.disconnect()` en cleanup (el singleton maneja el ciclo de vida)

#### `src/features/chat/infrastructure/private-chat.repository.ts`
- Eliminado import de `expo-secure-store`
- Eliminada función `getToken()` y constante `AUTH_TOKEN_KEY`
- Eliminado paso manual de token en cada llamada REST
- El `httpClient` ya tiene interceptor que adjunta el JWT automáticamente

---

## 6. Conexión con backend — URL de API corregida

### Problema
La app mostraba `Network Error` al intentar conectar con el backend:
```
LOG  [HttpClient] POST /admin/login
LOG  [HttpClient] Respuesta con error: {"message": "Network Error", "method": "post", "status": undefined, "url": "/admin/login"
```

### Causa raíz
El `Network Error` ocurría porque el backend no estaba corriendo o no era accesible en la URL configurada. Se verificó que todos los endpoints del frontend (`/admin/login`, `/estudiantes/login`, `/docente/login`, `/auth/refresh`, `/aulas`, `/oficinas`, `/eventos`, etc.) coinciden con los del backend en Railway.

### Solución
Se documentaron ambas configuraciones en `.env` para alternar entre local y producción:

#### `.env` — Configuración actual (local)
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_DEV_MODE=true
```

#### `.env` — Para producción (Railway)
```env
EXPO_PUBLIC_API_BASE_URL=https://esfotgocomponentebackend-production.up.railway.app/api
EXPO_PUBLIC_DEV_MODE=false
```

> **Nota para Android Emulator**: si pruebas en emulador Android, usa `http://10.0.2.2:3000/api` en lugar de `localhost`.
>
> **Nota para dispositivo físico**: ambos (teléfono y backend) deben estar en la misma red. Usa la IP local de tu PC (ej. `http://192.168.x.x:3000/api`).

### Archivos modificados

#### `.env`
- Se agregaron comentarios con las URLs de producción (Railway) y local
- Se mantiene `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api` para desarrollo local
- `EXPO_PUBLIC_DEV_MODE=true` para usar mock data cuando no hay backend disponible

---

## 7. Eliminación completa de edificios del frontend

### Problema
El frontend aún contenía toda la funcionalidad de "edificios" (BuildingCard, ruta buildings.tsx, features/edificios, drawer item, etc.) que ya no es necesaria.

### Archivos eliminados
- `src/features/edificios/` (directorio completo: entity, repository, infrastructure, application hooks)
- `app/(drawer)/buildings.tsx` (ruta de página)
- `components/ui/BuildingCard.tsx` (componente de tarjeta)

### Archivos modificados

#### `app/(drawer)/_layout.tsx`
- Eliminado el ítem "Edificios" del Drawer
- Eliminado `<Drawer.Screen name="buildings" />`

#### `app/(drawer)/favorites.tsx`
- Eliminado tab "Edificios" y su import `Map`
- Eliminados import de `BuildingCard`, tipo `Building`, función `favoriteToBuilding`
- Eliminada función `normalizeCategory` y `localToBuilding`
- Simplificada lógica de renderizado (ya no usa `BuildingCard`)
- Actualizada lista de pestañas a: `aulas`, `rutas`, `ubicaciones`
- Actualizado subtitle: "Tus aulas, rutas y ubicaciones guardadas"
- Eliminado `edificios` de `useFavoritesByType` destructuring
- Eliminados `localEdificios` y su filtro

#### `app/(drawer)/(tabs)/index.tsx`
- Reemplazado icono `Building2` por `MapPin` en sección Campus

#### `app/(drawer)/help.tsx`
- FAQ #4: eliminada mención a "edificio"

#### `components/ui/LocationCard.tsx`
- Eliminado array `CAMPUS_BUILDINGS`
- Eliminada variable `buildingsRow`
- Eliminados estilos no usados: `buildingsRow`, `buildingTag`, `buildingName`, `buildingCode`

#### `src/services/express/express-types.ts`
- Eliminado `edificio_id` de la interfaz `Aula`

#### `src/services/express/adapters/mongo-dtos.ts`
- Eliminado `EdificioDto`

#### `src/services/express/adapters/mongo-mappers.ts`
- Eliminados import de `Edificio`, `EdificioDto`
- Eliminada función `mapEdificioDtoToEdificio`
- Eliminado `edificioId` del mapeo de `Aula`

#### `src/features/graph/domain/graph.entity.ts`
- Eliminado `buildingId` de `GraphNode`

#### `src/features/graph/infrastructure/express-graph.repository.ts`
- Eliminados `buildingId`/`edificioId` del DTO, mapper y payload de upsert

#### `src/features/graph/presentation/graph-admin.tsx`
- Eliminado `buildingId` del nodo por defecto

#### `src/features/aulas/domain/aula.schema.ts`
- Eliminado campo `edificio_id`

#### `src/features/aulas/presentation/aula-form.tsx`
- Eliminado campo de formulario `edificio_id`

#### `src/features/favoritos/domain/favorite.entity.ts`
- Eliminado `'edificio'` del tipo `FavoriteItemType`

#### `src/features/favoritos/application/favorite.hooks.ts`
- Eliminados mock favorites de tipo edificio
- Eliminado `edificios` del return de `useFavoritesByType`

#### `src/features/bulk-upload/domain/bulk-upload.schema.ts`
- Eliminado campo `edificio` de `PoiRowSchema`

#### `src/features/map/application/map.hooks.ts`
- Eliminada categoría `edificios` de `CATEGORY_CONFIG`

#### `src/features/auth/presentation/gps-permission-prompt.tsx`
- Cambiado texto "Navegación entre edificios" → "Navegación por el campus"

---

## 8. Imágenes 360° — Subida y visualización con Pannellum

### Problema
El formulario de creación/edición de POIs solo permitía subir una imagen normal. No había soporte para imágenes 360° (panorama esférico). El visor 360 existente (`Panorama360Viewer`) solo duplicaba la imagen horizontalmente sin proyección esférica real.

### Solución
- Se agregó soporte completo para imágenes 360° en el flujo de datos (DTOs, mappers, transformers, entidades, repositorio)
- Se creó un nuevo visor basado en **Pannellum** (biblioteca JS de renderizado 360° esférico) embebido vía WebView
- El formulario ahora permite seleccionar una imagen 360° además de la imagen normal

### Archivos modificados

#### `src/services/express/adapters/mongo-dtos.ts`
- `LocationDto`: agregados `imagen_360?`, `image360?`, `tipo_media?`, `mediaType?`
- `CreateLocationRequestDto`: agregados `imagen_360?`, `image360?`, `tipo_media?`, `mediaType?`

#### `src/services/express/adapters/mongo-mappers.ts`
- `mapLocationDtoToCampusLocation`: ahora mapea `imagen_360`/`image360` → `image360` y `tipo_media`/`mediaType` → `mediaType`

#### `src/services/express/adapters/mongo-transformers.ts`
- `CreateLocationEntity`: agregados `image360?` y `mediaType?`
- `transformLocationToDto`: envía `image360` como `imagen_360` y `mediaType` como `tipo_media`
- `transformLocationUpdateToDto`: mismo mapeo condicional

#### `src/features/admin/infrastructure/express-poi.repository.ts`
- DTO local (`LocationDto`): agregados `imagen_360?`, `image360?`, `tipo_media?`, `mediaType?`
- `mapDtoToLocation`: mapea los nuevos campos
- `create()`: envía `imagen_360` y `tipo_media` en el payload
- `update()`: envía `imagen_360` y `tipo_media` condicionalmente

#### `src/features/admin/domain/poi.entity.ts`
- `PoiInput`: agregado `image360?` y tipado `mediaType` como `'image' | '360' | undefined`
- `PoiUpdateInput`: agregado `image360?` y tipado `mediaType` como `'image' | '360' | null`

#### `src/features/admin/presentation/poi-form.tsx`
- Agregado estado `image360Uri` para la imagen 360°
- Agregada función `pickImage360()` para seleccionar imagen 360 desde la galería
- Agregada función `removeImage360()` para quitar la imagen 360
- `mediaType` se asigna automáticamente: `'360'` si hay imagen 360, `'image'` si solo hay imagen normal
- Nuevo campo "Imagen 360° / Panorama" con preview, badge "360°" y botones Cambiar/Quitar
- `handleSubmit()` ahora envía `image360` y `mediaType` en el payload

### Archivos nuevos

#### `src/features/map/presentation/pannellum-viewer.tsx`
- Nuevo componente `PannellumViewer` que usa `react-native-webview` con Pannellum 2.5.6 (CDN)
- Renderizado esférico equirrectangular real con auto-rotación, zoom táctil, soporte de inclinación vertical
- Carga HTML inline con Pannellum JS embebido, manejo de errores y estado de carga

### Archivos modificados (visualización)

#### `src/features/map/presentation/location-info-modal.tsx`
- Reemplazado `Panorama360Viewer` por `PannellumViewer` para visualización 360°
- Cambiado prop `imageSource` por `imageUrl`

### Dependencias agregadas
- `react-native-webview@14.0.1` — WebView para embeker Pannellum

---

## 9. Conexión con backend real — Desactivación de mock data + campos 360 en backend

### Problema
La app estaba usando mock data (`EXPO_PUBLIC_DEV_MODE=true`) en lugar de conectar con el backend real. Además, el modelo `Ubicacion` en el backend no tenía los campos `imagen_360` ni `tipo_media`.

### Solución
- Se desactivó el modo desarrollo (`DEV_MODE=false`) para que la app use la API real
- Se agregaron los campos `imagen_360` y `tipo_media` al modelo `Ubicacion` del backend y a sus controladores
- Se actualizó CORS para permitir conexiones desde Expo

### Archivos modificados (Frontend)

#### `.env`
- `EXPO_PUBLIC_DEV_MODE` cambiado de `true` a `false`
- `EXPO_PUBLIC_API_BASE_URL` cambiado a `http://localhost:3000/api`

### Archivos modificados (Backend — `ESFOTGO_COMPONENTE_BACKEND`)

#### `src/models/Ubicacion.js`
- Agregado campo `imagen_360` (String, opcional)
- Agregado campo `tipo_media` (String, opcional)

#### `src/controllers/ubicacion_controllers.js`
- `crearUbicacion`: ahora acepta `imagen_360`/`image360` y `tipo_media`/`mediaType` del body
- `imagen_360` se sube a Cloudinary si es base64
- `actualizarUbicacion`: ahora actualiza `imagen_360` y `tipo_media` condicionalmente
- Soporta tanto snake_case (`imagen_360`, `tipo_media`) como camelCase (`image360`, `mediaType`)

#### `src/server.js`
- CORS actualizado para incluir Expo dev server (`localhost:8081`, `127.0.0.1:8081`)
- Ahora soporta `CORS_ORIGINS` como variable de entorno (lista separada por comas)
