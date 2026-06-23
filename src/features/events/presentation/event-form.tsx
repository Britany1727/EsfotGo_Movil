import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  View, Text, TextInput as RNTextInput, Pressable,
  StyleSheet, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import Toast from 'react-native-toast-message';
import { X } from 'lucide-react-native';
import { eventFormSchema, EVENT_CATEGORY_OPTIONS } from '../domain/event.schema';
import type { EventFormInput, EventFormCategory } from '../domain/event.schema';
import type { Event, EventCategory } from '../domain/event.entity';
import { useCreateEvent, useUpdateEvent } from '../application/event.hooks';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';

interface EventFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  editEvent?: Event;
}

function formatDateForDisplay(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateForValue(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeForValue(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function parseDateValue(dateStr: string): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseTimeValue(timeStr: string, baseDate: string): Date {
  const d = baseDate ? new Date(baseDate + 'T00:00:00') : new Date();
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    if (!isNaN(h)) d.setHours(h);
    if (!isNaN(m)) d.setMinutes(m);
  }
  return d;
}

type PickerMode = 'date' | 'time';

interface PickerState {
  visible: boolean;
  mode: PickerMode;
  field: 'startDate' | 'startTime' | 'endDate' | 'endTime';
}

export function EventForm({ onClose, onSuccess, editEvent }: EventFormProps) {
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const isEdit = !!editEvent;

  const { control, handleSubmit, formState: { errors, isDirty }, setValue, watch } = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: editEvent?.title ?? '',
      description: editEvent?.description ?? '',
      location: editEvent?.location ?? '',
      category: ((editEvent?.category as string) as EventFormCategory | undefined) ?? 'academico',
      imageUrl: editEvent?.imageUrl ?? '',
      startDate: formatDateForValue(editEvent?.startDate ?? null),
      startTime: formatTimeForValue(editEvent?.startDate ?? null),
      endDate: formatDateForValue(editEvent?.endDate ?? null),
      endTime: formatTimeForValue(editEvent?.endDate ?? null),
      organizer: editEvent?.organizer ?? '',
    },
  });

  const [selectedCategory, setSelectedCategory] = useState<EventFormCategory>(
    (editEvent?.category as EventFormCategory) ?? 'academico'
  );

  const [picker, setPicker] = useState<PickerState>({ visible: false, mode: 'date', field: 'startDate' });
  const [pickedImage, setPickedImage] = useState<string | null>(editEvent?.imageUrl ?? null);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');
  const watchedStartTime = watch('startTime');
  const watchedEndTime = watch('endTime');

  const handlePickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Permiso denegado', text2: 'Se necesita acceso a la galería para seleccionar una imagen.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPickedImage(uri);
      try {
        const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
        const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const MIME_MAP: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
          gif: 'image/gif', webp: 'image/webp',
        };
        const mime = MIME_MAP[ext] ?? 'image/jpeg';
        setImageBase64(`data:${mime};base64,${base64}`);
      } catch (e) {
        console.warn('[EventForm] Error reading image for base64:', e);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo procesar la imagen' });
        return;
      }
      setValue('imageUrl', '', { shouldDirty: true });
    }
  }, [setValue]);

  const openPicker = useCallback((field: PickerState['field'], mode: PickerMode) => {
    setPicker({ visible: true, mode, field });
  }, []);

  const onPickerChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPicker((prev) => ({ ...prev, visible: false }));
    }

    if (!selectedDate) return;

    const { field, mode } = picker;

    if (mode === 'date') {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      setValue(field, dateStr, { shouldValidate: true, shouldDirty: true });

      // Android: after selecting date, open time picker for the time counterpart
      if (Platform.OS === 'android') {
        if (field === 'startDate') {
          setPicker({ visible: true, mode: 'time', field: 'startTime' });
        } else if (field === 'endDate') {
          setPicker({ visible: true, mode: 'time', field: 'endTime' });
        }
      }
    } else if (mode === 'time') {
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const min = String(selectedDate.getMinutes()).padStart(2, '0');
      setValue(field, `${h}:${min}`, { shouldValidate: true, shouldDirty: true });
    }
  }, [picker, setValue]);

  const onSubmit = useCallback(async (data: EventFormInput) => {
    try {
      const safeStartTime = data.startTime || '00:00';
      const safeEndTime = data.endTime || '00:00';
      const basePayload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        location: data.location,
        category: data.category as EventCategory,
        imageUrl: data.imageUrl || null,
        startDate: new Date(`${data.startDate}T${safeStartTime}:00`).toISOString(),
        endDate: data.endDate && data.endTime
          ? new Date(`${data.endDate}T${safeEndTime}:00`).toISOString()
          : null,
        organizer: data.organizer || null,
      };
      if (data.imageUrl && data.imageUrl.startsWith('http')) {
        basePayload.imageUrl = data.imageUrl;
      } else if (imageBase64) {
        basePayload.imageBase64 = imageBase64;
        basePayload.imageUrl = null;
      }

      if (isEdit && editEvent) {
        await updateMutation.mutateAsync({ id: editEvent.id, input: basePayload as any });
      } else {
        await createMutation.mutateAsync(basePayload as any);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.log('[EventForm] onSubmit error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error instanceof Error ? error.message : 'Ocurrió un error inesperado' });
    }
  }, [isEdit, editEvent, imageBase64, createMutation, updateMutation, onSuccess, onClose]);

  const handleCategorySelect = useCallback((cat: EventFormCategory) => {
    setSelectedCategory(cat);
    setValue('category', cat, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.root}>
        {createMutation.isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {(createMutation.error as Error)?.message ?? 'Error al crear el evento'}
            </Text>
          </View>
        )}
        {updateMutation.isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {(updateMutation.error as Error)?.message ?? 'Error al actualizar el evento'}
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Título *</Text>
          <Controller control={control} name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput style={[styles.input, errors.title && styles.inputErr]}
                placeholder="Ej: Feria de Tecnología 2026" placeholderTextColor={T.inputPlaceholder}
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.title && <Text style={styles.fieldErr}>{errors.title.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descripción *</Text>
          <Controller control={control} name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput style={[styles.input, styles.textArea, errors.description && styles.inputErr]}
                placeholder="Describe el evento..." placeholderTextColor={T.inputPlaceholder}
                multiline numberOfLines={4} textAlignVertical="top"
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.description && <Text style={styles.fieldErr}>{errors.description.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ubicación *</Text>
          <Controller control={control} name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput style={[styles.input, errors.location && styles.inputErr]}
                placeholder="Ej: Auditorio Principal" placeholderTextColor={T.inputPlaceholder}
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.location && <Text style={styles.fieldErr}>{errors.location.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Categoría</Text>
          <View style={styles.categoryRow}>
            {EVENT_CATEGORY_OPTIONS.map((opt) => (
              <Pressable key={opt.value}
                style={[styles.categoryChip, selectedCategory === opt.value && styles.categoryChipOn]}
                onPress={() => handleCategorySelect(opt.value)}>
                <Text style={[styles.categoryChipText, selectedCategory === opt.value && styles.categoryChipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.category && <Text style={styles.fieldErr}>{errors.category.message}</Text>}
        </View>

        <Text style={styles.label}>Fecha y hora *</Text>
        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Inicio</Text>
            <Pressable
              style={[styles.input, errors.startDate && styles.inputErr]}
              onPress={() => openPicker('startDate', 'date')}
            >
              <Text style={watchedStartDate ? styles.inputText : styles.placeholder}>
                {watchedStartDate ? formatDateForDisplay(watchedStartDate + 'T00:00:00') : 'Seleccionar fecha'}
              </Text>
            </Pressable>
            {errors.startDate && <Text style={styles.fieldErr}>{errors.startDate.message}</Text>}
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Hora</Text>
            <Pressable
              style={[styles.input, errors.startTime && styles.inputErr]}
              onPress={() => openPicker('startTime', 'time')}
            >
              <Text style={watchedStartTime ? styles.inputText : styles.placeholder}>
                {watchedStartTime || 'Seleccionar hora'}
              </Text>
            </Pressable>
            {errors.startTime && <Text style={styles.fieldErr}>{errors.startTime.message}</Text>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Fin (opcional)</Text>
            <Pressable
              style={[styles.input, errors.endDate && styles.inputErr]}
              onPress={() => openPicker('endDate', 'date')}
            >
              <Text style={watchedEndDate ? styles.inputText : styles.placeholder}>
                {watchedEndDate ? formatDateForDisplay(watchedEndDate + 'T00:00:00') : 'Seleccionar fecha'}
              </Text>
            </Pressable>
            {errors.endDate && <Text style={styles.fieldErr}>{errors.endDate.message}</Text>}
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>Hora</Text>
            <Pressable
              style={[styles.input, errors.endTime && styles.inputErr]}
              onPress={() => openPicker('endTime', 'time')}
            >
              <Text style={watchedEndTime ? styles.inputText : styles.placeholder}>
                {watchedEndTime || 'Seleccionar hora'}
              </Text>
            </Pressable>
            {errors.endTime && <Text style={styles.fieldErr}>{errors.endTime.message}</Text>}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Imagen</Text>
          {pickedImage ? (
            <View style={styles.imagePreviewWrap}>
              <ExpoImage source={{ uri: pickedImage }} style={styles.imagePreview} contentFit="cover" />
              <Pressable
                style={styles.imageRemoveBtn}
                onPress={() => {
                  setPickedImage(null);
                  setImageBase64(undefined);
                  setValue('imageUrl', '', { shouldDirty: true });
                }}
              >
                <X size={14} strokeWidth={2.5} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}
          <Pressable style={styles.imagePickerBtn} onPress={handlePickImage}>
            <Text style={styles.imagePickerBtnText}>
              {pickedImage ? 'Cambiar imagen' : 'Seleccionar de galería'}
            </Text>
          </Pressable>
          <Controller control={control} name="imageUrl"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput style={[styles.input, errors.imageUrl && styles.inputErr]}
                placeholder="O pega una URL (https://...)" placeholderTextColor={T.inputPlaceholder}
                keyboardType="url" autoCapitalize="none"
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.imageUrl && <Text style={styles.fieldErr}>{errors.imageUrl.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Organizador</Text>
          <Controller control={control} name="organizer"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNTextInput style={[styles.input, errors.organizer && styles.inputErr]}
                placeholder="Ej: Departamento de Sistemas" placeholderTextColor={T.inputPlaceholder}
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.organizer && <Text style={styles.fieldErr}>{errors.organizer.message}</Text>}
        </View>

        <Pressable style={[styles.btn, (!isDirty || isLoading) && styles.btnOff]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleSubmit(onSubmit)();
          }}
          disabled={!isDirty || isLoading}>
          {isLoading ? <ActivityIndicator color="#FFFFFF" /> :
            <Text style={styles.btnT}>{isEdit ? 'Guardar cambios' : 'Crear evento'}</Text>}
        </Pressable>
      </View>

      {picker.visible && (
        <DateTimePicker
          value={
            picker.mode === 'date'
              ? parseDateValue(picker.field === 'startDate' ? (watchedStartDate ?? new Date().toISOString()) : (watchedEndDate ?? new Date().toISOString()))
              : parseTimeValue(
                  picker.field === 'startTime' ? (watchedStartTime ?? '00:00') : (watchedEndTime ?? '00:00'),
                  picker.field === 'startTime' ? (watchedStartDate ?? new Date().toISOString()) : (watchedEndDate ?? new Date().toISOString())
                )
          }
          mode={picker.mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
          onTouchCancel={() => setPicker((prev) => ({ ...prev, visible: false }))}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  root: { gap: 20, padding: Sizes.paddingMd },
  errorBanner: { backgroundColor: T.errorBg, borderRadius: Sizes.radiusSm, padding: 12, borderLeftWidth: 3, borderLeftColor: T.error },
  errorText: { color: T.error, fontSize: 13 },
  field: { gap: 5 },
  label: { ...Typography.label, color: T.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder, borderRadius: Sizes.radiusMd, padding: 14, fontSize: 15, color: T.inputText, justifyContent: 'center' },
  inputText: { color: T.inputText, fontSize: 15 },
  placeholder: { color: T.inputPlaceholder, fontSize: 15 },
  textArea: { minHeight: 100 },
  inputErr: { borderColor: T.error },
  fieldErr: { color: T.error, fontSize: 12 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    backgroundColor: T.surface, borderRadius: Sizes.radiusFull,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  categoryChipOn: {
    backgroundColor: T.primaryMuted, borderColor: T.primary,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.15,
  },
  categoryChipText: { ...Typography.bodySm, fontWeight: '600', color: T.textSecondary },
  categoryChipTextOn: { color: T.primary },
  btn: {
    backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    padding: 16, alignItems: 'center', marginTop: 8,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  btnOff: { opacity: 0.5 },
  btnT: { ...Typography.button, color: '#FFFFFF' },
  imagePreviewWrap: {
    position: 'relative', marginBottom: 8,
    borderRadius: Sizes.radiusMd, overflow: 'hidden',
  },
  imagePreview: {
    width: '100%', height: 180, borderRadius: Sizes.radiusMd,
    backgroundColor: T.surfaceBorder,
  },
  imageRemoveBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  imagePickerBtn: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.primary + '40',
    borderRadius: Sizes.radiusSm, padding: 12, alignItems: 'center',
    backgroundColor: T.primaryMuted,
  },
  imagePickerBtnText: {
    ...Typography.bodySm, fontWeight: '600', color: T.primary,
  },
});
