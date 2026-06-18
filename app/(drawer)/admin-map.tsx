import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Toast from 'react-native-toast-message';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker, Polygon } from 'react-native-maps';
import type { MapRegion, MapMarkerData } from '@/features/map/domain/coordinates';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import { LocationMarker } from '@/features/map/presentation/markers';
import { PoiForm } from '@/features/admin/presentation/poi-form';
import { ZonePanel } from '@/features/admin/presentation/zone-panel';
import { useAdminPois, useAdminZones } from '@/features/admin/application/poi.hooks';
import { BusRoutesAdmin } from '@/features/polibus/presentation/bus-routes-admin';
import { GraphAdmin } from '@/features/graph/presentation/graph-admin';
import type { PoiInput, PoiUpdateInput } from '@/features/admin/domain/poi.entity';
import { useAuthStore } from '@/store/auth.store';
import { RoleGuard } from '@/core/guards/role.guard';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';
import { Lock, Map, Bus, Edit2, Trash2, AlertTriangle, Network } from 'lucide-react-native';

type AdminTab = 'mapa' | 'rutas' | 'zonas' | 'grafos';

const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

const EPN_REGION: MapRegion = {
  latitude: -0.2095, longitude: -78.4905,
  latitudeDelta: 0.012, longitudeDelta: 0.012,
};

