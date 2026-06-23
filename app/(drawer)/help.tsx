import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, UIManager, Linking, LayoutAnimation } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { HelpCircle, Phone, Mail, MapPin, Clock, Globe, Wrench, Info, ChevronDown } from 'lucide-react-native';

if (Platform.OS === 'android') { UIManager.setLayoutAnimationEnabledExperimental?.(true); }

const FAQ_ITEMS = [
  { id: '1', question: '¿Cómo encuentro un aula en el mapa?', answer: 'Ve a la pestaña "Mapa" en la barra inferior. Usa el buscador para escribir el código o nombre del aula. También puedes filtrar por categoría usando los chips de filtro.' },
  { id: '2', question: '¿Cómo consulto los horarios del Polibus?', answer: 'Dirígete a la pestaña "Polibus". Selecciona la ruta que deseas consultar y verás el recorrido en el mapa junto con las paradas.' },
  { id: '3', question: '¿Puedo inscribirme en eventos desde la app?', answer: 'Sí. En "Eventos", abre el evento de tu interés y toca "Inscribirse". Necesitas haber iniciado sesión con tu cuenta institucional.' },
  { id: '4', question: '¿Cómo agrego lugares a Favoritos?', answer: 'Desde el Mapa, selecciona un aula o ubicación y toca el ícono de estrella ⭐ en el panel de detalle.' },
  { id: '5', question: '¿La aplicación funciona sin internet?', answer: 'Requiere conexión para el mapa, eventos y horarios. Tus favoritos y preferencias se almacenan localmente.' },
  { id: '6', question: '¿Cómo recupero mi contraseña?', answer: 'En inicio de sesión, toca "¿Olvidaste tu contraseña?". Ingresa tu correo institucional y recibirás un enlace.' },
  { id: '7', question: '¿Qué permisos necesita la aplicación?', answer: 'ESFOT Go solicita permiso de ubicación para mostrar tu posición en el mapa y calcular rutas. Es opcional pero mejora la experiencia.' },
];

const FaqItem = memo(function FaqItem({ item, isOpen, onToggle }: { item: typeof FAQ_ITEMS[0]; isOpen: boolean; onToggle: () => void }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const chevronAnim = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  const handlePress = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    setTimeout(() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }, 80);
    rotate.value = withSpring(isOpen ? 0 : 180, { damping: 20, stiffness: 200 });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.faqItem, isOpen && styles.faqItemOpen, anim]}>
        <View style={styles.faqHeader}>
          <View style={[styles.faqDot, isOpen && styles.faqDotActive]} />
          <Text style={[styles.faqQuestion, isOpen && styles.faqQuestionActive]}>{item.question}</Text>
          <Animated.View style={chevronAnim}>
            <ChevronDown size={14} color={isOpen ? T.primary : T.textTertiary} strokeWidth={2} />
          </Animated.View>
        </View>
        {isOpen && <Text style={styles.faqAnswer}>{item.answer}</Text>}
      </Animated.View>
    </Pressable>
  );
});

const ContactCard = memo(function ContactCard({ Icon, label, value, onPress }: { Icon: typeof Mail; label: string; value: string; onPress?: () => void }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable onPressIn={() => { scale.value = withSpring(0.97); }} onPressOut={() => { scale.value = withSpring(1); }} onPress={onPress} disabled={!onPress}>
      <Animated.View style={[styles.contactCard, anim]}>
        <View style={styles.contactIconWrap}><Icon size={20} color={T.primary} strokeWidth={1.8} /></View>
        <View style={styles.contactInfo}><Text style={styles.contactLabel}>{label}</Text><Text style={[styles.contactValue, onPress && styles.contactLink]}>{value}</Text></View>
        {onPress && <ChevronDown size={20} color={T.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: '-90deg' }] }} />}
      </Animated.View>
    </Pressable>
  );
});

