import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ScrollView, ActivityIndicator,
  Pressable, Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker, Polyline } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useAdminBusRoutes } from '@/features/polibus/application/bus.hooks';
import type { BusRoute, BusStop } from '@/features/polibus/domain/route.entity';
import { useCampusGraph } from '@/features/graph/application/graph.hooks';
import { dijkstra } from '@/features/graph/domain/dijkstra';
import { findNearestNode, graphRouteToWaypoints, formatGraphRouteInfo } from '@/features/graph/application/graph-route.service';
import type { GraphRouteResult } from '@/features/graph/application/graph-route.service';
import type { GraphNode } from '@/features/graph/domain/graph.entity';
import { ColorPicker } from './color-picker';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { Edit2, Trash2, Bus, MapPin, Navigation, X, CircleAlert } from 'lucide-react-native';
import { AppCard } from '@/components/ui/app-card';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';

const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

const EPN_CENTER = { latitude: -0.2095, longitude: -78.4905, latitudeDelta: 0.012, longitudeDelta: 0.012 };

type SelectionMode = 'start' | 'end' | null;

export function BusRoutesAdmin() {
  const { routes, isLoading, createRoute, updateRoute, deleteRoute, createStop, updateStop, deleteStop } = useAdminBusRoutes();
  const { data: graph, isLoading: graphLoading } = useCampusGraph();

  const mapRef = useRef<MapView>(null);

  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [showForm, setShowForm] = useState<'route' | 'stop' | null>(null);
  const [editRoute, setEditRoute] = useState<BusRoute | null>(null);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#1B6BB0');

  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [startNode, setStartNode] = useState<GraphNode | null>(null);
  const [endNode, setEndNode] = useState<GraphNode | null>(null);
  const [graphRouteResult, setGraphRouteResult] = useState<GraphRouteResult | null>(null);

  const [stopName, setStopName] = useState('');
  const [stopLat, setStopLat] = useState('');
  const [stopLng, setStopLng] = useState('');
  const [stopOrder, setStopOrder] = useState('');

  const routeInfo = useMemo(() => {
    if (!graphRouteResult) return null;
    return formatGraphRouteInfo(graphRouteResult);
  }, [graphRouteResult]);

  const resetForm = useCallback(() => {
    setShowForm(null);
    setEditRoute(null);
    setName(''); setDesc(''); setColor('#1B6BB0');
    setSelectionMode(null);
    setStartNode(null); setEndNode(null); setGraphRouteResult(null);
  }, []);

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      if (!graph || !selectionMode) return;

      const coord = e.nativeEvent.coordinate;
      const nearestId = findNearestNode(graph, { latitude: coord.latitude, longitude: coord.longitude }, 200);
      if (!nearestId) {
        Alert.alert('Sin nodos cercanos', 'No hay un nodo del grafo cerca de este punto. Acerca el mapa a un nodo existente.');
        return;
      }

      const node = graph.nodes.find((n) => n.id === nearestId);
      if (!node) return;

      if (selectionMode === 'start') {
        setStartNode(node);
        setSelectionMode('end');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (selectionMode === 'end') {
        if (startNode && node.id === startNode.id) {
          Alert.alert('Nodo inválido', 'El nodo final debe ser diferente al nodo inicial.');
          return;
        }
        setEndNode(node);
        setSelectionMode(null);

        const route = dijkstra(graph, startNode ? startNode.id : '', node.id);
        if (!route) {
          Alert.alert('Sin ruta', 'No se encontró una ruta entre los nodos seleccionados. Verifica que existan aristas que los conecten.');
          setEndNode(null);
          return;
        }

        const result = graphRouteToWaypoints(graph, route, startNode?.id, node.id);
        setGraphRouteResult(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [graph, selectionMode, startNode],
  );

  const handleCreateRoute = useCallback(async () => {
    if (!name.trim()) return;
    if (!graphRouteResult) {
      Alert.alert('Falta ruta', 'Selecciona un nodo de inicio y uno de fin en el mapa para calcular la ruta.');
      return;
    }

    const distanceMeters = graphRouteResult.distance;
    const estimatedMinutes = Math.max(1, Math.round(graphRouteResult.etaMinutes));
    const directionLabel = routeInfo?.directionLabel?.replace(/[🛤️↑↗→↘↓↙←↖]/g, '').trim() || name.trim();

    await createRoute.mutateAsync({
      name: name.trim(),
      description: desc || null,
      color,
      isActive: true,
      estimatedTime: estimatedMinutes,
      distance: distanceMeters,
      direction: directionLabel,
    });
    resetForm();
  }, [name, desc, color, graphRouteResult, routeInfo, createRoute, resetForm]);

  const handleUpdateRoute = useCallback(async () => {
    if (!editRoute || !name.trim()) return;

    const distanceMeters = graphRouteResult?.distance;
    const estimatedMinutes = graphRouteResult ? Math.max(1, Math.round(graphRouteResult.etaMinutes)) : undefined;
    const directionLabel = routeInfo?.directionLabel?.replace(/[🛤️↑↗→↘↓↙←↖]/g, '').trim();

    await updateRoute.mutateAsync({
      id: editRoute.id,
      input: {
        name: name.trim(),
        description: desc || null,
        color,
        estimatedTime: estimatedMinutes ?? editRoute.estimatedTime ?? null,
        distance: distanceMeters ?? editRoute.distance ?? null,
        direction: directionLabel ?? editRoute.direction ?? null,
      },
    });
    resetForm();
  }, [editRoute, name, desc, color, graphRouteResult, routeInfo, updateRoute, resetForm]);

  const handleDeleteRoute = useCallback((route: BusRoute) => {
    Alert.alert('Eliminar ruta', `¿Eliminar "${route.name}" y todas sus paradas?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRoute.mutate(route.id) },
    ]);
  }, [deleteRoute]);

  const handleCreateStop = useCallback(async () => {
    if (!selectedRoute || !stopName.trim()) return;
    const lat = parseFloat(stopLat);
    const lng = parseFloat(stopLng);
    const order = parseInt(stopOrder, 10);
    if (isNaN(lat) || lat < -90 || lat > 90) return;
    if (isNaN(lng) || lng < -180 || lng > 180) return;
    await createStop.mutateAsync({
      routeId: selectedRoute.id,
      name: stopName.trim(),
      latitude: lat,
      longitude: lng,
      stopOrder: isNaN(order) ? 0 : order,
    });
    setStopName(''); setStopLat(''); setStopLng(''); setStopOrder(''); setShowForm(null);
  }, [selectedRoute, stopName, stopLat, stopLng, stopOrder, createStop]);

  const startEditRoute = useCallback((route: BusRoute) => {
    setEditRoute(route);
    setName(route.name);
    setDesc(route.description ?? '');
    setColor(route.color);
    setStartNode(null); setEndNode(null); setGraphRouteResult(null); setSelectionMode(null);
  }, []);

  const graphNodes = useMemo(() => graph?.nodes ?? [], [graph]);
  const hasNodes = graphNodes.length > 0;

  if (isLoading) return <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      <View style={s.header}>
        <Text style={s.title}>Gestión de Rutas</Text>
        <AppButton size="sm" label="+ Ruta" onPress={() => {
          resetForm();
          setName(''); setDesc(''); setColor('#1B6BB0');
          setEditRoute(null);
          setShowForm('route');
        }} />
      </View>

      {routes.map((route) => (
        <AppCard key={route.id} style={[!route.isActive && { opacity: 0.5 }, s.routeCard]}>
          <View style={s.cardHeader}>
            <View style={[s.colorDot, { backgroundColor: route.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeName}>{route.name}</Text>
              {route.description && <Text style={s.routeDesc}>{route.description}</Text>}
              {(route.estimatedTime || route.distance || route.direction) && (
                <View style={s.routeMeta}>
                  {route.direction && <Text style={s.routeMetaText}>{route.direction}</Text>}
                  {route.estimatedTime && <Text style={s.routeMetaText}>{route.estimatedTime} min</Text>}
                  {route.distance && <Text style={s.routeMetaText}>{(route.distance / 1000).toFixed(1)} km</Text>}
                </View>
              )}
            </View>
            <View style={s.routeActions}>
              <AppButton label="" variant="ghost" size="sm" icon={<Edit2 size={16} color={T.textSecondary} />} onPress={() => startEditRoute(route)} />
              <AppButton label="" variant="ghost" size="sm" icon={<Trash2 size={16} color={T.error} />} onPress={() => handleDeleteRoute(route)} />
            </View>
          </View>
          <View style={s.stopSection}>
            <AppButton variant="outline" size="sm" label="+ Parada" onPress={() => {
              setSelectedRoute(route);
              setShowForm('stop');
              setStopName(''); setStopLat(''); setStopLng(''); setStopOrder('');
            }} style={{ alignSelf: 'flex-start' }} />
          </View>
        </AppCard>
      ))}

      {routes.length === 0 && <EmptyState icon={Bus} title="No hay rutas" description="No se han configurado rutas de Polibus." />}

      {showForm === 'route' && (
        <AppCard style={{ gap: 12 }}>
          <Text style={s.formTitle}>{editRoute ? 'Editar ruta' : 'Nueva ruta'}</Text>

          <View style={s.field}>
            <Text style={s.label}>Nombre</Text>
            <TextInput style={s.input} placeholder="Nombre de la ruta" placeholderTextColor={T.inputPlaceholder} value={name} onChangeText={setName} autoFocus />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Descripción</Text>
            <TextInput style={s.input} placeholder="Descripción (opcional)" placeholderTextColor={T.inputPlaceholder} value={desc} onChangeText={setDesc} />
          </View>

          <ColorPicker selected={color} onSelect={setColor} />

          {!hasNodes && !graphLoading && (
            <View style={s.noNodesBanner}>
              <CircleAlert size={16} strokeWidth={2} color={T.warning} />
              <Text style={s.noNodesText}>No hay nodos configurados. Ve a la pestaña Grafos para crearlos.</Text>
            </View>
          )}

          {graphLoading && <ActivityIndicator size="small" color={T.primary} />}

          {hasNodes && (
            <>
              <View style={s.mapSection}>
                <View style={s.mapHeader}>
                  <Text style={s.label}>Mapa de nodos</Text>
                  <View style={s.selectionStatus}>
                    <View style={[s.selectionDot, startNode ? { backgroundColor: T.success } : { backgroundColor: T.textMuted }]} />
                    <Text style={s.selectionLabel}>
                      {!selectionMode && !startNode && 'Toca un nodo para empezar'}
                      {!selectionMode && startNode && !endNode && !graphRouteResult && 'Toca el nodo de destino'}
                      {!selectionMode && startNode && endNode && graphRouteResult && 'Ruta calculada ✓'}
                      {selectionMode === 'start' && 'Toca el nodo INICIAL en el mapa'}
                      {selectionMode === 'end' && 'Toca el nodo FINAL en el mapa'}
                    </Text>
                  </View>
                </View>

                <MapView
                  ref={mapRef}
                  style={s.miniMap}
                  provider={MAP_PROVIDER}
                  initialRegion={EPN_CENTER}
                  onPress={handleMapPress}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  toolbarEnabled={false}
                >
                  {graphNodes.map((node) => {
                    const isStart = startNode?.id === node.id;
                    const isEnd = endNode?.id === node.id;
                    const isOnRoute = graphRouteResult?.waypoints.some(
                      (wp) => Math.abs(wp.latitude - node.latitude) < 0.00005 && Math.abs(wp.longitude - node.longitude) < 0.00005,
                    );
                    return (
                      <Marker
                        key={node.id}
                        coordinate={{ latitude: node.latitude, longitude: node.longitude }}
                        onPress={() => {
                          if (!selectionMode) return;
                          handleMapPress({ nativeEvent: { coordinate: { latitude: node.latitude, longitude: node.longitude } } });
                        }}
                        pinColor={isStart ? '#10B981' : isEnd ? '#EF4444' : isOnRoute ? '#2563EB' : '#6B7280'}
                        title={node.label}
                        zIndex={100}
                      />
                    );
                  })}

                  {graphRouteResult && graphRouteResult.waypoints.length >= 2 && (
                    <Polyline
                      coordinates={graphRouteResult.waypoints}
                      strokeColor={color}
                      strokeWidth={6}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </MapView>
              </View>

              {!selectionMode && !startNode && (
                <AppButton
                  label="Seleccionar nodo inicial"
                  variant="outline"
                  onPress={() => setSelectionMode('start')}
                />
              )}

              {startNode && !endNode && selectionMode !== 'start' && (
                <AppButton
                  label="Seleccionar nodo final"
                  variant="outline"
                  onPress={() => setSelectionMode('end')}
                />
              )}

              {selectionMode && (
                <Pressable style={s.cancelSelectionBtn} onPress={() => {
                  if (selectionMode === 'end' && startNode) { setSelectionMode(null); return; }
                  setSelectionMode(null); setStartNode(null); setEndNode(null); setGraphRouteResult(null);
                }}>
                  <X size={14} strokeWidth={2} color={T.error} />
                  <Text style={s.cancelSelectionText}>Cancelar selección</Text>
                </Pressable>
              )}

              {startNode && endNode && (
                <View style={s.selectedNodesRow}>
                  <View style={[s.nodeBadge, { backgroundColor: T.successBg }]}>
                    <MapPin size={12} strokeWidth={2} color={T.success} />
                    <Text style={[s.nodeBadgeText, { color: T.success }]}>{startNode.label}</Text>
                  </View>
                  <Navigation size={14} strokeWidth={2} color={T.textTertiary} />
                  <View style={[s.nodeBadge, { backgroundColor: T.errorBg }]}>
                    <MapPin size={12} strokeWidth={2} color={T.error} />
                    <Text style={[s.nodeBadgeText, { color: T.error }]}>{endNode.label}</Text>
                  </View>
                </View>
              )}

              {graphRouteResult && routeInfo && (
                <View style={s.routeInfoCard}>
                  <View style={s.routeInfoItem}>
                    <Text style={s.routeInfoLabel}>Distancia</Text>
                    <Text style={s.routeInfoValue}>{routeInfo.distanceLabel}</Text>
                  </View>
                  <View style={s.routeInfoDivider} />
                  <View style={s.routeInfoItem}>
                    <Text style={s.routeInfoLabel}>Tiempo est.</Text>
                    <Text style={s.routeInfoValue}>{routeInfo.etaLabel}</Text>
                  </View>
                  <View style={s.routeInfoDivider} />
                  <View style={s.routeInfoItem}>
                    <Text style={s.routeInfoLabel}>Nodos</Text>
                    <Text style={s.routeInfoValue}>{graphRouteResult.nodeCount}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          <View style={s.formActions}>
            <AppButton
              style={{ flex: 1 }}
              label={editRoute ? 'Guardar' : 'Crear'}
              onPress={editRoute ? handleUpdateRoute : handleCreateRoute}
            />
            <AppButton
              style={{ flex: 1 }}
              variant="outline"
              label="Cancelar"
              onPress={resetForm}
            />
          </View>
        </AppCard>
      )}

      {showForm === 'stop' && (
        <AppCard style={{ gap: 10 }}>
          <Text style={s.formTitle}>Nueva parada en: {selectedRoute?.name}</Text>
          <TextInput style={s.input} placeholder="Nombre de la parada" placeholderTextColor={T.inputPlaceholder} value={stopName} onChangeText={setStopName} />
          <View style={s.row}>
            <TextInput style={[s.input, s.half]} placeholder="Latitud" placeholderTextColor={T.inputPlaceholder} keyboardType="numeric" value={stopLat} onChangeText={setStopLat} />
            <TextInput style={[s.input, s.half]} placeholder="Longitud" placeholderTextColor={T.inputPlaceholder} keyboardType="numeric" value={stopLng} onChangeText={setStopLng} />
          </View>
          <TextInput style={s.input} placeholder="Orden (#)" placeholderTextColor={T.inputPlaceholder} keyboardType="numeric" value={stopOrder} onChangeText={setStopOrder} />
          <View style={s.formActions}>
            <AppButton style={{ flex: 1 }} label="Crear" onPress={handleCreateStop} />
            <AppButton style={{ flex: 1 }} variant="outline" label="Cancelar" onPress={() => setShowForm(null)} />
          </View>
        </AppCard>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...Typography.h3, color: T.textPrimary },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 12,
    fontSize: 14, color: T.inputText,
  },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  formTitle: { ...Typography.h4, color: T.textPrimary, marginBottom: 2 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  routeName: { ...Typography.body, fontWeight: '700', color: T.textPrimary },
  routeDesc: { ...Typography.caption, color: T.textSecondary, marginTop: 2 },
  routeMeta: { flexDirection: 'row', gap: 10, marginTop: 4 },
  routeMetaText: { ...Typography.caption, color: T.textTertiary, fontSize: 10 },
  routeActions: { flexDirection: 'row', gap: 4 },
  routeCard: { gap: 10, marginBottom: 8 },
  stopSection: { borderTopWidth: 1, borderTopColor: T.cardBorder, paddingTop: 8 },

  mapSection: { gap: 8 },
  mapHeader: { gap: 4 },
  miniMap: {
    width: '100%', height: 220,
    borderRadius: Sizes.radiusMd,
    borderWidth: 1, borderColor: T.cardBorder,
    overflow: 'hidden',
  },
  noNodesBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.warningBg, borderRadius: Sizes.radiusSm,
    padding: 10, borderLeftWidth: 3, borderLeftColor: T.warning,
  },
  noNodesText: { ...Typography.caption, color: T.warning, flex: 1 },

  selectionStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.inputBg, borderRadius: Sizes.radiusSm,
    padding: 10,
  },
  selectionDot: { width: 10, height: 10, borderRadius: 5 },
  selectionLabel: { ...Typography.caption, color: T.textSecondary, flex: 1 },

  cancelSelectionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: Sizes.radiusSm, backgroundColor: T.errorBg,
  },
  cancelSelectionText: { ...Typography.caption, color: T.error, fontWeight: '600' },

  selectedNodesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: T.surface, borderRadius: Sizes.radiusMd,
    borderWidth: 1, borderColor: T.cardBorder,
    justifyContent: 'center',
  },
  nodeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  nodeBadgeText: { fontSize: 12, fontWeight: '700' },

  routeInfoCard: {
    flexDirection: 'row',
    backgroundColor: T.successBg + '40',
    borderRadius: Sizes.radiusMd,
    padding: 16,
    borderWidth: 1, borderColor: T.success + '30',
    gap: 0,
  },
  routeInfoItem: { flex: 1, alignItems: 'center', gap: 4 },
  routeInfoLabel: { fontSize: 10, fontWeight: '600', color: T.textTertiary, textTransform: 'uppercase' },
  routeInfoValue: { fontSize: 16, fontWeight: '800', color: T.primary },
  routeInfoDivider: { width: 1, backgroundColor: T.divider, marginHorizontal: 8 },
});
