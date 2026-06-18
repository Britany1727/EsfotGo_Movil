import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  TextInput, ScrollView, Pressable, Platform, Switch,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker, Polygon } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import type { RestrictedZone, ZoneRestrictionType } from '@/features/admin/domain/poi.entity';
import { useAdminZones } from '@/features/admin/application/poi.hooks';
import { ColorPicker } from '@/features/polibus/presentation/color-picker';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { Edit2, Trash2, X, Undo2, Check } from 'lucide-react-native';

const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

const EPN_CENTER = { latitude: -0.2095, longitude: -78.4905, latitudeDelta: 0.012, longitudeDelta: 0.012 };

const RESTRICTION_TYPE_OPTIONS: { value: ZoneRestrictionType; label: string; color: string }[] = [
  { value: 'acceso_restringido', label: 'Acceso restringido', color: '#DC2626' },
  { value: 'construccion', label: 'Construcción', color: '#F59E0B' },
  { value: 'peatonal', label: 'Peatonal', color: '#3B82F6' },
  { value: 'emergencia', label: 'Emergencia', color: '#EF4444' },
  { value: 'ambiental', label: 'Ambiental', color: '#10B981' },
  { value: 'seguridad', label: 'Seguridad', color: '#8B5CF6' },
  { value: 'otro', label: 'Otro', color: '#6B7280' },
];

interface ZonePanelProps {
  zones: RestrictedZone[];
  zLoading: boolean;
  createZone: ReturnType<typeof useAdminZones>['createZone'];
  updateZone: ReturnType<typeof useAdminZones>['updateZone'];
  deleteZone: ReturnType<typeof useAdminZones>['deleteZone'];
}

