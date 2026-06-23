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

---

## 10. Eventos — Subida de imágenes a Cloudinary (Create + Update)

### Problema
La creación y edición de eventos enviaba la URI local del dispositivo (`file://...`) como campo `imagen`, pero el backend espera `subirBase64Evento` (en base64) para subir la imagen a Cloudinary.

### Solución
- Se agregó conversión de URI local a base64 usando `expo-file-system` en `event-form.tsx`
- Se agregó campo `imageBase64` al payload de create/update
- El repositorio (`express-event.repository.ts`) distingue entre `imageBase64` (→ `subirBase64Evento`) y `imageUrl` (URL existente → `imagen`)

### Archivos modificados

#### `src/features/events/domain/event.entity.ts`
- Agregados tipos `EventCreateInput` y `EventUpdateInput` que incluyen `imageBase64?: string`

#### `src/features/events/domain/event.repository.ts`
- `createEvent` acepta `{ imageBase64?: string }`
- `updateEvent` acepta `{ imageBase64?: string }`

#### `src/features/events/application/event.usecases.ts`
- `CreateEventUseCase.execute` usa `EventCreateInput`
- `UpdateEventUseCase.execute` usa `EventUpdateInput`

#### `src/features/events/application/event.hooks.ts`
- `useCreateEvent` mutationFn acepta `EventCreateInput`
- `useUpdateEvent` mutationFn acepta `EventUpdateInput` en `input`

#### `src/features/events/presentation/event-form.tsx`
- Agregado `import { readAsStringAsync } from 'expo-file-system/legacy'` (v19: legacy APIs movidas a `expo-file-system/legacy`)
- Agregado estado `imageBase64`
- `handlePickImage`: tras seleccionar imagen, la convierte a base64 con `readAsStringAsync(uri, { encoding: 'base64' })` (usa `'base64'` literal porque `EncodingType.Base64` es `undefined` en v19)
- Al quitar la imagen, se limpia `imageBase64`
- `onSubmit`: envía `imageBase64` como campo separado cuando hay imagen nueva

#### `src/features/events/infrastructure/express-event.repository.ts`
- Eliminado `import * as FileSystem` (la conversión ahora está en el form)
- `mapEntityToDto` vuelve a ser síncrona
- Lógica de imagen:
  - Si `imageBase64` es truthy → `dto.subirBase64Evento = imageBase64`
  - Si `imageUrl` no es undefined → `dto.imagen = imageUrl`
- `createEvent`: si `data` es `null` (backend devuelve `{ success: true, data: null }`), retorna un evento sintético en lugar de lanzar error. `onSuccess` invalida la lista y se refetchea.
- `updateEvent`: si `data` es `null`, hace `getEventById(id)` para obtener los datos actualizados.

---

## 11. Visor 360° Pannellum — Pantalla completa, overlay y vista previa

### Problema
El visor 360° (`PannellumViewer`) se renderizaba inline dentro del modal, ocupando espacio sin dar una experiencia inmersiva. No había forma de ver la imagen 360° a pantalla completa, ni había indicación visual en la tarjeta de detalle de que un lugar tenía contenido panorámico.

### Solución
- `PannellumViewer` ahora se renderiza como overlay fullscreen (absolute, zIndex 9999) con animación de entrada/salida (FadeIn/FadeOut)
- Agregada barra superior con título "Vista 360°" y botón de cierre (rojo) que respeta SafeAreaInsets
- Se habilitaron los controles de zoom táctil de Pannellum
- El modal `LocationInfoModal` ahora muestra la imagen normal con un overlay "Ver en 360°" al presionar (en lugar del visor inline)
- El `LocationDetailSheet` ahora muestra un thumbnail preview de la imagen, con badge "360°" y overlay para contenido panorámico
- Se eliminó el componente obsoleto `panorama-360-viewer.tsx`

### Archivos modificados

#### `src/features/map/presentation/pannellum-viewer.tsx`
- **Props**: ahora acepta `onClose` (obligatorio) en lugar de ser auto-contenido
- **Layout**: overlay fullscreen absolute (`position: 'absolute'`, `zIndex: 9999`, `elevation: 9999`)
- **Animación**: `Animated.View` con `FadeIn.duration(300)` / `FadeOut.duration(200)` (react-native-reanimated)
- **Barra superior**: título "Vista 360°" a la izquierda, botón rojo `X` a la derecha, padding superior respeta SafeAreaInsets
- **Carga/Error**: mantiene indicador de carga y mensaje de error si falla el WebView
- **Pannellum**: se habilitó `showZoomCtrl: true`, `keyboardZoom: true`, `mouseZoom: true`; se eliminó `display: none` de controles CSS
- **onClose**: llama a `onClose` del prop y el padre (`LocationInfoModal`) desmonta el visor