export default function HelpScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const toggleFaq = useCallback((id: string) => { setOpenFaq((prev) => (prev === id ? null : id)); }, []);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[T.primary, T.primaryLight, T.background]} locations={[0, 0.18, 1]} style={styles.heroBg} />
      <GlassHeader scrollY={scrollY} onAvatarPress={() => router.push('/profile' as any)} onMenuPress={() => (navigation as any).openDrawer()} />
      <Animated.ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top + 72 }]}>
          <Text style={styles.title}>Ayuda</Text>
          <Text style={styles.subtitle}>Encuentra respuestas o contáctanos</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <HelpCircle size={20} color={T.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
          </View>
          {FAQ_ITEMS.map((item) => <FaqItem key={item.id} item={item} isOpen={openFaq === item.id} onToggle={() => toggleFaq(item.id)} />)}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone size={20} color={T.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Contacto institucional</Text>
          </View>
          <View style={styles.contactList}>
            <ContactCard Icon={Mail} label="Correo institucional" value="esfot@epn.edu.ec" onPress={() => Linking.openURL('mailto:esfot@epn.edu.ec')} />
            <ContactCard Icon={Phone} label="Teléfono" value="+593 2 2976 300 Ext. 2000" onPress={() => Linking.openURL('tel:+593229763002000')} />
            <ContactCard Icon={MapPin} label="Dirección" value="Ladrón de Guevara E11-253, Quito" />
            <ContactCard Icon={Clock} label="Horario de atención" value="Lunes a Viernes, 8:00 - 17:00" />
            <ContactCard Icon={Globe} label="Sitio web institucional" value="www.epn.edu.ec" onPress={() => Linking.openURL('https://www.epn.edu.ec')} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wrench size={20} color={T.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Soporte técnico</Text>
          </View>
          <View style={styles.supportCard}>
            <Text style={styles.supportText}>¿Encontraste un problema? Reporta el error y lo resolveremos.</Text>
            <Pressable style={({ pressed }) => [styles.supportBtn, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]} onPress={() => Linking.openURL('mailto:soporte.esfotgo@epn.edu.ec?subject=Reporte%20ESFOT%20Go')}>
              <LinearGradient colors={[T.primary, T.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.supportBtnGradient}>
                <Mail size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.supportBtnText}>Reportar un problema</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={T.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Acerca de ESFOT Go</Text>
          </View>
          <View style={styles.aboutCard}>
            <View style={styles.aboutLogo}><Text style={styles.aboutLogoText}>EPN</Text></View>
            <View style={styles.aboutInfo}>
              <Text style={styles.aboutAppName}>ESFOT Go</Text>
              <Text style={styles.aboutVersion}>Versión 1.0.0</Text>
              <Text style={styles.aboutOrg}>Escuela de Formación de Tecnólogos{'\n'}Escuela Politécnica Nacional</Text>
            </View>
          </View>
          <View style={styles.aboutMeta}>
            <Text style={styles.aboutMetaText}>Proyecto de titulación desarrollado para mejorar la experiencia de navegación y gestión del campus universitario ESFOT-EPN.</Text>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  heroBg: { position: 'absolute', top: -80, left: 0, right: 0, height: 360 },
  scroll: { flex: 1 },
  content: { paddingTop: 8 },
  header: { paddingHorizontal: Sizes.paddingMd, paddingBottom: Sizes.gapSm, gap: 4 },
  title: { ...Typography.display, color: T.textPrimary },
  subtitle: { ...Typography.body, color: T.textSecondary },
  section: { paddingHorizontal: Sizes.paddingMd, marginBottom: Sizes.gapXl, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionTitle: { ...Typography.h4, color: T.textPrimary },
  faqItem: { backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg, padding: Sizes.paddingMd, borderWidth: 1, borderColor: T.cardBorder, marginBottom: Sizes.gapSm, ...Shadows.sm },
  faqItemOpen: { borderColor: T.primary + '30', backgroundColor: T.surface },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.textTertiary, marginTop: 7, flexShrink: 0 },
  faqDotActive: { backgroundColor: T.primary },
  faqQuestion: { flex: 1, ...Typography.bodySm, color: T.textPrimary, fontWeight: '600', lineHeight: 20 },
  faqQuestionActive: { color: T.primary },
  faqAnswer: { ...Typography.bodySm, color: T.textSecondary, lineHeight: 21, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.divider },
  contactList: { gap: Sizes.gapSm },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg, padding: Sizes.paddingMd, gap: 12, borderWidth: 1, borderColor: T.cardBorder, ...Shadows.sm },
  contactIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: T.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: T.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  contactValue: { ...Typography.bodySm, color: T.textPrimary, fontWeight: '500' },
  contactLink: { color: T.primary, textDecorationLine: 'underline' },
  supportCard: { backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg, padding: Sizes.paddingLg, gap: Sizes.gapMd, borderWidth: 1, borderColor: T.cardBorder, ...Shadows.sm },
  supportText: { ...Typography.bodySm, color: T.textSecondary, lineHeight: 20 },
  supportBtn: { borderRadius: Sizes.radiusMd, overflow: 'hidden', ...Shadows.sm },
  supportBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20 },
  supportBtnText: { ...Typography.button, color: '#FFFFFF', fontSize: 14 },
  aboutCard: { backgroundColor: T.surfaceGlass, borderRadius: Sizes.radiusLg, padding: Sizes.paddingLg, flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: T.cardBorder, ...Shadows.sm },
  aboutLogo: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, justifyContent: 'center', alignItems: 'center' },
  aboutLogoText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  aboutInfo: { flex: 1, gap: 3 },
  aboutAppName: { ...Typography.h4, color: T.textPrimary },
  aboutVersion: { fontSize: 11, color: T.textTertiary },
  aboutOrg: { fontSize: 12, color: T.textSecondary, lineHeight: 17 },
  aboutMeta: { backgroundColor: T.primaryMuted, borderRadius: Sizes.radiusMd, padding: Sizes.paddingMd },
  aboutMetaText: { ...Typography.bodySm, color: T.primary, lineHeight: 19 },
});
