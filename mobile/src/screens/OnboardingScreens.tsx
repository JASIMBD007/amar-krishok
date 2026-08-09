import { Check, Eye, EyeOff, ShoppingBasket, Sprout, Truck } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError } from "../api/errors";
import { mobileApi } from "../api/services";
import { useSession, type RegistrationInput } from "../auth/SessionProvider";
import { AppScreen, Field, OutlineButton, PrimaryButton, textStyles } from "../components/ui";
import type { AppRole } from "../domain/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";

type AuthMode = "login" | "register";
type RegisterRole = Exclude<AppRole, "CARRIER">;

const loginRoles: { icon: typeof Sprout; label: string; role: AppRole }[] = [
  { icon: ShoppingBasket, label: "ক্রেতা", role: "BUYER" },
  { icon: Sprout, label: "কৃষক", role: "FARMER" },
  { icon: Truck, label: "পরিবহন", role: "CARRIER" },
];

const emptyRegistration: RegistrationInput = {
  address: "",
  district: "",
  focus: "",
  identity: "",
  name: "",
  organization: "",
  password: "",
  phone: "",
  role: "FARMER",
  upazila: "",
};

function phoneForApi(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return `+880${local.slice(0, 10)}`;
}

function localPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return local.slice(0, 10);
}

function errorText(error: unknown) {
  return error instanceof ApiError
    ? error.messageBn
    : "সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।";
}

function PhoneField({ onChangeText, value }: { onChangeText: (value: string) => void; value: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>মোবাইল নম্বর</Text>
      <View style={styles.phoneControl}>
        <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+880</Text></View>
        <TextInput
          accessibilityLabel="মোবাইল নম্বর"
          autoComplete="tel"
          keyboardType="phone-pad"
          onChangeText={(next) => onChangeText(localPhoneInput(next))}
          placeholder="1XXXXXXXXX"
          placeholderTextColor={colors.text.subtle}
          style={styles.phoneInput}
          value={value}
        />
      </View>
    </View>
  );
}

function PasswordField({ label = "পাসওয়ার্ড", onChangeText, value }: { label?: string; onChangeText: (value: string) => void; value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordControl}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={onChangeText}
          placeholder="আপনার পাসওয়ার্ড"
          placeholderTextColor={colors.text.subtle}
          secureTextEntry={!visible}
          style={styles.passwordInput}
          value={value}
        />
        <Pressable
          accessibilityLabel={visible ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
          accessibilityRole="button"
          accessibilityState={{ expanded: visible }}
          hitSlop={spacing.x2}
          onPress={() => setVisible((current) => !current)}
          style={styles.passwordToggle}
        >
          {visible ? <EyeOff color={colors.text.muted} size={22} /> : <Eye color={colors.text.muted} size={22} />}
        </Pressable>
      </View>
    </View>
  );
}