#### `src/features/map/presentation/location-info-modal.tsx`
- Eliminado renderizado inline de `PannellumViewer`
- Agregado estado `show360Viewer` (boolean)
- Cuando `mediaType === '360'`: muestra la imagen normal con un overlay semi-transparente azul y texto "🔭 Ver en 360°" → al presionar, se renderiza `PannellumViewer` como overlay fullscreen (`position: absolute`, `zIndex`)
- Cuando no es 360° o no hay media: se mantiene el comportamiento anterior (imagen con scroll/descripción, o mensaje "No hay contenido multimedia")

#### `src/features/map/presentation/location-detail-sheet.tsx`
- Agregado `Image` de `react-native` a imports
- **Nueva sección**: entre el header y la descripción, si el location tiene `image360`/`image`/`imageUrl`, se muestra un `Pressable` con thumbnail de 180px de altura
- Si `mediaType === '360'` o tiene `image360`: se superpone badge "360°" (esquina superior izquierda) y overlay "🔭 Ver en 360°" (centro)
- Al presionar el thumbnail, se dispara `onMoreInfo(location)` que abre el `LocationInfoModal`

### Archivos eliminados

#### `src/features/map/presentation/panorama-360-viewer.tsx`
- Eliminado completamente (ya no hay imports que lo referencien)

### Archivos modificados (flujo directo al visor 360°)

#### `src/features/map/domain/coordinates.ts`
- `MapMarkerData`: agregados campos `image360?: string` y `mediaType?: string` para que los datos 360 viajen con el marcador

#### `src/features/map/application/map.hooks.ts`
- `locationToMarker()`: ahora pasa `image360` y `mediaType` desde `CampusLocation` al `MapMarkerData`

#### `src/features/map/presentation/pannellum-viewer.tsx`
- Agregado prop opcional `title?: string` para mostrar el nombre de la ubicación en la barra superior (en lugar del genérico "Vista 360°")

#### `app/(drawer)/(tabs)/map.tsx`
- Agregado estado `viewing360Location: CampusLocation | null`
- `handleMarkerPress`: ahora incluye `image360` y `mediaType` en el objeto `CampusLocation`. Si el marcador tiene `mediaType === '360'` o `image360`, establece `viewing360Location` → abre el visor 360° directamente (como Google Street View). También establece `selectedLocation` para que la bottom sheet esté disponible al cerrar el visor
- Renderiza `<PannellumViewer>` como overlay fullscreen cuando `viewing360Location` está definido, con el nombre de la ubicación como título

### Comportamiento resultante
1. **Usuario toca marcador con imagen 360°** → se abre `PannellumViewer` en pantalla completa inmediatamente (con nombre y botón cerrar). Al cerrar, la bottom sheet con info del lugar queda visible.
2. **Usuario toca marcador sin imagen 360°** → se abre `LocationDetailSheet` (bottom sheet) como antes, sin cambios.

---

## 12. Ruta óptima solo con nodos del grafo (sin OSRM ni calles)

### Problema
El cálculo de rutas usaba tres estrategias: (1) nodos del grafo interno, (2) OSRM (rutas de calle externas), y (3) línea recta directa. Esto hacía que la ruta a veces usara calles reales en lugar de los caminos peatonales del campus representados por los nodos.

### Solución
Se eliminó toda dependencia de OSRM y del ruteo por calles. Ahora `computeRoute` busca exclusivamente nodos del grafo con radios progresivos (200m → 500m → 1000m → 5000m) hasta encontrar un nodo cercano para origen y destino. Si no hay grafo disponible, no se muestra ruta.

### Archivos modificados

#### `app/(drawer)/(tabs)/map.tsx`
- Eliminados imports: `calculateOptimalRoute`, `RouteCalculation`, `OsrmRoutingRepository`, `RoutingResult`
- Eliminados estados: `route`, `osrmRoute`
- Eliminado `osrmRepoRef` (instancia de `OsrmRoutingRepository`)
- `computeRoute` simplificado: busca nodos con radios progresivos (200, 500, 1000, 5000m). Si no encuentra nodos para origen y destino, no dibuja ruta
- Eliminado renderizado de `Polyline` para OSRM/ruta directa (solo queda `graphRoute`)
- Eliminada tarjeta OSRM y sus estilos asociados (`osrmCard`, `osrmContent`, etc.)
- Simplificado `RouteInfoCard` y `handleClearRoute`
- `onClose` y `onClearRoute` de `LocationDetailSheet` ya no limpian `route`/`osrmRoute`
- Efecto de seguimiento simplificado a solo `graphRoute`