export default function AdminMapScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const mapRef = useRef<MapView>(null);
  const { pois, isLoading, createPoi, updatePoi, deletePoi } = useAdminPois();
  const { zones, isLoading: zonesLoading, createZone, updateZone, deleteZone } = useAdminZones();

  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('mapa');
  const [selectedPoi, setSelectedPoi] = useState<CampusLocation | null>(null);
  const [newCoordinate, setNewCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      if (!editMode) return;
      setNewCoordinate(e.nativeEvent.coordinate);
      setSelectedPoi(null);
      setPanelVisible(true);
    }, [editMode]);

  const handleMarkerPress = useCallback(
    (poi: CampusLocation) => {
      if (!editMode) return;
      setSelectedPoi(poi);
      setNewCoordinate(null);
      setPanelVisible(true);
    }, [editMode]);

  const handleCreate = useCallback((input: PoiInput) => {
    createPoi.mutateAsync(input)
      .then(() => { setPanelVisible(false); setNewCoordinate(null); })
      .catch(() => Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo crear la ubicación' }));
  }, [createPoi]);

  const handleUpdate = useCallback((id: string, input: PoiUpdateInput) => {
    updatePoi.mutateAsync({ id, input })
      .then(() => { setPanelVisible(false); setSelectedPoi(null); })
      .catch(() => Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar la ubicación' }));
  }, [updatePoi]);

  const handleDelete = useCallback((poi: CampusLocation) => {
    Alert.alert('Eliminar ubicación', `¿Eliminar "${poi.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deletePoi.mutateAsync(poi.id); setPanelVisible(false); setSelectedPoi(null); } },
    ]);
  }, [deletePoi]);

  const markersData = useMemo<MapMarkerData[]>(() => pois.map((poi) => ({
    id: poi.id,
    coordinate: { latitude: poi.latitude, longitude: poi.longitude },
    title: poi.name,
    description: poi.description ?? undefined,
    category: poi.category,
    clusterWeight: 1,
  })), [pois]);

  const onMarkerPress = useCallback((marker: MapMarkerData) => {
    const poi = pois.find((p) => p.id === marker.id);
    if (poi) handleMarkerPress(poi);
  }, [pois, handleMarkerPress]);

  return (
    <RoleGuard allowedRoles={['administrador', 'gestor']} fallback={
      <View style={gateStyles.container}>
        <Lock size={48} color={T.textSecondary} />
        <Text style={gateStyles.title}>Acceso restringido</Text>
        <Text style={gateStyles.desc}>Esta sección solo está disponible para administradores.</Text>
      </View>
    }>
      <View style={styles.container}>
        <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'mapa' && styles.tabActive]} onPress={() => setActiveTab('mapa')}>
          <Map size={18} color={activeTab === 'mapa' ? T.primary : T.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'mapa' && styles.tabTextActive]}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'rutas' && styles.tabActive]} onPress={() => setActiveTab('rutas')}>
          <Bus size={18} color={activeTab === 'rutas' ? T.primary : T.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'rutas' && styles.tabTextActive]}>Rutas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'zonas' && styles.tabActive]} onPress={() => setActiveTab('zonas')}>
          <AlertTriangle size={18} color={activeTab === 'zonas' ? T.primary : T.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'zonas' && styles.tabTextActive]}>Zonas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'grafos' && styles.tabActive]} onPress={() => setActiveTab('grafos')}>
          <Network size={18} color={activeTab === 'grafos' ? T.primary : T.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'grafos' && styles.tabTextActive]}>Grafos</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'rutas' ? (
        <BusRoutesAdmin />
      ) : activeTab === 'zonas' ? (
        <View style={styles.zoneContainer}><ZonePanel zones={zones} zLoading={zonesLoading} createZone={createZone} updateZone={updateZone} deleteZone={deleteZone} /></View>
      ) : activeTab === 'grafos' ? (
        <View style={styles.zoneContainer}><GraphAdmin /></View>
      ) : (
        <>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        initialRegion={EPN_REGION}
        onPress={handleMapPress}
        showsUserLocation
        toolbarEnabled={false}
      >
        {markersData.map((marker) => (
          <LocationMarker
            key={marker.id}
            marker={marker}
            onPress={onMarkerPress}
          />
        ))}

        {zones
          .filter((z) => z.isActive)
          .map((zone) => (
            <Polygon
              key={zone.id}
              coordinates={zone.coordinates}
              fillColor={zone.fillColor}
              strokeColor={zone.strokeColor}
              strokeWidth={2}
            />
          ))}

        {newCoordinate && (
          <Marker
            coordinate={newCoordinate}
            pinColor="#FFB81C"
            title="Nueva ubicación"
            zIndex={200}
          />
        )}
      </MapView>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolbarBtn, editMode && styles.toolbarBtnActive]}
          onPress={() => {
            setEditMode(!editMode);
            setPanelVisible(false);
            setSelectedPoi(null);
            setNewCoordinate(null);
          }}
          activeOpacity={0.7}
        >
          <Edit2 size={16} color={editMode ? T.surface : T.textPrimary} style={{ marginRight: 6 }} />
          <Text style={[styles.toolbarBtnText, editMode && styles.toolbarBtnTextActive]}>
            {editMode ? 'Editando' : 'Editar'}
          </Text>
        </TouchableOpacity>
        {editMode && (
          <Text style={styles.hint}>Toca el mapa para agregar un POI</Text>
        )}
      </View>

      {isLoading && (
        <ActivityIndicator
          size="large"
          color={T.primary}
          style={styles.loader}
        />
      )}

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Ubicaciones ({pois.length})</Text>
        </View>

        <FlashList
          data={pois}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.poiItem, selectedPoi?.id === item.id && styles.poiItemSelected]}
              onPress={() => {
                setSelectedPoi(item);
                setNewCoordinate(null);
                setPanelVisible(true);
                mapRef.current?.animateToRegion(
                  { latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 },
                  400
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.poiItemContent}>
                <Text style={styles.poiItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.poiItemCat}>{item.category}</Text>
              </View>
              {editMode && (
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={8}
                  activeOpacity={0.6}
                >
                  <Trash2 size={18} color={T.error} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
          style={styles.poiList}
        />
      </View>

      {panelVisible && (
        <View style={styles.formOverlay}>
          <View style={styles.formCard}>
            <PoiForm
              initialCoordinate={newCoordinate ?? undefined}
              editingPoi={selectedPoi}
              isLoading={createPoi.isPending || updatePoi.isPending}
              onSubmit={handleCreate}
              onUpdate={handleUpdate}
              onCancel={() => {
                setPanelVisible(false);
                setSelectedPoi(null);
                setNewCoordinate(null);
              }}
            />
            {selectedPoi && (
              <TouchableOpacity
                style={styles.deletePoiBtn}
                onPress={() => handleDelete(selectedPoi)}
                activeOpacity={0.7}
              >
                <Text style={styles.deletePoiText}>Eliminar ubicación</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
        </>
      )}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  tabBar: {
    flexDirection: 'row', padding: 12, paddingBottom: 0, gap: 8,
    backgroundColor: T.surfaceGlass,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  tab: {
    flex: 1, paddingVertical: 14, borderRadius: Sizes.radiusMd,
    backgroundColor: T.surface, alignItems: 'center',
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  tabActive: {
    backgroundColor: T.primaryMuted, borderColor: T.primary,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.15,
  },
  tabText: { fontSize: 12, fontWeight: '600', color: T.textSecondary, marginTop: 4 },
  tabTextActive: { color: T.primary },
  map: { flex: 1 },
  toolbar: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    zIndex: 100,
  },
  toolbarBtn: {
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusFull,
    paddingHorizontal: 14, paddingVertical: 8,
    ...Shadows.md,
    borderWidth: 1, borderColor: T.cardBorder,
  },
  toolbarBtnActive: { backgroundColor: T.primary, borderColor: T.primary },
  toolbarBtnText: { ...Typography.caption, fontWeight: '700', color: T.textPrimary },
  toolbarBtnTextActive: { color: '#FFFFFF' },
  hint: { ...Typography.caption, color: T.textSecondary, flex: 1 },
  loader: { position: 'absolute', top: '50%', alignSelf: 'center' },
  panel: {
    backgroundColor: T.surfaceGlass,
    borderTopLeftRadius: Sizes.radiusXl,
    borderTopRightRadius: Sizes.radiusXl,
    padding: 16,
    maxHeight: 220,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.xl,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  panelTitle: { ...Typography.h4, color: T.textPrimary },
  poiList: { maxHeight: 140 },
  poiItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: Sizes.radiusSm,
    marginBottom: 4,
    backgroundColor: T.background,
    justifyContent: 'space-between',
    borderWidth: 1, borderColor: T.cardBorder,
  },
  poiItemSelected: {
    backgroundColor: T.infoBg, borderColor: T.info,
  },
  poiItemContent: { flex: 1 },
  poiItemName: { fontSize: 13, fontWeight: '600', color: T.textPrimary },
  poiItemCat: { fontSize: 10, color: T.textTertiary },
  deleteIcon: { fontSize: 16 },
  formOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
  },
  formCard: {
    backgroundColor: T.surfaceGlass,
    borderTopLeftRadius: Sizes.radiusXl,
    borderTopRightRadius: Sizes.radiusXl,
    padding: 20, paddingTop: 14, gap: 10,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.xl,
  },
  deletePoiBtn: {
    padding: 14, borderRadius: Sizes.radiusSm,
    backgroundColor: T.errorBg, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: T.error + '25',
  },
  deletePoiText: { fontSize: 14, fontWeight: '600', color: T.error },
  zoneContainer: { flex: 1 },
});

const gateStyles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: T.background, gap: 16,
  },
  title: { ...Typography.h3, color: T.textPrimary },
  desc: { ...Typography.body, color: T.textSecondary, textAlign: 'center' },
});