function RoleSelector({ onChange, role, registration = false }: { onChange: (role: AppRole) => void; registration?: boolean; role: AppRole }) {
  return (
    <View style={styles.roleGroup}>
      <Text style={styles.label}>আমি একজন</Text>
      <View accessibilityRole="radiogroup" style={styles.roleSegments}>
        {loginRoles.filter((item) => !registration || item.role !== "CARRIER").map(({ icon: Icon, label, role: option }) => {
          const selected = role === option;
          return (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={option} onPress={() => onChange(option)} style={[styles.roleSegment, selected && styles.roleSegmentSelected]}>
              <Icon color={selected ? colors.background.surface : colors.text.muted} size={18} />
              <Text style={[styles.roleSegmentText, selected && styles.roleSegmentTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function OnboardingScreen() {
  const { login, register } = useSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<AppRole>("BUYER");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState<RegistrationInput>(emptyRegistration);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerStep, setRegisterStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data: districts = [] } = useQuery({ queryFn: mobileApi.getDistricts, queryKey: ["service-districts"], retry: 2, staleTime: 60 * 60_000 });

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setRegisterStep(1);
  };

  const submitLogin = async () => {
    if (phone.replace(/\D/g, "").length < 10 || password.length < 4) {
      setError("সঠিক মোবাইল নম্বর ও কমপক্ষে 4 অক্ষরের পাসওয়ার্ড দিন।");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(phoneForApi(phone), password, loginRole);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  };

  const nextRegistrationStep = () => {
    if (registerStep === 1) {
      if (!registration.name.trim() || phoneForApi(registration.phone).length !== 14 || !registration.district || !registration.upazila.trim()) {
        setError("নাম, সঠিক মোবাইল নম্বর, জেলা ও উপজেলা দিন।");
        return;
      }
    }
    if (registerStep === 2 && [registration.organization, registration.identity, registration.focus, registration.address].some((value) => !value.trim())) {
      setError("প্রতিষ্ঠান/খামার, পরিচয়পত্র, কাজের ধরন ও ঠিকানা দিন।");
      return;
    }
    setError(null);
    setRegisterStep((current) => Math.min(3, current + 1));
  };

  const submitRegistration = async () => {
    if (registration.password.length < 4) {
      setError("পাসওয়ার্ড কমপক্ষে 4 অক্ষরের হতে হবে।");
      return;
    }
    if (registration.password !== confirmPassword) {
      setError("দুটি পাসওয়ার্ড মেলেনি।");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({ ...registration, phone: phoneForApi(registration.phone) });
      setRegistration(emptyRegistration);
      setConfirmPassword("");
      setMode("login");
      setRegisterStep(1);
      setNotice("নিবন্ধন জমা হয়েছে। অ্যাডমিন অনুমোদনের পর লগইন করতে পারবেন।");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.layout}>
        <View style={styles.brand}>
          <View style={styles.logo}><Text style={styles.logoText}>অ</Text></View>
          <View style={styles.brandCopy}><Text style={styles.brandName}>আমার কৃষক</Text><Text style={styles.tagline}>ন্যায্য দাম, নিরাপদ পেমেন্ট, সরাসরি বাজার।</Text></View>
        </View>

        <View style={styles.modeTabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "login" }} onPress={() => switchMode("login")} style={[styles.modeTab, mode === "login" && styles.modeTabActive]}><Text style={[styles.modeText, mode === "login" && styles.modeTextActive]}>লগইন</Text></Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "register" }} onPress={() => switchMode("register")} style={[styles.modeTab, mode === "register" && styles.modeTabActive]}><Text style={[styles.modeText, mode === "register" && styles.modeTextActive]}>নিবন্ধন</Text></Pressable>
        </View>

        {mode === "login" ? (
          <View style={styles.formCard}>
            <View><Text style={styles.title}>মোবাইল নম্বর দিয়ে লগইন করুন</Text><Text style={textStyles.meta}>আপনার ওয়েবসাইট অ্যাকাউন্টের একই নম্বর ও পাসওয়ার্ড ব্যবহার করুন।</Text></View>
            <RoleSelector onChange={setLoginRole} role={loginRole} />
            <PhoneField onChangeText={setPhone} value={phone} />
            <PasswordField onChangeText={setPassword} value={password} />
            {notice ? <View accessibilityRole="alert" style={styles.notice}><Check color={colors.status.good} size={18} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="লগইন করুন" loading={loading} onPress={() => void submitLogin()} />
            {loginRole === "CARRIER" ? <Text style={styles.help}>নতুন পরিবহন অংশীদার? অ্যাকাউন্ট চালু করতে আমার কৃষক সহায়তা কেন্দ্রে যোগাযোগ করুন।</Text> : null}
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.stepHeader}><View><Text style={styles.title}>নতুন অ্যাকাউন্ট তৈরি করুন</Text><Text style={textStyles.meta}>ধাপ {registerStep} / 3</Text></View><View style={styles.steps}>{[1, 2, 3].map((step) => <View key={step} style={[styles.step, step <= registerStep && styles.stepActive]} />)}</View></View>
            {registerStep === 1 ? <>
              <RoleSelector onChange={(role) => setRegistration((current) => ({ ...current, role: role as RegisterRole }))} registration role={registration.role} />
              <Field label="পুরো নাম" onChangeText={(name) => setRegistration((current) => ({ ...current, name }))} value={registration.name} />
              <PhoneField onChangeText={(phoneValue) => setRegistration((current) => ({ ...current, phone: phoneValue }))} value={registration.phone} />
              <Text style={styles.label}>জেলা</Text>
              <View style={styles.districts}>{districts.map((district) => <Pressable key={district.id} onPress={() => setRegistration((current) => ({ ...current, district: district.id }))} style={[styles.district, registration.district === district.id && styles.districtSelected]}><Text style={[styles.districtText, registration.district === district.id && styles.districtTextSelected]}>{district.nameBn}</Text></Pressable>)}</View>
              <Field label="উপজেলা" onChangeText={(upazila) => setRegistration((current) => ({ ...current, upazila }))} value={registration.upazila} />
            </> : null}
            {registerStep === 2 ? <>
              <Field label={registration.role === "FARMER" ? "খামারের নাম" : "ব্যবসার নাম"} onChangeText={(organization) => setRegistration((current) => ({ ...current, organization }))} value={registration.organization} />
              <Field label={registration.role === "FARMER" ? "এনআইডি নম্বর" : "ট্রেড লাইসেন্স / এনআইডি"} onChangeText={(identity) => setRegistration((current) => ({ ...current, identity }))} value={registration.identity} />
              <Field label={registration.role === "FARMER" ? "যে ফসল সরবরাহ করেন" : "যে ফসল কিনতে চান"} onChangeText={(focus) => setRegistration((current) => ({ ...current, focus }))} value={registration.focus} />
              <Field label="সম্পূর্ণ ঠিকানা" onChangeText={(address) => setRegistration((current) => ({ ...current, address }))} value={registration.address} />
            </> : null}
            {registerStep === 3 ? <>
              <PasswordField onChangeText={(passwordValue) => setRegistration((current) => ({ ...current, password: passwordValue }))} value={registration.password} />
              <PasswordField label="পাসওয়ার্ড নিশ্চিত করুন" onChangeText={setConfirmPassword} value={confirmPassword} />
              <View style={styles.review}><Text style={styles.reviewTitle}>{registration.name}</Text><Text style={textStyles.body}>{registration.role === "FARMER" ? "কৃষক" : "ক্রেতা"} · {registration.organization}</Text><Text style={textStyles.meta}>অ্যাকাউন্টটি অ্যাডমিন যাচাইয়ের জন্য পাঠানো হবে।</Text></View>
            </> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>{registerStep > 1 ? <OutlineButton label="পেছনে" onPress={() => { setError(null); setRegisterStep((current) => current - 1); }} style={styles.flex} /> : null}<PrimaryButton label={registerStep === 3 ? "নিবন্ধন জমা দিন" : "পরবর্তী"} loading={loading} onPress={registerStep === 3 ? () => void submitRegistration() : nextRegistrationStep} style={styles.flex} /></View>
          </View>
        )}
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.x3 },
  brand: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  brandCopy: { flex: 1 },
  brandName: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.headingSmall },
  district: { alignItems: "center", borderColor: colors.border.strong, borderRadius: radii.pill, borderWidth: 1, justifyContent: "center", minHeight: touchTargets.minimum, paddingHorizontal: spacing.x3 },
  districtSelected: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  districtText: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  districtTextSelected: { color: colors.background.surface },
  districts: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x2 },
  error: { backgroundColor: colors.destructive.soft, borderRadius: radii.card, color: colors.destructive.primary, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, padding: spacing.x3 },
  flex: { flex: 1 },
  fieldGroup: { gap: spacing.x2 },
  formCard: { backgroundColor: colors.background.surface, borderColor: colors.border.default, borderRadius: radii.modal, borderWidth: 1, gap: spacing.x4, padding: spacing.x4 },
  help: { color: colors.text.muted, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta, lineHeight: 18, textAlign: "center" },
  label: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  layout: { flex: 1, gap: spacing.x6 },
  logo: { alignItems: "center", backgroundColor: colors.brand.primary, borderRadius: radii.card, height: 52, justifyContent: "center", width: 52 },
  logoText: { color: colors.background.surface, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.headingSmall },
  modeTab: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: touchTargets.minimum },
  modeTabActive: { borderBottomColor: colors.brand.primary, borderBottomWidth: 2 },
  modeTabs: { backgroundColor: colors.background.surface, borderColor: colors.border.default, borderRadius: radii.card, borderWidth: 1, flexDirection: "row", paddingHorizontal: spacing.x2 },
  modeText: { color: colors.text.muted, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  modeTextActive: { color: colors.brand.primary },
  notice: { alignItems: "center", backgroundColor: colors.status.goodSoft, borderRadius: radii.card, flexDirection: "row", gap: spacing.x2, padding: spacing.x3 },
  noticeText: { color: colors.status.good, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge },
  passwordControl: { alignItems: "center", backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, flexDirection: "row", minHeight: touchTargets.primaryMinimum },
  passwordInput: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.bodyLarge, minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4, paddingVertical: 0 },
  passwordToggle: { alignItems: "center", justifyContent: "center", minHeight: touchTargets.minimum, minWidth: touchTargets.minimum, paddingRight: spacing.x2 },
  phoneControl: { alignItems: "center", backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, flexDirection: "row", minHeight: touchTargets.primaryMinimum, overflow: "hidden" },
  phoneInput: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.bodyLarge, minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4, paddingVertical: 0 },
  phonePrefix: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.background.sunken, borderRightColor: colors.border.strong, borderRightWidth: 1, justifyContent: "center", paddingHorizontal: spacing.x4 },
  phonePrefixText: { color: colors.text.strong, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.bodyLarge },
  review: { backgroundColor: colors.brand.soft, borderRadius: radii.card, gap: spacing.x2, padding: spacing.x4 },
  reviewTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  roleGroup: { gap: spacing.x2 },
  roleSegment: { alignItems: "center", borderRadius: radii.control, flex: 1, flexDirection: "row", gap: spacing.x1, justifyContent: "center", minHeight: touchTargets.minimum, paddingHorizontal: spacing.x1 },
  roleSegmentSelected: { backgroundColor: colors.brand.primary },
  roleSegmentText: { color: colors.text.muted, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  roleSegmentTextSelected: { color: colors.background.surface },
  roleSegments: { backgroundColor: colors.background.sunken, borderRadius: radii.control, flexDirection: "row", padding: spacing.x1 },
  screen: { paddingHorizontal: spacing.x4, paddingVertical: spacing.x6 },
  step: { backgroundColor: colors.border.default, borderRadius: radii.pill, height: 4, width: spacing.x6 },
  stepActive: { backgroundColor: colors.brand.primary },
  stepHeader: { alignItems: "center", flexDirection: "row", gap: spacing.x3, justifyContent: "space-between" },
  steps: { flexDirection: "row", gap: spacing.x1 },
  tagline: { color: colors.text.muted, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge },
  title: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.card },
});