export function ZonePanel({ zones, zLoading, createZone, updateZone, deleteZone }: ZonePanelProps) {
  const mapRef = useRef<MapView>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RestrictedZone | null>(null);

  const [zName, setZName] = useState('');
  const [zDesc, setZDesc] = useState('');
  const [zFill, setZFill] = useState('rgba(200,16,46,0.2)');
  const [zStroke, setZStroke] = useState('#C8102E');
  const [zType, setZType] = useState<ZoneRestrictionType>('acceso_restringido');

  const [drawingPoints, setDrawingPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const [hasSchedule, setHasSchedule] = useState(false);
  const [scheduleStart, setScheduleStart] = useState<Date>(() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; });
  const [scheduleEnd, setScheduleEnd] = useState<Date>(() => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const scheduleLabel = hasSchedule
    ? `${scheduleStart.getHours().toString().padStart(2, '0')}:${scheduleStart.getMinutes().toString().padStart(2, '0')} - ${scheduleEnd.getHours().toString().padStart(2, '0')}:${scheduleEnd.getMinutes().toString().padStart(2, '0')}`
    : '';

  const resetForm = useCallback(() => {
    setShowForm(false); setEditTarget(null);
    setZName(''); setZDesc('');
    setZFill('rgba(200,16,46,0.2)'); setZStroke('#C8102E');
    setZType('acceso_restringido');
    setDrawingPoints([]); setIsDrawing(false);
    setHasSchedule(false);
    setScheduleStart(() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; });
    setScheduleEnd(() => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; });
    setShowStartPicker(false); setShowEndPicker(false);
  }, []);

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      if (!isDrawing) return;
      const { latitude, longitude } = e.nativeEvent.coordinate;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;
      setDrawingPoints((prev) => [...prev, { latitude, longitude }]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [isDrawing],
  );

  const undoLastPoint = useCallback(() => {
    setDrawingPoints((prev) => prev.slice(0, -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!zName.trim()) return;
    if (drawingPoints.length < 3) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Se necesitan al menos 3 puntos para un polígono' });
      return;
    }

    const input = {
      name: zName.trim(),
      description: zDesc || undefined,
      coordinates: drawingPoints,
      fillColor: zFill,
      strokeColor: zStroke,
      isActive: true,
      restrictionType: zType,
      activeSchedule: hasSchedule ? scheduleLabel : null,
    };

    if (editTarget) {
      updateZone.mutate({ id: editTarget.id, input }, { onSuccess: resetForm });
    } else {
      createZone.mutate(input, { onSuccess: resetForm });
    }
  }, [zName, zDesc, drawingPoints, zFill, zStroke, zType, hasSchedule, scheduleLabel, editTarget, createZone, updateZone, resetForm]);

  const startEdit = useCallback((z: RestrictedZone) => {
    setEditTarget(z); setShowForm(true);
    setZName(z.name); setZDesc(z.description ?? '');
    setDrawingPoints(z.coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude })));
    setZFill(z.fillColor); setZStroke(z.strokeColor);
    setZType(z.restrictionType);
    setIsDrawing(false);

    if (z.activeSchedule) {
      setHasSchedule(true);
      const parts = z.activeSchedule.split('-').map((s) => s.trim());
      const startParts = parts[0]?.split(':').map(Number) ?? [8, 0];
      const endParts = parts[1]?.split(':').map(Number) ?? [17, 0];
      const st = new Date(); st.setHours(startParts[0] ?? 8, startParts[1] ?? 0, 0, 0); setScheduleStart(st);
      const en = new Date(); en.setHours(endParts[0] ?? 17, endParts[1] ?? 0, 0, 0); setScheduleEnd(en);
    } else {
      setHasSchedule(false);
    }
  }, []);

  const formatTime = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const canSave = zName.trim().length > 0 && drawingPoints.length >= 3;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Zonas Restringidas ({zones.length})</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
          <Text style={s.addBtnText}>+ Zona</Text>
        </TouchableOpacity>
      </View>

      {zLoading && <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 20 }} />}

      <FlashList
        data={zones}
        keyExtractor={(z) => z.id}
        renderItem={({ item: zone }) => (
          <View style={[s.card, !zone.isActive && { opacity: 0.5 }]}>
            <View style={s.cardHeader}>
              <View style={[s.colorDot, { backgroundColor: zone.fillColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{zone.name}</Text>
                {zone.description ? <Text style={s.cardDesc}>{zone.description}</Text> : null}
                <View style={s.cardMetaRow}>
                  <Text style={s.cardMeta}>{zone.coordinates.length} puntos</Text>
                  <View style={[s.typeBadge, { backgroundColor: RESTRICTION_TYPE_OPTIONS.find((o) => o.value === zone.restrictionType)?.color + '18' }]}>
                    <Text style={[s.typeBadgeText, { color: RESTRICTION_TYPE_OPTIONS.find((o) => o.value === zone.restrictionType)?.color }]}>
                      {RESTRICTION_TYPE_OPTIONS.find((o) => o.value === zone.restrictionType)?.label ?? zone.restrictionType}
                    </Text>
                  </View>
                  {zone.activeSchedule && <Text style={s.cardMeta}>{zone.activeSchedule}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={() => startEdit(zone)}><Edit2 size={18} color={T.textSecondary} /></TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Eliminar zona', `¿Eliminar "${zone.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => deleteZone.mutate(zone.id) }])}>
                <Trash2 size={18} color={T.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!zLoading ? <Text style={s.empty}>No hay zonas configuradas</Text> : null}
        ListFooterComponent={showForm ? (
          <View style={s.formCard}>
          <Text style={s.formTitle}>{editTarget ? 'Editar zona' : 'Nueva zona'}</Text>

          <View style={s.field}>
            <Text style={s.label}>Nombre</Text>
            <TextInput style={s.input} placeholder="Nombre de la zona" placeholderTextColor={T.inputPlaceholder} value={zName} onChangeText={setZName} autoFocus />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Descripción</Text>
            <TextInput style={s.input} placeholder="Descripción (opcional)" placeholderTextColor={T.inputPlaceholder} value={zDesc} onChangeText={setZDesc} />
          </View>

          <View style={s.field}>
            <View style={s.mapHeaderRow}>
              <Text style={s.label}>Polígono ({drawingPoints.length} puntos)</Text>
              <View style={s.mapActionsRow}>
                {isDrawing && drawingPoints.length > 0 && (
                  <Pressable style={s.undoBtn} onPress={undoLastPoint}>
                    <Undo2 size={14} strokeWidth={2} color={T.primary} />
                    <Text style={s.undoBtnText}>Deshacer</Text>
                  </Pressable>
                )}
                {!isDrawing && (
                  <Pressable style={s.pickBtn} onPress={() => { setIsDrawing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Text style={s.pickBtnText}>{drawingPoints.length > 0 ? 'Continuar dibujo' : 'Iniciar dibujo'}</Text>
                  </Pressable>
                )}
                {isDrawing && (
                  <Pressable style={s.finishDrawBtn} onPress={() => { setIsDrawing(false); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}>
                    <Check size={14} strokeWidth={3} color="#FFFFFF" />
                    <Text style={s.finishDrawBtnText}>Finalizar</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {isDrawing && (
              <Text style={s.drawingHint}>Toca el mapa para agregar puntos al polígono ({drawingPoints.length} pts, mín. 3)</Text>
            )}

            <MapView
              ref={mapRef}
              style={s.miniMap}
              provider={MAP_PROVIDER}
              initialRegion={drawingPoints.length > 0 ? { latitude: drawingPoints[0]!.latitude, longitude: drawingPoints[0]!.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 } : EPN_CENTER}
              onPress={handleMapPress}
              scrollEnabled={!isDrawing}
              zoomEnabled={true}
              toolbarEnabled={false}
            >
              {drawingPoints.map((pt, i) => (
                <Marker
                  key={`pt-${i}`}
                  coordinate={pt}
                  pinColor={i === 0 ? '#10B981' : '#F59E0B'}
                  title={`Punto ${i + 1}`}
                  zIndex={100}
                />
              ))}

              {drawingPoints.length >= 3 && (
                <Polygon
                  coordinates={drawingPoints}
                  fillColor={zFill}
                  strokeColor={zStroke}
                  strokeWidth={2}
                />
              )}

              {drawingPoints.length >= 2 && !isDrawing && (
                <>
                  <Polygon
                    coordinates={drawingPoints}
                    fillColor={zFill}
                    strokeColor={zStroke}
                    strokeWidth={2}
                  />
                </>
              )}
            </MapView>
          </View>

          <ColorPicker selected={zFill} onSelect={setZFill} />
          <ColorPicker selected={zStroke} onSelect={setZStroke} />

          <Text style={s.sectionLabel}>Tipo de restricción</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeChips}>
            {RESTRICTION_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.typeChip, zType === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}
                onPress={() => { setZType(opt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[s.typeChipText, zType === opt.value && { color: '#FFFFFF' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.field}>
            <View style={s.switchRow}>
              <Text style={s.label}>Horario activo</Text>
              <Switch
                value={hasSchedule}
                onValueChange={(v) => { setHasSchedule(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                trackColor={{ false: T.surfaceBorder, true: T.primaryMuted }}
                thumbColor={hasSchedule ? T.primary : T.textMuted}
              />
            </View>

            {hasSchedule && (
              <View style={s.scheduleRow}>
                <Pressable style={s.timeBtn} onPress={() => setShowStartPicker(true)}>
                  <Text style={s.timeBtnLabel}>Inicio</Text>
                  <Text style={s.timeBtnValue}>{formatTime(scheduleStart)}</Text>
                </Pressable>
                <Text style={s.timeSep}>a</Text>
                <Pressable style={s.timeBtn} onPress={() => setShowEndPicker(true)}>
                  <Text style={s.timeBtnLabel}>Fin</Text>
                  <Text style={s.timeBtnValue}>{formatTime(scheduleEnd)}</Text>
                </Pressable>
              </View>
            )}

            {showStartPicker && (
              <DateTimePicker
                value={scheduleStart}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => { setShowStartPicker(false); if (d) setScheduleStart(d); }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={scheduleEnd}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => { setShowEndPicker(false); if (d) setScheduleEnd(d); }}
              />
            )}
          </View>

          <View style={s.formActions}>
            <TouchableOpacity style={[s.saveBtn, !canSave && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!canSave || createZone.isPending || updateZone.isPending}>
              {createZone.isPending || updateZone.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.saveBtnText}>{editTarget ? 'Actualizar' : 'Crear'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={resetForm}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
        ) : null}
        keyboardShouldPersistTaps="handled"
      />

      <View style={{ height: 60 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: T.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...Typography.h3, color: T.textPrimary },
  addBtn: {
    backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    paddingHorizontal: 16, paddingVertical: 10,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  addBtnText: { ...Typography.caption, fontWeight: '700', color: '#FFFFFF' },
  card: {
    backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg,
    padding: 16, marginBottom: 10, ...Shadows.md, borderWidth: 1, borderColor: T.cardBorder,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#FFFFFF', ...Shadows.xs,
  },
  cardName: { ...Typography.body, color: T.textPrimary, fontWeight: '700' },
  cardDesc: { ...Typography.caption, color: T.textSecondary, marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  cardMeta: { ...Typography.caption, color: T.textTertiary },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  empty: { textAlign: 'center', color: T.textSecondary, marginTop: 20, ...Typography.body },
  formCard: {
    backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg,
    padding: 16, gap: 12, borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.md,
  },
  formTitle: { ...Typography.h4, color: T.textPrimary, marginBottom: 2 },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 12,
    fontSize: 14, color: T.inputText,
  },
  sectionLabel: { ...Typography.overline, color: T.textSecondary, marginTop: 2 },
  typeChips: { gap: 6 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Sizes.radiusFull,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.cardBorder,
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  saveBtn: {
    flex: 1, backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    padding: 14, alignItems: 'center', ...Shadows.sm,
  },
  saveBtnText: { ...Typography.button, color: '#FFFFFF', fontSize: 14 },
  cancelBtn: {
    flex: 1, backgroundColor: T.surface, borderRadius: Sizes.radiusSm,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.cardBorder,
  },
  cancelBtnText: { ...Typography.body, color: T.textSecondary, fontWeight: '600' },

  mapHeaderRow: { gap: 8 },
  mapActionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: T.primary + '40', backgroundColor: T.primaryMuted, alignSelf: 'flex-start' },
  pickBtnText: { fontSize: 11, fontWeight: '700', color: T.primary },
  finishDrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.success, alignSelf: 'flex-start' },
  finishDrawBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: T.cardBorder, backgroundColor: T.surface, alignSelf: 'flex-start' },
  undoBtnText: { fontSize: 11, fontWeight: '600', color: T.primary },
  drawingHint: { fontSize: 11, color: T.warning, fontWeight: '600' },
  miniMap: {
    width: '100%', height: 220,
    borderRadius: Sizes.radiusMd,
    borderWidth: 1, borderColor: T.cardBorder,
    overflow: 'hidden',
  },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeBtn: {
    flex: 1, backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 12, alignItems: 'center', gap: 2,
  },
  timeBtnLabel: { fontSize: 10, fontWeight: '600', color: T.textTertiary, textTransform: 'uppercase' },
  timeBtnValue: { fontSize: 18, fontWeight: '800', color: T.primary, fontVariant: ['tabular-nums'] },
  timeSep: { fontSize: 14, color: T.textTertiary, fontWeight: '600' },
});
