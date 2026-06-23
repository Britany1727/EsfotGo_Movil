import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker, Polyline } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { Edit2, Trash2, MapPin, X, Navigation } from 'lucide-react-native';
import { useCampusGraph, useGraphNodeMutations, useGraphEdgeMutations } from '@/features/graph/application/graph.hooks';
import { logGraphStats, validateEdgeNodes, validateGraphIntegrity } from '@/features/graph/domain/graph-integrity';
import type { GraphNode, GraphEdge } from '@/features/graph/domain/graph.entity';
import { haversineDistance } from '@/features/map/domain/coordinates';
import { MapFloatingActions } from '@/features/map/presentation/map-floating-actions';
import { useLocation } from '@/hooks/useLocation';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';

const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

const EPN_CENTER = { latitude: -0.2095, longitude: -78.4905, latitudeDelta: 0.012, longitudeDelta: 0.012 };

export function GraphAdmin() {
  const { data: graph, isLoading } = useCampusGraph();
  const { upsertNode, deleteNode } = useGraphNodeMutations();
  const { upsertEdge, updateEdge, deleteEdge, toggleBlock } = useGraphEdgeMutations();
  const { location: userLocation } = useLocation();
  const mapRef = useRef<MapView>(null);

  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);

  const [nLabel, setNLabel] = useState('');
  const [nLat, setNLat] = useState<number | null>(null);
  const [nLng, setNLng] = useState<number | null>(null);
  const [nType, setNType] = useState<string>('punto_interes');
  const [nFloor, setNFloor] = useState('1');
  const [pickingCoords, setPickingCoords] = useState(false);

  const [edgeOriginNode, setEdgeOriginNode] = useState<GraphNode | null>(null);
  const [edgeDestNode, setEdgeDestNode] = useState<GraphNode | null>(null);
  const [edgeSelectMode, setEdgeSelectMode] = useState<'origin' | 'dest' | null>(null);

  const resetNodeForm = useCallback(() => {
    setShowNodeForm(false); setEditingNode(null); setNLabel('');
    setNLat(null); setNLng(null); setPickingCoords(false);
    setNType('punto_interes'); setNFloor('1');
  }, []);

  const resetEdgeForm = () => { setShowEdgeForm(false); setEditingEdge(null); setEdgeOriginNode(null); setEdgeDestNode(null); setEdgeSelectMode(null); };

  const handleMapPress = useCallback((e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    if (!pickingCoords) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setNLat(parseFloat(latitude.toFixed(6)));
    setNLng(parseFloat(longitude.toFixed(6)));
    setPickingCoords(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pickingCoords]);

  const handleNodeSave = useCallback(() => {
    if (!nLabel.trim()) return;
    if (nLat === null || nLng === null) {
      Alert.alert('Faltan coordenadas', 'Selecciona una ubicación en el mapa antes de guardar.');
      return;
    }
    if (nLat < -90 || nLat > 90 || nLat === 0) {
      Alert.alert('Latitud inválida', 'La latitud debe estar entre -90 y 90 y no puede ser 0.');
      return;
    }
    if (nLng < -180 || nLng > 180 || nLng === 0) {
      Alert.alert('Longitud inválida', 'La longitud debe estar entre -180 y 180 y no puede ser 0.');
      return;
    }
    upsertNode.mutateAsync(
      {
        id: editingNode?.id,
        label: nLabel.trim(),
        latitude: nLat,
        longitude: nLng,
        type: (nType as GraphNode['type']) ?? 'punto_interes',
        floor: Number(nFloor) || 1,
        referenceId: editingNode?.referenceId ?? null,
        referenceModel: editingNode?.referenceModel ?? null,
      },
      { onSuccess: resetNodeForm },
    );
  }, [nLabel, nLat, nLng, nType, nFloor, editingNode, upsertNode, resetNodeForm]);

  const autoWeight = useMemo(() => {
    if (!edgeOriginNode || !edgeDestNode) return null;
    return Math.round(haversineDistance(
      { latitude: edgeOriginNode.latitude, longitude: edgeOriginNode.longitude },
      { latitude: edgeDestNode.latitude, longitude: edgeDestNode.longitude },
    ));
  }, [edgeOriginNode, edgeDestNode]);

  const handleEdgeSave = useCallback(() => {
    if (!edgeOriginNode || !edgeDestNode) return;
    if (autoWeight === null) return;

    if (graph) {
      const { valid, errors } = validateEdgeNodes(graph, edgeOriginNode.id, edgeDestNode.id);
      if (!valid) {
        Alert.alert('Arista inválida', errors.join('\n'));
        return;
      }
    }
    upsertEdge.mutateAsync(
      { id: editingEdge?.id, fromNodeId: edgeOriginNode.id, toNodeId: edgeDestNode.id, weight: autoWeight, blocked: false, bidirectional: true },
      { onSuccess: resetEdgeForm },
    );
  }, [edgeOriginNode, edgeDestNode, autoWeight, editingEdge, upsertEdge, graph]);

  const startEditNode = (n: GraphNode) => {
    setEditingNode(n); setShowNodeForm(true); setNLabel(n.label);
    setNLat(n.latitude); setNLng(n.longitude); setPickingCoords(false);
    setNType(n.type ?? 'punto_interes');
    setNFloor(String(n.floor ?? 1));
  };

  const startEditEdge = (e: GraphEdge) => {
    setEditingEdge(e);
    setShowEdgeForm(true);
    setEdgeSelectMode(null);
    const from = nodes.find((n) => n.id === e.fromNodeId) ?? null;
    const to = nodes.find((n) => n.id === e.toNodeId) ?? null;
    setEdgeOriginNode(from);
    setEdgeDestNode(to);
  };

  if (isLoading) return <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />;

  const stats = useMemo(() => graph ? validateGraphIntegrity(graph) : null, [graph]);
  const nodes = graph?.nodes ?? [];
  const hasCoords = nLat !== null && nLng !== null;

  return (
    <ScrollView contentContainerStyle={s.container} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      {stats && (stats.isolatedNodes.length > 0 || stats.danglingEdges.length > 0 || stats.selfLoops.length > 0) && (
        <View style={s.statsBanner}>
          <Text style={s.statsBannerTitle}>⚠️ Advertencias de integridad</Text>
          {stats.isolatedNodes.length > 0 && <Text style={s.statsBannerText}>{stats.isolatedNodes.length} nodo(s) aislado(s)</Text>}
          {stats.danglingEdges.length > 0 && <Text style={s.statsBannerText}>{stats.danglingEdges.length} arista(s) a nodos inexistentes</Text>}
          {stats.selfLoops.length > 0 && <Text style={s.statsBannerText}>{stats.selfLoops.length} self-loop(s)</Text>}
        </View>
      )}

      <Text style={s.sectionTitle}>Nodos ({nodes.length})</Text>
      <Pressable style={s.addBtn} onPress={() => { resetNodeForm(); setShowNodeForm(true); }}>
        <Text style={s.addBtnText}>+ Nodo</Text>
      </Pressable>

      {nodes.map((node) => (
        <View key={node.id} style={s.card}>
          <View style={s.cardBody}>
            <Text style={s.cardTitle}>{node.label}</Text>
            <Text style={s.cardSub}>{node.latitude.toFixed(6)}, {node.longitude.toFixed(6)}</Text>
          </View>
          <Pressable onPress={() => startEditNode(node)}>
            <Edit2 size={16} strokeWidth={2} color={T.primary} />
          </Pressable>
          <Pressable onPress={() => Alert.alert('Eliminar nodo', `¿Eliminar "${node.label}" y sus aristas?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => deleteNode.mutate(node.id) }])}>
            <Trash2 size={16} strokeWidth={2} color={T.error} />
          </Pressable>
        </View>
      ))}

      <Text style={[s.sectionTitle, { marginTop: 20 }]}>Aristas ({graph?.edges.length ?? 0})</Text>
      <Pressable style={s.addBtn} onPress={() => { resetEdgeForm(); setShowEdgeForm(true); }}>
        <Text style={s.addBtnText}>+ Arista</Text>
      </Pressable>

      {graph?.edges.map((edge) => {
        const fromNode = graph.nodes.find((n) => n.id === edge.fromNodeId);
        const toNode = graph.nodes.find((n) => n.id === edge.toNodeId);
        return (
          <View key={edge.id} style={[s.card, edge.blocked && { opacity: 0.4 }]}>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{fromNode?.label ?? edge.fromNodeId} → {toNode?.label ?? edge.toNodeId}</Text>
              <Text style={s.cardSub}>{edge.weight}m · {edge.bidirectional ? 'bidir' : 'unidir'} {edge.blocked ? '· BLOQUEADO' : ''}</Text>
            </View>
            <Pressable onPress={() => startEditEdge(edge)}>
              <Edit2 size={16} strokeWidth={2} color={T.primary} />
            </Pressable>
            <Pressable onPress={() => toggleBlock(edge.id, edge.blocked)}>
              <Text style={[s.actionBtn, { color: edge.blocked ? T.success : T.warning }]}>{edge.blocked ? 'Desbloq' : 'Bloq'}</Text>
            </Pressable>
            <Pressable onPress={() => deleteEdge.mutate(edge.id)}>
              <Trash2 size={16} strokeWidth={2} color={T.error} />
            </Pressable>
          </View>
        );
      })}

      {showNodeForm && (
        <View style={s.form}>
          <Text style={s.formTitle}>{editingNode ? 'Editar nodo' : 'Nuevo nodo'}</Text>

          <View style={s.field}>
            <Text style={s.label}>Etiqueta</Text>
            <TextInput style={s.input} placeholder="Ej: Entrada Principal" placeholderTextColor={T.inputPlaceholder} value={nLabel} onChangeText={setNLabel} autoFocus />
          </View>

          <View style={s.field}>
            <View style={s.mapHeaderRow}>
              <Text style={s.label}>Ubicación</Text>
              {!pickingCoords && !hasCoords && (
                <Pressable style={s.pickBtn} onPress={() => { setPickingCoords(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <MapPin size={14} strokeWidth={2} color={T.primary} />
                  <Text style={s.pickBtnText}>Seleccionar en el mapa</Text>
                </Pressable>
              )}
              {pickingCoords && (
                <Pressable style={s.cancelPickBtn} onPress={() => setPickingCoords(false)}>
                  <X size={14} strokeWidth={2} color={T.error} />
                  <Text style={s.cancelPickText}>Cancelar</Text>
                </Pressable>
              )}
              {hasCoords && !pickingCoords && (
                <Pressable style={s.pickBtn} onPress={() => { setPickingCoords(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <MapPin size={14} strokeWidth={2} color={T.primary} />
                  <Text style={s.pickBtnText}>Cambiar</Text>
                </Pressable>
              )}
            </View>

            {pickingCoords && (
              <Text style={s.pickingHint}>Toca cualquier punto del mapa para capturar las coordenadas</Text>
            )}

            <View style={{ position: 'relative' }}>
              <MapView
                ref={mapRef}
                style={[s.miniMap, { marginBottom: 0 }]}
                provider={MAP_PROVIDER}
              initialRegion={hasCoords && nLat !== null && nLng !== null ? { latitude: nLat, longitude: nLng, latitudeDelta: 0.005, longitudeDelta: 0.005 } : EPN_CENTER}
              onPress={handleMapPress}
              scrollEnabled={true}
              zoomEnabled={true}
              toolbarEnabled={false}
            >
              {nodes.map((node) => (
                <Marker
                  key={node.id}
                  coordinate={{ latitude: node.latitude, longitude: node.longitude }}
                  pinColor={editingNode?.id === node.id ? '#F59E0B' : '#6B7280'}
                  title={node.label}
                  zIndex={100}
                />
              ))}

              {hasCoords && nLat !== null && nLng !== null && (
                <Marker
                  coordinate={{ latitude: nLat, longitude: nLng }}
                  pinColor={editingNode ? '#F59E0B' : '#10B981'}
                  title={editingNode ? 'Nueva ubicación' : 'Ubicación seleccionada'}
                  zIndex={200}
                />
              )}
            </MapView>

            <MapFloatingActions
              mapRef={mapRef}
              userLocation={userLocation}
              bottom={8}
              right={8}
            />
            </View>
          </View>

          {hasCoords && (
            <View style={s.coordsReadonly}>
              <View style={s.coordItem}>
                <Text style={s.coordLabel}>Latitud</Text>
                <Text style={s.coordValue}>{nLat!.toFixed(6)}</Text>
              </View>
              <View style={s.coordDivider} />
              <View style={s.coordItem}>
                <Text style={s.coordLabel}>Longitud</Text>
                <Text style={s.coordValue}>{nLng!.toFixed(6)}</Text>
              </View>
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>Tipo de nodo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeChips}>
              {['entrada', 'hall', 'pasillo', 'escalera', 'aula', 'oficina', 'cafeteria', 'punto_interes'].map((t) => (
                <Pressable
                  key={t}
                  style={[s.typeChip, nType === t && { backgroundColor: T.primary, borderColor: T.primary }]}
                  onPress={() => setNType(t)}
                >
                  <Text style={[s.typeChipText, nType === t && { color: '#FFFFFF' }]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Piso</Text>
            <TextInput style={s.input} placeholder="1" placeholderTextColor={T.inputPlaceholder} keyboardType="numeric" value={nFloor} onChangeText={setNFloor} />
          </View>

          <View style={s.formActions}>
            <Pressable style={[s.saveBtn, !hasCoords && { opacity: 0.5 }]} onPress={handleNodeSave} disabled={!hasCoords}>
              <Text style={s.saveText}>Guardar</Text>
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={resetNodeForm}>
              <Text style={s.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showEdgeForm && (
        <View style={s.form}>
          <Text style={s.formTitle}>{editingEdge ? 'Editar arista' : 'Nueva arista'}</Text>

          {nodes.length === 0 && (
            <View style={s.noNodesBanner}>
              <X size={14} strokeWidth={2} color={T.warning} />
              <Text style={s.noNodesText}>No hay nodos. Crea nodos primero.</Text>
            </View>
          )}

          {nodes.length > 0 && (
            <>
              <View style={s.field}>
                <View style={s.mapHeaderRow}>
                  <Text style={s.label}>Seleccionar nodos</Text>
                  {!edgeSelectMode && !edgeOriginNode && (
                    <Pressable style={s.pickBtn} onPress={() => { setEdgeSelectMode('origin'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <MapPin size={14} strokeWidth={2} color={T.success} />
                      <Text style={[s.pickBtnText, { color: T.success }]}>Seleccionar origen</Text>
                    </Pressable>
                  )}
                  {!edgeSelectMode && edgeOriginNode && !edgeDestNode && (
                    <Pressable style={[s.pickBtn, { borderColor: T.error + '40', backgroundColor: T.errorBg }]} onPress={() => { setEdgeSelectMode('dest'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <MapPin size={14} strokeWidth={2} color={T.error} />
                      <Text style={[s.pickBtnText, { color: T.error }]}>Seleccionar destino</Text>
                    </Pressable>
                  )}
                  {edgeSelectMode && (
                    <Pressable style={s.cancelPickBtn} onPress={() => setEdgeSelectMode(null)}>
                      <X size={14} strokeWidth={2} color={T.error} />
                      <Text style={s.cancelPickText}>Cancelar</Text>
                    </Pressable>
                  )}
                  {edgeOriginNode && edgeDestNode && !edgeSelectMode && (
                    <Pressable style={s.pickBtn} onPress={() => { setEdgeOriginNode(null); setEdgeDestNode(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <X size={14} strokeWidth={2} color={T.textSecondary} />
                      <Text style={[s.pickBtnText, { color: T.textSecondary }]}>Reiniciar</Text>
                    </Pressable>
                  )}
                </View>

                {edgeSelectMode && (
                  <Text style={s.pickingHint}>
                    Toca el nodo <Text style={{ color: edgeSelectMode === 'origin' ? T.success : T.error, fontWeight: '800' }}>{edgeSelectMode === 'origin' ? 'ORIGEN' : 'DESTINO'}</Text> en el mapa
                  </Text>
                )}

                <MapView
                  ref={mapRef}
                  style={s.miniMap}
                  provider={MAP_PROVIDER}
                  initialRegion={EPN_CENTER}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  toolbarEnabled={false}
                >
                  {nodes.map((node) => {
                    const isOrigin = edgeOriginNode?.id === node.id;
                    const isDest = edgeDestNode?.id === node.id;
                    const pinColor = isOrigin ? '#10B981' : isDest ? '#EF4444' : '#6B7280';
                    return (
                      <Marker
                        key={node.id}
                        coordinate={{ latitude: node.latitude, longitude: node.longitude }}
                        pinColor={pinColor}
                        title={node.label}
                        description={isOrigin ? 'Origen' : isDest ? 'Destino' : undefined}
                        zIndex={100}
                        onPress={() => {
                          if (!edgeSelectMode) return;
                          if (edgeSelectMode === 'origin') {
                            if (edgeDestNode && node.id === edgeDestNode.id) return;
                            setEdgeOriginNode(node);
                            setEdgeSelectMode(edgeDestNode ? null : 'dest');
                          } else {
                            if (edgeOriginNode && node.id === edgeOriginNode.id) return;
                            setEdgeDestNode(node);
                            setEdgeSelectMode(null);
                          }
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                      />
                    );
                  })}

                  {edgeOriginNode && edgeDestNode && (
                    <Polyline
                      coordinates={[
                        { latitude: edgeOriginNode.latitude, longitude: edgeOriginNode.longitude },
                        { latitude: edgeDestNode.latitude, longitude: edgeDestNode.longitude },
                      ]}
                      strokeColor={T.primary}
                      strokeWidth={4}
                      lineDashPattern={[8, 4]}
                      lineCap="round"
                    />
                  )}
                </MapView>
              </View>

              {edgeOriginNode && edgeDestNode && autoWeight !== null && (
                <View style={s.edgeInfoCard}>
                  <View style={s.edgeInfoRow}>
                    <View style={[s.edgeNodeBadge, { backgroundColor: T.successBg }]}>
                      <MapPin size={10} strokeWidth={2} color={T.success} />
                      <Text style={[s.edgeNodeLabel, { color: T.success }]} numberOfLines={1}>{edgeOriginNode.label}</Text>
                    </View>
                    <Navigation size={14} strokeWidth={2} color={T.textTertiary} />
                    <View style={[s.edgeNodeBadge, { backgroundColor: T.errorBg }]}>
                      <MapPin size={10} strokeWidth={2} color={T.error} />
                      <Text style={[s.edgeNodeLabel, { color: T.error }]} numberOfLines={1}>{edgeDestNode.label}</Text>
                    </View>
                  </View>
                  <View style={s.edgeWeightRow}>
                    <Text style={s.edgeWeightLabel}>Peso (distancia)</Text>
                    <Text style={s.edgeWeightValue}>{autoWeight < 1000 ? `${autoWeight} m` : `${(autoWeight / 1000).toFixed(2)} km`}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          <View style={s.formActions}>
            <Pressable style={[s.saveBtn, (!edgeOriginNode || !edgeDestNode) && { opacity: 0.5 }]} onPress={handleEdgeSave} disabled={!edgeOriginNode || !edgeDestNode}>
              <Text style={s.saveText}>Guardar</Text>
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={resetEdgeForm}>
              <Text style={s.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 60 },
  sectionTitle: { ...Typography.h3, color: T.textPrimary },
  addBtn: {
    alignSelf: 'flex-start', backgroundColor: T.primary,
    borderRadius: Sizes.radiusSm, paddingHorizontal: 16, paddingVertical: 10,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.25,
  },
  addBtnText: { ...Typography.caption, fontWeight: '700', color: '#FFFFFF' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg,
    padding: 12, gap: 8, borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  cardBody: { flex: 1 },
  cardTitle: { ...Typography.body, fontWeight: '700', color: T.textPrimary },
  cardSub: { ...Typography.caption, color: T.textSecondary, marginTop: 2 },
  actionBtn: { ...Typography.caption, fontWeight: '700', paddingHorizontal: 4 },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 12, fontSize: 14, color: T.inputText,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  form: {
    backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg,
    padding: 14, gap: 10, borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.md,
  },
  formTitle: { ...Typography.h4, color: T.textPrimary },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  saveBtn: {
    flex: 1, backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    padding: 14, alignItems: 'center',
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  saveText: { ...Typography.button, color: '#FFFFFF', fontSize: 14 },
  cancelBtn: {
    flex: 1, backgroundColor: T.surface, borderRadius: Sizes.radiusSm,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.cardBorder,
  },
  cancelText: { ...Typography.body, color: T.textSecondary, fontWeight: '600' },
  statsBanner: {
    backgroundColor: T.warningBg, borderRadius: Sizes.radiusMd,
    padding: 12, marginBottom: 12, gap: 4,
    borderLeftWidth: 3, borderLeftColor: T.warning,
  },
  statsBannerTitle: { ...Typography.caption, fontWeight: '700', color: T.warning },
  statsBannerText: { ...Typography.caption, color: T.textSecondary },

  mapHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: T.primary + '40', backgroundColor: T.primaryMuted },
  pickBtnText: { fontSize: 11, fontWeight: '700', color: T.primary },
  cancelPickBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: T.error + '40', backgroundColor: T.errorBg },
  cancelPickText: { fontSize: 11, fontWeight: '700', color: T.error },
  pickingHint: { fontSize: 11, color: T.warning, fontWeight: '600' },
  miniMap: {
    width: '100%', height: 200,
    borderRadius: Sizes.radiusMd,
    borderWidth: 1, borderColor: T.cardBorder,
    overflow: 'hidden',
  },
  coordsReadonly: {
    flexDirection: 'row',
    backgroundColor: T.successBg + '40',
    borderRadius: Sizes.radiusSm,
    padding: 14,
    borderWidth: 1, borderColor: T.success + '25',
  },
  coordItem: { flex: 1, alignItems: 'center', gap: 3 },
  coordLabel: { fontSize: 10, fontWeight: '600', color: T.textTertiary, textTransform: 'uppercase' },
  coordValue: { fontSize: 15, fontWeight: '800', color: T.success, fontVariant: ['tabular-nums'] },
  coordDivider: { width: 1, backgroundColor: T.divider },

  noNodesBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.warningBg, borderRadius: Sizes.radiusSm,
    padding: 10, borderLeftWidth: 3, borderLeftColor: T.warning,
  },
  noNodesText: { ...Typography.caption, color: T.warning, flex: 1 },

  edgeInfoCard: {
    backgroundColor: T.inputBg,
    borderRadius: Sizes.radiusMd,
    padding: 14,
    gap: 10,
    borderWidth: 1, borderColor: T.cardBorder,
  },
  edgeInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center',
  },
  edgeNodeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    maxWidth: '40%',
  },
  edgeNodeLabel: { fontSize: 12, fontWeight: '700' },
  edgeWeightRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1, borderTopColor: T.divider,
  },
  edgeWeightLabel: { fontSize: 11, fontWeight: '600', color: T.textTertiary, textTransform: 'uppercase' },
  edgeWeightValue: { fontSize: 16, fontWeight: '800', color: T.primary },

  typeChips: { gap: 6 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Sizes.radiusFull,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.cardBorder,
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
});
