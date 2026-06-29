import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  View, Text, TextInput as RNInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Platform, Modal, FlatList,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { z } from 'zod';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { X, Calendar, User } from 'lucide-react-native';
import type { Tutoria, Horario, TutoriaStatus } from '../domain/tutoria.entity';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { useAuthStore } from '@/store/auth.store';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const tutoriaSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500).optional().or(z.literal('')),
  date: z.string().min(1, 'Fecha requerida'),
  duration: z.string().min(1, 'Duración requerida'),
  maxStudents: z.string().min(1, 'Cupo requerido'),
  location: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['programada', 'pendiente', 'finalizada', 'cancelada']),
});

type TutoriaFormInput = z.infer<typeof tutoriaSchema>;

type TutoriaSubmitInput = Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>;

interface TutoriaFormProps {
  editData?: Tutoria;
  onSubmit: (data: TutoriaSubmitInput) => Promise<void>;
  isLoading: boolean;
}

function emptyHorario(): Horario {
  return { dia: '', horaInicio: '', horaFin: '' };
}

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return isoStr;
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${d} ${months[m - 1] ?? ''} ${y}`;
}

function parseDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISOToDate(isoStr: string): Date {
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function timeStrToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function dateToTimeStr(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TutoriaForm({ editData, onSubmit, isLoading }: TutoriaFormProps) {
  const userName = useAuthStore((s) => s.user?.fullName);
  const docenteName = userName || '';
  const [timePickerTarget, setTimePickerTarget] = useState<{ index: number; field: 'horaInicio' | 'horaFin' } | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>(
    editData?.horarios && editData.horarios.length > 0
      ? editData.horarios.map((h) => ({ ...h }))
      : [emptyHorario()]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationCustom, setLocationCustom] = useState(false);
  const LOCATIONS = [
    'Laboratorio de Cómputo 1', 'Laboratorio de Cómputo 2', 'Aula Magna',
    'Sala de Estudio Grupal', 'Laboratorio de Redes', 'Laboratorio de IoT',
    'Secretaría ESFOT', 'Coordinación Académica', 'Bienestar Estudiantil',
    'Departamento de TI', 'Vinculación con la Sociedad',
  ];

  const { control, handleSubmit, formState: { errors } } = useForm<TutoriaFormInput>({
    resolver: zodResolver(tutoriaSchema),
    defaultValues: {
      title: editData?.title ?? '',
      description: editData?.description ?? '',
      date: editData?.date ?? '',
      duration: String(editData?.duration ?? 60),
      location: editData?.location ?? '',
      maxStudents: String(editData?.maxStudents ?? 20),
      status: (editData?.status as TutoriaStatus) ?? 'programada',
    },
  });

  const agregarHorario = () => {
    setHorarios([...horarios, emptyHorario()]);
  };

  const eliminarHorario = (index: number) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const handleHorarioChange = (index: number, campo: keyof Horario, valor: string) => {
    const nuevos = [...horarios];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setHorarios(nuevos);
  };

  const doSubmit = async (data: TutoriaFormInput) => {
    const timeStr = horarios.length > 0 && horarios[0].horaInicio
      ? `${horarios[0].horaInicio} - ${horarios[0].horaFin || '?'}`
      : '';
    await onSubmit({
      title: data.title,
      subject: '',
      docente: editData?.docente,
      description: data.description || undefined,
      date: data.date,
      time: timeStr,
      duration: parseInt(data.duration, 10) || 60,
      location: data.location || undefined,
      maxStudents: parseInt(data.maxStudents, 10) || 20,
      horarios: horarios.filter((h) => h.dia && h.horaInicio && h.horaFin),
      status: data.status,
      createdBy: editData?.createdBy ?? '',
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.root}>
        <Field label="Título *" error={errors.title?.message}>
          <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
            <RNInput style={[s.input, errors.title && s.inputErr]} placeholder="Ej: Cálculo Diferencial" placeholderTextColor={T.inputPlaceholder} onBlur={onBlur} onChangeText={onChange} value={value} />
          )} />
        </Field>
        <Field label="Docente">
          <View style={s.docenteField}>
            <User size={16} color={T.textSecondary} />
            <Text style={s.docenteName}>{docenteName || 'Docente'}</Text>
          </View>
        </Field>
        <Field label="Descripción" error={errors.description?.message}>
          <Controller control={control} name="description" render={({ field: { onChange, onBlur, value } }) => (
            <RNInput style={[s.input, s.textArea, errors.description && s.inputErr]} placeholder="Describe la tutoría..." placeholderTextColor={T.inputPlaceholder} multiline numberOfLines={3} textAlignVertical="top" onBlur={onBlur} onChangeText={onChange} value={value} />
          )} />
        </Field>
        <View style={s.row}>
          <Field label="Fecha *" error={errors.date?.message} half>
            <Controller control={control} name="date" render={({ field: { onChange, value } }) => (
              <>
                <Pressable
                  style={[s.dateBtn, errors.date && s.dateBtnErr]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDatePicker(true);
                  }}
                >
                  <Calendar size={16} strokeWidth={2} color={value ? T.textPrimary : T.textTertiary} />
                  <Text style={[s.dateBtnText, !value && s.dateBtnPlaceholder]}>
                    {value ? formatDateDisplay(value) : 'Seleccionar fecha'}
                  </Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={value ? parseISOToDate(value) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(_evt: DateTimePickerEvent, selectedDate?: Date) => {
                      if (Platform.OS !== 'ios') setShowDatePicker(false);
                      if (selectedDate) {
                        onChange(parseDateToISO(selectedDate));
                        if (Platform.OS === 'ios') setShowDatePicker(false);
                      }
                    }}
                  />
                )}
              </>
            )} />
          </Field>
          <Field label="Duración (min) *" error={errors.duration?.message} half>
            <Controller control={control} name="duration" render={({ field: { onChange, onBlur, value } }) => (
              <RNInput style={[s.input, errors.duration && s.inputErr]} placeholder="60" placeholderTextColor={T.inputPlaceholder} keyboardType="numeric" onBlur={onBlur} onChangeText={onChange} value={String(value)} />
            )} />
          </Field>
        </View>
        <Field label="Cupo máx. *" error={errors.maxStudents?.message}>
          <Controller control={control} name="maxStudents" render={({ field: { onChange, onBlur, value } }) => (
            <RNInput style={[s.input, errors.maxStudents && s.inputErr]} placeholder="20" placeholderTextColor={T.inputPlaceholder} keyboardType="numeric" onBlur={onBlur} onChangeText={onChange} value={String(value)} />
          )} />
        </Field>
        <Field label="Ubicación" error={errors.location?.message}>
          <Controller control={control} name="location" render={({ field: { onChange, value } }) => (
            <>
              {!locationCustom ? (
                <Pressable
                  style={[s.input, s.locationBtn, errors.location && s.inputErr]}
                  onPress={() => { setLocationCustom(false); setShowLocationPicker(true); }}
                >
                  <Text style={[s.locationBtnText, !value && s.locationPlaceholder]}>
                    {value || 'Seleccionar ubicación'}
                  </Text>
                </Pressable>
              ) : (
                <RNInput
                  style={[s.input, errors.location && s.inputErr]}
                  placeholder="Ej: Aula 101" placeholderTextColor={T.inputPlaceholder}
                  value={value} onChangeText={onChange}
                  autoFocus
                />
              )}
              <Modal visible={showLocationPicker} transparent animationType="slide" onRequestClose={() => setShowLocationPicker(false)}>
                <Pressable style={s.modalOverlay} onPress={() => { setShowLocationPicker(false); setLocationCustom(false); }}>
                  <Pressable style={s.locationModal} onPress={() => {}}>
                    <Text style={s.locationModalTitle}>Seleccionar ubicación</Text>
                    <FlatList
                      data={LOCATIONS}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <Pressable
                          style={[s.locationItem, value === item && s.locationItemActive]}
                          onPress={() => { onChange(item); setShowLocationPicker(false); setLocationCustom(false); }}
                        >
                          <Text style={[s.locationItemText, value === item && s.locationItemTextActive]}>{item}</Text>
                        </Pressable>
                      )}
                    />
                    <Pressable style={s.locationCustom} onPress={() => { setShowLocationPicker(false); setLocationCustom(true); }}>
                      <Text style={s.locationCustomText}>+ Ingresar otra ubicación</Text>
                    </Pressable>
                  </Pressable>
                </Pressable>
              </Modal>
            </>
          )} />
        </Field>

        <View style={s.horariosSection}>
          <Text style={s.label}>Horarios</Text>
          {horarios.map((horario, index) => (
            <View key={index} style={s.horarioRow}>
              <View style={s.dayPicker}>
                {DIAS.map((dia) => (
                  <Pressable
                    key={dia}
                    style={[s.dayChip, horario.dia === dia && s.dayChipOn]}
                    onPress={() => handleHorarioChange(index, 'dia', dia)}
                  >
                    <Text style={[s.dayChipText, horario.dia === dia && s.dayChipTextOn]}>
                      {dia.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.timeRow}>
                <Pressable
                  style={[s.timeInput, horario.horaInicio ? s.timeInputSet : null]}
                  onPress={() => setTimePickerTarget({ index, field: 'horaInicio' })}
                >
                  <Text style={[s.timeInputText, !horario.horaInicio && s.timeInputPlaceholder]}>
                    {horario.horaInicio || 'Inicio'}
                  </Text>
                </Pressable>
                <Text style={s.timeSep}>a</Text>
                <Pressable
                  style={[s.timeInput, horario.horaFin ? s.timeInputSet : null]}
                  onPress={() => setTimePickerTarget({ index, field: 'horaFin' })}
                >
                  <Text style={[s.timeInputText, !horario.horaFin && s.timeInputPlaceholder]}>
                    {horario.horaFin || 'Fin'}
                  </Text>
                </Pressable>
                {timePickerTarget?.index === index && timePickerTarget?.field && (
                  <DateTimePicker
                    value={timeStrToDate(horario[timePickerTarget.field] || '08:00')}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(_evt, selectedDate) => {
                      if (Platform.OS !== 'ios') setTimePickerTarget(null);
                      if (selectedDate) {
                        handleHorarioChange(index, timePickerTarget.field, dateToTimeStr(selectedDate));
                        if (Platform.OS === 'ios') setTimePickerTarget(null);
                      }
                    }}
                  />
                )}
              </View>
              {horarios.length > 1 && (
                <Pressable style={s.removeBtn} onPress={() => eliminarHorario(index)}>
                  <X size={12} strokeWidth={2.2} color={T.error} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable style={s.addBtn} onPress={agregarHorario}>
            <Text style={s.addBtnText}>+ Agregar horario</Text>
          </Pressable>
        </View>

        <Pressable style={[s.btn, isLoading && s.btnOff]} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleSubmit(doSubmit)();
        }} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnT}>{editData ? 'Guardar cambios' : 'Crear tutoria'}</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({ label, error, children, half }: { label: string; error?: string; children: React.ReactNode; half?: boolean }) {
  return <View style={[s.field, half && { flex: 1 }]}>{label && <Text style={s.label}>{label}</Text>}{children}{error && <Text style={s.err}>{error}</Text>}</View>;
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  root: { gap: 16, padding: 16 },
  field: { gap: 4 },
  label: { ...Typography.overline, color: T.textSecondary },
  input: {
    backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 14,
    fontSize: 15, color: T.inputText,
  },
  textArea: { minHeight: 80 },
  inputErr: { borderColor: T.error },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 14,
  },
  dateBtnErr: { borderColor: T.error },
  dateBtnText: {
    fontSize: 15, color: T.inputText, flex: 1,
  },
  dateBtnPlaceholder: { color: T.inputPlaceholder },
  err: { ...Typography.caption, color: T.error },
  row: { flexDirection: 'row', gap: 12 },
  btn: {
    backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    padding: 16, alignItems: 'center', marginTop: 8,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  btnOff: { opacity: 0.5 },
  btnT: { ...Typography.button, color: '#FFFFFF', fontSize: 15 },
  horariosSection: { gap: 10 },
  horarioRow: {
    backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusMd,
    padding: 12, borderWidth: 1, borderColor: T.cardBorder, gap: 10,
  },
  dayPicker: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.cardBorder,
  },
  dayChipOn: {
    backgroundColor: T.primaryMuted, borderColor: T.primary,
    ...Shadows.sm,
  },
  dayChipText: { ...Typography.caption, color: T.textSecondary },
  dayChipTextOn: { color: T.primary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    flex: 1, backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 10, alignItems: 'center',
  },
  timeInputSet: { borderColor: T.primary, backgroundColor: T.primaryMuted },
  timeInputText: { fontSize: 14, color: T.inputText, textAlign: 'center' },
  timeInputPlaceholder: { color: T.inputPlaceholder },
  timeSep: { ...Typography.bodySm, color: T.textSecondary },
  removeBtn: {
    alignSelf: 'flex-end', width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.errorBg, justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: T.primary, borderStyle: 'dashed',
  },
  addBtnText: { ...Typography.caption, fontWeight: '600', color: T.primary },
  docenteField: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusSm,
    padding: 14, borderWidth: 1, borderColor: T.cardBorder,
  },
  docenteName: { ...Typography.body, color: T.textPrimary, flex: 1 },

  locationBtn: { justifyContent: 'center' },
  locationBtnText: { fontSize: 15, color: T.inputText },
  locationPlaceholder: { color: T.inputPlaceholder },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  locationModal: {
    backgroundColor: T.background,
    borderTopLeftRadius: Sizes.radiusXl,
    borderTopRightRadius: Sizes.radiusXl,
    maxHeight: '70%', paddingBottom: 40,
  },
  locationModalTitle: {
    ...Typography.h4, color: T.textPrimary,
    paddingHorizontal: Sizes.paddingMd, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  locationItem: {
    paddingHorizontal: Sizes.paddingMd, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  locationItemActive: { backgroundColor: T.primaryMuted },
  locationItemText: { fontSize: 15, color: T.textPrimary },
  locationItemTextActive: { color: T.primary, fontWeight: '600' },
  locationCustom: {
    paddingHorizontal: Sizes.paddingMd, paddingVertical: 14,
    marginTop: 4,
  },
  locationCustomText: { fontSize: 14, color: T.primary, fontWeight: '600' },
});