#### `src/features/map/presentation/route-info-card.tsx`
- Eliminado import de `RouteCalculation` y `formatRouteInfo`
- Eliminado prop `route` de `RouteInfoCardProps`
- Componente simplificado: solo recibe `graphRoute`, `isVisible`, `onClear`

### Comportamiento resultante
- Al tocar un marcador o punto en el mapa, se buscan los nodos más cercanos con radio creciente
- La ruta se calcula exclusivamente con A* sobre los nodos/edges del grafo
- Si no hay grafo cargado o no se encuentran nodos cercanos, no se muestra ruta
- Ya no hay fallback a OSRM (rutas de calle) ni a línea recta

---

## 13. Planificador de ruta manual — Elegir origen y destino (como InDrive)

### Problema
El cálculo de ruta siempre usaba la ubicación GPS actual como origen. Si el usuario está fuera del campus o quiere planificar una ruta entre dos puntos arbitrarios, no tenía forma de hacerlo.

### Solución
Se agregó un planificador de ruta manual que permite tocar en el mapa para elegir ORIGEN y DESTINO, similar a cómo funciona InDrive o Google Maps. La ruta se calcula exclusivamente con nodos del grafo entre los dos puntos seleccionados.

### Archivos modificados

#### `app/(drawer)/(tabs)/map.tsx`
- Nuevo estado `planner` con `mode: 'idle' | 'selecting-origin' | 'selecting-destination' | 'planned'`, `origin`, `originName`, `destination`, `destinationName`
- `computeRoute` ahora acepta dos argumentos opcionales: `(origin?: GeoCoordinate, dest?: GeoCoordinate)`. Si no se pasa origin, usa la ubicación GPS actual
- `handleMarkerPress`: si el planner está en `selecting-origin`, establece el origen del marcador y pasa a `selecting-destination`. Si está en `selecting-destination`, establece el destino y calcula la ruta.
- `handleMapPress`: mismo comportamiento que `handleMarkerPress` pero para toques en el mapa vacío
- Nuevo panel flotante (`plannerPanel`) con:
  - Estado actual (seleccionando origen, seleccionando destino, o planificado)
  - Indicadores visuales de origen (punto verde) y destino (punto rojo) con coordenadas/nombres
  - Botón "Usar mi ubicación como origen" cuando está en modo `selecting-origin`
  - Botón "Intercambiar" y "Iniciar ruta" cuando está planificado
  - Botón "X" para cancelar
- Nuevos marcadores en el mapa para origen (bandera verde) y destino (pin rojo) usando `Marker` directo de react-native-maps
- `handleClearRoute` también resetea el planner
- Nuevos estilos: `plannerPanel`, `plannerHeader`, `plannerRow`, `plannerDot`, `plannerField`, `plannerConnector`, `plannerLine`, `plannerHint`, `plannerActions`, `plannerSwapBtn`, `plannerCalcBtn`, `plannerUseGpsBtn`, `originMarker`, `destMarker`
- Nuevo prop `onStartPlanner` en `<LocationDetailSheet>`

#### `src/features/map/presentation/location-detail-sheet.tsx`
- Agregado prop `onStartPlanner?: () => void` a la interfaz `Props`
- Agregado botón "Elegir origen y destino" (icono `Map`) debajo de "Mas Informacion"
- Nuevo estilo `plannerBtn` y `plannerT`

### Comportamiento resultante
1. **Flujo normal**: tocar marcador → bottom sheet → "Elegir origen y destino" → se abre el panel planificador
2. **Seleccionar origen**: tocar en el mapa o marcador establece el ORIGEN (punto verde)
3. **Seleccionar destino**: tocar en el mapa o marcador establece el DESTINO y calcula la ruta automáticamente
4. **Intercambiar**: botón para invertir origen ↔ destino
5. **Usar GPS**: botón "Usar mi ubicación como origen" para quien está fuera del campus
6. **Iniciar ruta**: cierra el panel y muestra la tarjeta de ruta con distancia/tiempo estimado

