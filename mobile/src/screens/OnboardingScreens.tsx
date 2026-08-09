import { Check, ShoppingBasket, Sprout, Truck } from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen, EscrowNote, Field, PrimaryButton, ScreenTitle, textStyles } from "../components/ui";
import type { AppRole } from "../domain/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";
import { useSession } from "../auth/SessionProvider";

type Step = "role" | "verify";

const roles: { accent: string; description: string; icon: typeof Sprout; label: string; role: AppRole }[] = [
  { accent: colors.brand.primary, description: "Farmer — I sell my harvest", icon: Sprout, label: "কৃষক", role: "FARMER" },
  { accent: colors.interactive.blueSoft, description: "Buyer — I purchase crops in bulk", icon: ShoppingBasket, label: "ক্রেতা", role: "BUYER" },
  { accent: colors.status.warnSoft, description: "Logistics partner — I move the goods", icon: Truck, label: "পরিবহন অংশীদার", role: "CARRIER" },
];

const previewPhones: Record<AppRole, string> = { BUYER: "1712004556", CARRIER: "1711828290", FARMER: "1700000007" };

export function OnboardingScreen() {
  const { requestOtp, signInWithOtp } = useSession();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<AppRole>("FARMER");
  const [phone, setPhone] = useState(previewPhones.FARMER);
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpDigits = useMemo(() => Array.from({ length: 4 }, (_, index) => otp[index] ?? ""), [otp]);

  const continueToOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestOtp(`+880${phone}`, role);
      setStep("verify");
    } catch {
      setError("কোড পাঠানো যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithOtp(`+880${phone}`, role, otp, pin);
    } catch {
      setError("কোডটি সঠিক নয়। ডেভেলপমেন্ট প্রিভিউতে 1234 ব্যবহার করুন।");
    } finally {
      setLoading(false);
    }
  };

  if (step === "role") {
    return (
      <AppScreen contentStyle={styles.roleScreen} dark>
        <View style={styles.brandBlock}>
          <View style={styles.logo}><Text style={styles.logoText}>অ</Text></View>
          <Text style={styles.brandName}>আমার কৃষক</Text>
          <Text style={styles.brandTagline}>সরাসরি কৃষক থেকে ক্রেতা। ন্যায্য দাম, নিরাপদ পেমেন্ট।</Text>
        </View>
        <View style={styles.roleCard}>
          <Text style={styles.rolePrompt}>আপনি কে?</Text>
          <Text style={styles.roleGloss}>Pick your role — it can only be changed by support later.</Text>
          <View style={styles.roleList}>
            {roles.map(({ accent, description, icon: Icon, label, role: option }) => {
              const selected = role === option;
              return (
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={option} onPress={() => { setRole(option); setPhone(previewPhones[option]); }} style={[styles.roleOption, selected && styles.roleOptionSelected]}>
                  <View style={[styles.roleIcon, { backgroundColor: accent }]}><Icon color={option === "FARMER" ? colors.background.surface : colors.text.strong} size={22} strokeWidth={1.5} /></View>
                  <View style={styles.roleText}><Text style={styles.roleLabel}>{label}</Text><Text style={styles.roleDescription}>{description}</Text></View>
                  {selected ? <Check color={colors.brand.primary} size={20} /> : null}
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton label="পরবর্তী" loading={loading} onPress={() => void continueToOtp()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.verifyScreen}>
        <ScreenTitle bn="ফোন যাচাই" en="Verify your phone" />
        <Field keyboardType="phone-pad" label="মোবাইল নম্বর" onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))} value={phone} />
        <View style={styles.codeGroup}>
          <Text style={styles.fieldLabel}>৪ সংখ্যার কোড</Text>
          <View style={styles.otpRow}>
            {otpDigits.map((digit, index) => <View key={index} style={[styles.otpBox, digit && styles.otpBoxFilled]}><Text style={styles.otpDigit}>{digit}</Text></View>)}
            <TextInput accessibilityLabel="৪ সংখ্যার কোড" autoFocus keyboardType="number-pad" maxLength={4} onChangeText={(value) => setOtp(value.replace(/\D/g, ""))} style={styles.hiddenOtp} value={otp} />
          </View>
          <Text style={textStyles.meta}>Code sent by SMS · resend in 0:42</Text>
        </View>
        <Field keyboardType="number-pad" label="৪ সংখ্যার পিন তৈরি করুন" onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))} value={pin} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <PrimaryButton disabled={otp.length !== 4 || pin.length !== 4} label="যাচাই করুন" loading={loading} onPress={() => void verify()} />
        <View style={styles.flexSpacer} />
        <EscrowNote>আপনার টাকা ডেলিভারি নিশ্চিত হওয়ার আগে পর্যন্ত এসক্রোতে সুরক্ষিত থাকবে।</EscrowNote>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brandBlock: { gap: spacing.x2 },
  brandName: { color: colors.background.surface, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.title },
  brandTagline: { color: colors.console.mint, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body },
  codeGroup: { gap: spacing.x2 },
  error: { backgroundColor: colors.destructive.soft, color: colors.destructive.primary, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, padding: spacing.x3 },
  fieldLabel: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  flexSpacer: { flex: 1, minHeight: spacing.x8 },
  hiddenOtp: { height: 1, opacity: 0, position: "absolute", width: 1 },
  logo: { alignItems: "center", backgroundColor: colors.background.surface, borderRadius: radii.card, height: 56, justifyContent: "center", width: 56 },
  logoText: { color: colors.brand.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.title },
  otpBox: { alignItems: "center", backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, flex: 1, height: 64, justifyContent: "center" },
  otpBoxFilled: { borderColor: colors.brand.primary, borderWidth: 2 },
  otpDigit: { color: colors.text.primary, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.headingSmall },
  otpRow: { flexDirection: "row", gap: spacing.x3, position: "relative" },
  roleCard: { backgroundColor: colors.background.surface, borderRadius: radii.modal, gap: spacing.x4, padding: spacing.x4 },
  roleDescription: { color: colors.text.muted, fontFamily: fontFamilies.ui.regular, fontSize: fontSizes.meta },
  roleGloss: { color: colors.text.muted, fontFamily: fontFamilies.ui.regular, fontSize: fontSizes.metaLarge },
  roleIcon: { alignItems: "center", borderRadius: radii.control, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  roleLabel: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  roleList: { gap: spacing.x3 },
  roleOption: { alignItems: "center", borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, flexDirection: "row", gap: spacing.x3, minHeight: 76, padding: spacing.x3 },
  roleOptionSelected: { backgroundColor: colors.brand.soft, borderColor: colors.brand.primary, borderWidth: 2 },
  rolePrompt: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.card },
  roleScreen: { backgroundColor: colors.brand.primary, justifyContent: "space-between", paddingHorizontal: spacing.x6, paddingVertical: spacing.x8 },
  roleText: { flex: 1 },
  verifyScreen: { flex: 1, gap: spacing.x4 },
});
