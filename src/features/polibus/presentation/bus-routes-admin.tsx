import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAdminBusRoutes } from '@/features/polibus/application/bus.hooks';
import type { BusRoute, BusStop } from '@/features/polibus/domain/route.entity';
import { DarkTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { Edit2, Trash2, Bus } from 'lucide-react-native';
import { AppCard } from '@/components/ui/app-card';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';

export function BusRoutesAdmin() {
  const { routes, isLoading, createRoute, updateRoute, deleteRoute, createStop, updateStop, deleteStop } = useAdminBusRoutes();
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [showForm, setShowForm] = useState<'route' | 'stop' | null>(null);
  const [editRoute, setEditRoute] = useState<BusRoute | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#1B6BB0');
  const [stopName, setStopName] = useState('');
  const [stopLat, setStopLat] = useState('');
  const [stopLng, setStopLng] = useState('');
  const [stopOrder, setStopOrder] = useState('');

  const handleCreateRoute = useCallback(async () => {
    if (!name.trim()) return;
    await createRoute.mutateAsync({ name: name.trim(), description: desc || null, color, isActive: true });
    setName(''); setDesc(''); setColor('#1B6BB0'); setShowForm(null);
  }, [name, desc, color, createRoute]);

  const handleUpdateRoute = useCallback(async () => {
    if (!editRoute || !name.trim()) return;
    await updateRoute.mutateAsync({ id: editRoute.id, input: { name: name.trim(), description: desc || null, color } });
    setEditRoute(null); setName(''); setDesc('');
  }, [editRoute, name, desc, color, updateRoute]);

  const handleDeleteRoute = useCallback((route: BusRoute) => {
    Alert.alert('Eliminar ruta', `¿Eliminar "${route.name}" y todas sus paradas?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteRoute.mutate(route.id) },
    ]);
  }, [deleteRoute]);

  const handleCreateStop = useCallback(async () => {
    if (!selectedRoute || !stopName.trim()) return;
    await createStop.mutateAsync({
      routeId: selectedRoute.id, name: stopName.trim(),
      latitude: parseFloat(stopLat) || 0, longitude: parseFloat(stopLng) || 0,
      stopOrder: parseInt(stopOrder, 10) || 0,
    });
    setStopName(''); setStopLat(''); setStopLng(''); setStopOrder(''); setShowForm(null);
  }, [selectedRoute, stopName, stopLat, stopLng, stopOrder, createStop]);

  const startEditRoute = useCallback((route: BusRoute) => {
    setEditRoute(route);
    setName(route.name);
    setDesc(route.description ?? '');
    setColor(route.color);
  }, []);

  if (isLoading) return <ActivityIndicator size="large" color={T.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Gestión de Rutas</Text>
        <AppButton size="sm" label="+ Ruta" onPress={() => { setShowForm('route'); setName(''); setDesc(''); setColor('#1B6BB0'); }} />
      </View>

      {routes.map((route) => (
        <AppCard key={route.id} style={[!route.isActive && { opacity: 0.5 }, { gap: 10, marginBottom: 8 }]}>
          <View style={s.cardHeader}>
            <View style={[s.colorDot, { backgroundColor: route.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.routeName}>{route.name}</Text>
              {route.description && <Text style={s.routeDesc}>{route.description}</Text>}
            </View>
            <View style={s.routeActions}>
              <AppButton label="" variant="ghost" size="sm" icon={<Edit2 size={16} color={T.textSecondary} />} onPress={() => startEditRoute(route)} />
              <AppButton label="" variant="ghost" size="sm" icon={<Trash2 size={16} color={T.error} />} onPress={() => handleDeleteRoute(route)} />
            </View>
          </View>
          <View style={s.stopSection}>
            <AppButton variant="outline" size="sm" label="+ Parada" onPress={() => { setSelectedRoute(route); setShowForm('stop'); setStopName(''); setStopLat(''); setStopLng(''); setStopOrder(''); }} style={{ alignSelf: 'flex-start' }} />
          </View>
        </AppCard>
      ))}

      {routes.length === 0 && <EmptyState icon={Bus} title="No hay rutas" description="No se han configurado rutas de Polibus." />}

      {showForm === 'route' && (
        <AppCard style={{ gap: 10 }}>
          <Text style={s.formTitle}>{editRoute ? 'Editar ruta' : 'Nueva ruta'}</Text>
          <TextInput style={s.input} placeholder="Nombre" placeholderTextColor={T.inputPlaceholder} value={name} onChangeText={setName} />
          <TextInput style={s.input} placeholder="Descripción" placeholderTextColor={T.inputPlaceholder} value={desc} onChangeText={setDesc} />
          <TextInput style={s.input} placeholder="Color (#HEX)" placeholderTextColor={T.inputPlaceholder} value={color} onChangeText={setColor} />
          <View style={s.formActions}>
            <AppButton style={{ flex: 1 }} label={editRoute ? 'Guardar' : 'Crear'} onPress={editRoute ? handleUpdateRoute : handleCreateRoute} />
            <AppButton style={{ flex: 1 }} variant="outline" label="Cancelar" onPress={() => { setShowForm(null); setEditRoute(null); }} />
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
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...Typography.h3, color: T.textPrimary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  routeName: { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  routeDesc: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  routeActions: { flexDirection: 'row', gap: 4 },
  stopSection: { borderTopWidth: 1, borderTopColor: T.cardBorder, paddingTop: 8 },
  formTitle: { ...Typography.h4, color: T.textPrimary, marginBottom: 4 },
  input: { backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder, borderRadius: Sizes.radiusMd, padding: 12, fontSize: 14, color: T.inputText },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