---

## 14. Ruta directa / marcadores como fallback cuando el grafo está vacío

### Problema
Cuando el backend devuelve 0 nodos en el grafo, el `computeRoute` no dibujaba ninguna ruta porque el flujo A* no encontraba nodos. La app se quedaba sin ruta incluso teniendo marcadores del campus disponibles.

### Solución
Se agregaron dos fallbacks progresivos antes de la línea directa:
1. **`buildCampusRoute`**: usa los marcadores del campus (location markers) como nodos virtuales para trazar una ruta punto a punto
2. **`directRoute`**: línea recta entre origen y destino como último recurso

### Archivos modificados

#### `app/(drawer)/(tabs)/map.tsx`
- Nueva función `directRoute(originPt, destPt)`: retorna `GraphRouteResult` con línea recta y distancia haversine
- Nueva función `buildCampusRoute(origin, dest, markers)`: busca marcadores cercanos (radio 500m) a origen/destino, los usa como waypoints intermedios
- `computeRoute` ahora tiene 3 caminos:
  1. Si grafo vacío → `buildCampusRoute` → `directRoute`
  2. Si nodos encontrados → A* + `graphRouteToWaypoints`
  3. Si A* no encuentra ruta → `directRoute` entre nodos
- Agregado `clustersRef = useRef(clusters)` para que `computeRoute` acceda a los clusters actuales sin depender de ellos en las dependencias del `useCallback`

---

## 15. Tutorías — Corrección de creación y actualización (estado + createdBy)

### Problema
1. `createdBy` se enviaba vacío (`''`) porque el hook no inyectaba el `user.id`
2. `estado: 'programada'` en el payload causaba error 500 del backend (enum desconocido)
3. Sin `error handling` (Alert.alert) en las mutaciones, los errores pasaban desapercibidos

### Solución
- `createdBy` se inyecta desde `useAuthStore` en el `mutationFn`
- `estado` se eliminó de los DTOs de create y update — el backend usa su valor por defecto
- Se agregó `normalizeStatus()` para mapear cualquier valor del backend al enum del frontend
- Se agregó `Alert.alert` en `handleCreate`, `handleUpdate` y `handleDelete`

### Archivos modificados

#### `src/features/tutorias/infrastructure/express-tutoria.repository.ts`
- `STATUS_MAP` con variantes `'programada'/'pendiente'/'finalizada'/'cancelada'`, inglés y capitalizaciones
- `normalizeStatus(raw)`: retorna `TutoriaStatus` desde el map, default `'programada'`
- `mapTutoriaToBackendDto`: eliminado `estado` del DTO
- `mapTutoriaUpdateToBackendDto`: eliminado `estado` del DTO (causaba 500)

#### `src/features/tutorias/application/tutorias.hooks.ts`
- `createTutoria.mutationFn`: inyecta `createdBy: user?.id ?? ''`
- Todos los `onError` ahora solo hacen console.log (el error handling está en la UI)

#### `app/(drawer)/tutorias.tsx`
- `handleCreate`: envuelto en try/catch con `Alert.alert`
- `handleUpdate`: envuelto en try/catch con `Alert.alert`
- `handleDelete`: envuelto en try/catch con `Alert.alert`

---

## 16. Perfil — Actualización con endpoint según rol (estudiante/docente/admin)

### Problema
El endpoint `PUT /actualizarperfil/${userId}` estaba hardcodeado a la colección de estudiantes. Cuando un docente o administrador intentaba actualizar su perfil, el backend no encontraba el usuario (porque está en otra colección).

### Solución
Se lee el `role` del usuario persistido en SecureStore y se selecciona el endpoint correcto:
- `estudiante` → `/actualizarperfil/${userId}`
- `docente` → `/docente/actualizarperfil/${userId}`
- `administrador` → `/admin/actualizarperfil/${userId}`

Además, ahora se persiste el usuario actualizado en SecureStore después de un update exitoso.

### Archivos modificados

#### `src/features/auth/infrastructure/express-auth.repository.ts`
- `updateProfile()`: lee `esfotgo_jwt_user` de SecureStore, extrae `role`, construye endpoint según el rol
- Role-specific endpoints: `/docente/actualizarperfil/:id`, `/admin/actualizarperfil/:id`, `/actualizarperfil/:id`

#### `src/store/auth.store.ts`
- `updateProfile()`: después de `set({ user: updated })`, persiste `SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(updated))`
