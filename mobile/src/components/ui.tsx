import type { LucideIcon } from "lucide-react-native";
import { ChevronRight, ShieldCheck } from "lucide-react-native";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatMoneyFromPoisha } from "../utils/formatters";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";
import { useLocaleSettings } from "../i18n/LocaleSettingsProvider";

export function AppScreen({
  children,
  contentStyle,
  dark = false,
  scroll = true,
}: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle>; dark?: boolean; scroll?: boolean }>) {
  const body = <View style={[styles.screenContent, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safeArea, dark && styles.darkSafeArea]}>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent}>{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function ScreenTitle({ bn, en, right }: { bn: string; en?: string; right?: ReactNode }) {
  const { showEnglishGloss } = useLocaleSettings();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleCopy}>
        <Text style={styles.title}>{bn}</Text>
        {en && showEnglishGloss ? <Text style={styles.gloss}>{en}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  tone = "green",
  disabled = false,
  style,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: "green" | "red" | "amber" | "dark";
}) {
  const backgroundColor = tone === "red" ? colors.destructive.primary : tone === "amber" ? colors.status.warn : tone === "dark" ? colors.text.primary : colors.brand.primary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor }, pressed && styles.pressed, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={colors.background.surface} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  destructive = false,
  style,
}: {
  destructive?: boolean;
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.outlineButton, destructive && styles.destructiveOutline, pressed && styles.pressed, style]}
    >
      <Text style={[styles.outlineText, destructive && styles.destructiveText]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ active = false, label, tone = "neutral" }: { active?: boolean; label: string; tone?: "neutral" | "good" | "warn" | "bad" | "blue" }) {
  const toneStyle = tone === "good" ? styles.goodPill : tone === "warn" ? styles.warnPill : tone === "bad" ? styles.badPill : tone === "blue" ? styles.bluePill : undefined;
  const toneText = tone === "good" ? styles.goodText : tone === "warn" ? styles.warnText : tone === "bad" ? styles.badText : tone === "blue" ? styles.blueText : undefined;
  return (
    <View style={[styles.pill, active && styles.activePill, toneStyle]}>
      <Text style={[styles.pillText, active && styles.activePillText, toneText]}>{label}</Text>
    </View>
  );
}

export function Money({ poisha, size = "large", color }: { color?: string; poisha: number; size?: "small" | "large" | "display" }) {
  return <Text style={[styles.money, size === "small" && styles.moneySmall, size === "display" && styles.moneyDisplay, color ? { color } : undefined]}>{formatMoneyFromPoisha(poisha)}</Text>;
}

export function Field({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: {
  keyboardType?: KeyboardTypeOptions;
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.subtle}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export function SettingRow({ icon: Icon, label, meta, onPress }: { icon: LucideIcon; label: string; meta?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.rowPressed]}>
      <Icon color={colors.text.muted} size={20} strokeWidth={1.5} />
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        {meta ? <Text style={styles.settingMeta}>{meta}</Text> : null}
      </View>
      <ChevronRight color={colors.text.subtle} size={18} strokeWidth={1.5} />
    </Pressable>
  );
}

export function EscrowNote({ children }: PropsWithChildren) {
  return (
    <View style={styles.escrowNote}>
      <ShieldCheck color={colors.brand.primary} size={20} strokeWidth={1.5} />
      <Text style={styles.escrowText}>{children}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export const textStyles = StyleSheet.create({
  body: { color: colors.text.body, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body, lineHeight: 22 },
  bodyStrong: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  cardTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  eyebrow: { color: colors.text.muted, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.eyebrow },
  meta: { color: colors.text.muted, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta, lineHeight: 18 },
  mono: { color: colors.text.primary, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.body },
});

const styles = StyleSheet.create({
  activePill: { backgroundColor: colors.text.primary, borderColor: colors.text.primary },
  activePillText: { color: colors.background.surface },
  badPill: { backgroundColor: colors.status.badSoft, borderColor: colors.status.badSoft },
  badText: { color: colors.status.bad },
  bluePill: { backgroundColor: colors.interactive.blueSoft, borderColor: colors.interactive.blueSoft },
  blueText: { color: colors.interactive.blue },
  card: { backgroundColor: colors.background.surface, borderColor: colors.border.default, borderRadius: radii.card, borderWidth: 1, padding: spacing.x4 },
  darkSafeArea: { backgroundColor: colors.brand.primary },
  destructiveOutline: { borderColor: colors.destructive.border },
  destructiveText: { color: colors.destructive.primary },
  detail: {},
  disabled: { opacity: 0.45 },
  divider: { backgroundColor: colors.border.hairline, height: 1, marginVertical: spacing.x3 },
  empty: { alignItems: "center", minHeight: 160, justifyContent: "center", padding: spacing.x6 },
  emptyText: { color: colors.text.muted, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge, textAlign: "center" },
  escrowNote: { alignItems: "center", backgroundColor: colors.brand.soft, borderColor: colors.border.default, borderRadius: radii.card, borderWidth: 1, flexDirection: "row", gap: spacing.x3, padding: spacing.x4 },
  escrowText: { color: colors.brand.deepText, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, lineHeight: 20 },
  fieldGroup: { gap: spacing.x2 },
  fieldLabel: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  gloss: { color: colors.text.muted, fontFamily: fontFamilies.ui.regular, fontSize: fontSizes.eyebrow, marginTop: 2 },
  goodPill: { backgroundColor: colors.status.goodSoft, borderColor: colors.status.goodSoft },
  goodText: { color: colors.status.good },
  input: { backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, color: colors.text.primary, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.bodyLarge, minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4 },
  money: { color: colors.text.primary, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.headingSmall },
  moneyDisplay: { fontSize: fontSizes.title },
  moneySmall: { fontSize: fontSizes.cardSmall },
  outlineButton: { alignItems: "center", backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, justifyContent: "center", minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4 },
  outlineText: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  pill: { alignItems: "center", borderColor: colors.border.strong, borderRadius: radii.pill, borderWidth: 1, justifyContent: "center", minHeight: touchTargets.minimum, paddingHorizontal: spacing.x4 },
  pillText: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  primaryButton: { alignItems: "center", borderRadius: radii.card, justifyContent: "center", minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4 },
  primaryButtonText: { color: colors.background.surface, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  rowPressed: { backgroundColor: colors.background.sunken },
  safeArea: { backgroundColor: colors.background.page, flex: 1 },
  screenContent: { flexGrow: 1, gap: spacing.x4, padding: spacing.x4 },
  scrollContent: { flexGrow: 1 },
  settingCopy: { flex: 1 },
  settingLabel: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  settingMeta: { color: colors.text.muted, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta, marginTop: 2 },
  settingRow: { alignItems: "center", flexDirection: "row", gap: spacing.x3, minHeight: 60, paddingHorizontal: spacing.x4 },
  title: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.headingSmall, lineHeight: 34 },
  titleCopy: { flex: 1 },
  titleRow: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  warnPill: { backgroundColor: colors.status.warnSoft, borderColor: colors.status.warnSoft },
  warnText: { color: colors.status.warnDark },
});

export function textWithStyle(style: StyleProp<TextStyle>) {
  return style;
}
