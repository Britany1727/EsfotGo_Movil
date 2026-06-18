import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  Pressable, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import type { PoiInput, PoiUpdateInput } from '@/features/admin/domain/poi.entity';
import { getAllCategories } from '@/features/map/application/map.hooks';
import * as Haptics from 'expo-haptics';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { Image as ImageIcon, X } from 'lucide-react-native';

interface PoiFormProps {
  initialCoordinate?: { latitude: number; longitude: number };
  editingPoi?: CampusLocation | null;
  isLoading: boolean;
  onSubmit: (input: PoiInput) => void;
  onUpdate: (id: string, input: PoiUpdateInput) => void;
  onCancel: () => void;
}

export function PoiForm({
  initialCoordinate,
  editingPoi,
  isLoading,
  onSubmit,
  onUpdate,
  onCancel,
}: PoiFormProps) {
  const [name, setName] = useState(editingPoi?.name ?? '');
  const [description, setDescription] = useState(editingPoi?.description ?? '');
  const [category, setCategory] = useState(editingPoi?.category ?? 'academico');
  const [imageUri, setImageUri] = useState<string | null>(editingPoi?.imageUrl ?? null);
  const categories = getAllCategories();

  const isEditing = !!editingPoi;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // silently fail — image is optional
    }
  };

  const removeImage = () => {
    setImageUri(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const lat: number = editingPoi?.latitude ?? initialCoordinate?.latitude ?? 0;
    const lng: number = editingPoi?.longitude ?? initialCoordinate?.longitude ?? 0;

    if (lat === 0 && lng === 0) {
      console.log('[PoiForm] Coordenadas invalidas (0,0) — no se puede crear la ubicacion');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.log(`[PoiForm] Coordenadas fuera de rango: (${lat}, ${lng})`);
      return;
    }

    if (isEditing && editingPoi) {
      onUpdate(editingPoi.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        latitude: lat || editingPoi.latitude,
        longitude: lng || editingPoi.longitude,
        imageUrl: imageUri ?? null,
        mediaType: imageUri ? 'static' : null,
      });
    } else {
      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        latitude: lat,
        longitude: lng,
        imageUrl: imageUri ?? undefined,
        mediaType: imageUri ? 'static' : undefined,
      });
    }
  };

  useEffect(() => {
    if (editingPoi) {
      setName(editingPoi.name);
      setDescription(editingPoi.description ?? '');
      setCategory(editingPoi.category);
      setImageUri(editingPoi.imageUrl ?? null);
    }
  }, [editingPoi]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isEditing ? 'Editar ubicación' : 'Nueva ubicación'}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Laboratorio de Física"
          placeholderTextColor={T.inputPlaceholder}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción del lugar"
          placeholderTextColor={T.inputPlaceholder}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.chip,
                category === cat.key && { backgroundColor: cat.color, borderColor: cat.color },
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <View style={[styles.chipLetterWrap, category === cat.key && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.chipLetter, { color: category === cat.key ? '#FFFFFF' : cat.color }]}>
                  {cat.label.charAt(0)}
                </Text>
              </View>
              <Text style={[styles.chipText, category === cat.key && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Imagen (Opcional)</Text>

        {imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.previewActions}>
              <Pressable style={styles.changeImageBtn} onPress={pickImage}>
                <ImageIcon size={14} strokeWidth={2} color={T.primary} />
                <Text style={styles.changeImageText}>Cambiar imagen</Text>
              </Pressable>
              <Pressable style={styles.removeImageBtn} onPress={removeImage}>
                <X size={14} strokeWidth={2} color={T.error} />
                <Text style={styles.removeImageText}>Quitar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.pickBtn} onPress={pickImage}>
            <ImageIcon size={18} strokeWidth={1.8} color={T.textSecondary} />
            <Text style={styles.pickBtnText}>Seleccionar imagen</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.cancelBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCancel();
          }}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleSubmit();
          }}
          disabled={isLoading || !name.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveText}>{isEditing ? 'Actualizar' : 'Guardar'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { ...Typography.h4, color: T.textPrimary },
  field: { gap: 6 },
  label: { ...Typography.overline, color: T.textSecondary },
  input: {
    backgroundColor: T.inputBg, borderRadius: Sizes.radiusSm,
    padding: 13, fontSize: 14, color: T.inputText,
    borderWidth: 1.5, borderColor: T.inputBorder,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  chips: { gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.surface, borderRadius: Sizes.radiusFull,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  chipLetterWrap: {
    width: 22, height: 22, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center',
  },
  chipLetter: { fontSize: 11, fontWeight: '800' },
  chipText: { ...Typography.caption, color: T.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.inputBg, borderRadius: Sizes.radiusSm,
    padding: 16, borderWidth: 1.5, borderColor: T.inputBorder,
    borderStyle: 'dashed',
  },
  pickBtnText: { ...Typography.body, color: T.textSecondary },
  previewContainer: {
    gap: 10,
  },
  preview: {
    width: '100%', height: 160,
    borderRadius: Sizes.radiusMd,
    backgroundColor: T.surface,
  },
  previewActions: {
    flexDirection: 'row', gap: 10,
  },
  changeImageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: T.primaryMuted, borderRadius: Sizes.radiusSm,
    padding: 10, borderWidth: 1, borderColor: T.primary + '25',
  },
  changeImageText: { fontSize: 12, fontWeight: '600', color: T.primary },
  removeImageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: T.errorBg, borderRadius: Sizes.radiusSm,
    padding: 10, borderWidth: 1, borderColor: T.error + '20',
  },
  removeImageText: { fontSize: 12, fontWeight: '600', color: T.error },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: Sizes.radiusSm,
    backgroundColor: T.surfaceBorder, alignItems: 'center',
    borderWidth: 1, borderColor: T.cardBorder,
  },
  cancelText: { ...Typography.body, fontWeight: '600', color: T.textSecondary },
  saveBtn: {
    flex: 1, padding: 14, borderRadius: Sizes.radiusSm,
    backgroundColor: T.primary, alignItems: 'center',
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.25,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { ...Typography.button, color: '#FFFFFF', fontSize: 14 },
});
