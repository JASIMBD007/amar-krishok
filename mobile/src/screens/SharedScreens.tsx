import { useNavigation, useRoute, type NavigationProp, type RouteProp } from "@react-navigation/native";
import {
  Bell,
  Camera,
  CircleDollarSign,
  FileBadge,
  Globe2,
  HelpCircle,
  LockKeyhole,
  LogOut,
  Phone,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "../auth/SessionProvider";
import { AppScreen, Card, Divider, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, SettingRow, textStyles } from "../components/ui";
import { notificationItems, orderTimeline } from "../data/demo";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";
import { pickAndCompressPhoto, type PreparedPhoto } from "../media/images";
import { mobileApi } from "../api/services";

export function ProfileScreen() {
  const { logout, user } = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  if (!user) return null;
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return (
    <AppScreen>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text><View style={styles.cameraBadge}><Camera color={colors.background.surface} size={14} /></View></View>
        <View style={styles.profileCopy}><Text style={styles.profileName}>{user.name}</Text><Text style={textStyles.meta}>{user.role === "FARMER" ? "কৃষক" : user.role === "BUYER" ? "ক্রেতা" : "পরিবহন অংশীদার"} · {user.district}</Text><Pill label={user.verified ? "যাচাইকৃত" : "যাচাই বাকি"} tone={user.verified ? "good" : "warn"} /></View>
      </View>
      <Card style={styles.settingsCard}>
        <SettingRow icon={UserRound} label="ব্যক্তিগত তথ্য" />
        <Divider />
        <SettingRow icon={FileBadge} label="এনআইডি ও জমির দলিল" meta={user.verified ? "যাচাই সম্পন্ন" : "নথি জমা দিন"} onPress={() => navigation.navigate("Kyc")} />
        <Divider />
        <SettingRow icon={CircleDollarSign} label="পেমেন্ট অ্যাকাউন্ট" meta="বিকাশ · 01711 ••• 442" />
      </Card>
      <Card style={styles.settingsCard}>
        <SettingRow icon={Globe2} label="ভাষা" meta="বাংলা" />
        <Divider />
        <SettingRow icon={Bell} label="বিজ্ঞপ্তি ও SMS" onPress={() => navigation.navigate("Notifications")} />
        <Divider />
        <SettingRow icon={LockKeyhole} label="পিন ও নিরাপত্তা" />
      </Card>
      <Card style={styles.settingsCard}><SettingRow icon={HelpCircle} label="সহায়তা" onPress={() => navigation.navigate("Chat", { threadId: "support" })} /></Card>
      <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.logout}><LogOut color={colors.destructive.primary} size={18} /><Text style={styles.logoutText}>লগ আউট</Text></Pressable>
    </AppScreen>
  );
}

type KycKind = "NID_FRONT" | "NID_BACK" | "LAND";

export function KycScreen() {
  const [documents, setDocuments] = useState<Partial<Record<KycKind, PreparedPhoto>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const capture = async (kind: KycKind) => {
    const photo = await pickAndCompressPhoto();
    if (photo) setDocuments((current) => ({ ...current, [kind]: photo }));
  };
  const submit = async () => {
    setSubmitting(true);
    try {
      await Promise.all(Object.entries(documents).map(async ([kind, photo]) => {
        const signed = await mobileApi.requestKycDocumentUpload(kind as KycKind, "image/jpeg", photo.sizeBytes);
        const file = await (await fetch(photo.uri)).blob();
        const uploadResponse = await fetch(signed.uploadUrl, { body: file, headers: { "Content-Type": "image/jpeg" }, method: "PUT" });
        if (!uploadResponse.ok) throw new Error("KYC document upload failed.");
        await mobileApi.commitKycDocument(kind as KycKind, signed.objectKey);
      }));
      setSubmitted(true);
    } finally { setSubmitting(false); }
  };
  return <AppScreen><ScreenTitle bn="পরিচয় যাচাই" en="Profile & KYC" /><Text style={textStyles.body}>পরিষ্কার ছবি দিন। তথ্য শুধু যাচাইয়ের কাজে ব্যবহার করা হবে।</Text>{([{ kind: "NID_FRONT", label: "এনআইডির সামনের দিক" }, { kind: "NID_BACK", label: "এনআইডির পেছনের দিক" }, { kind: "LAND", label: "জমির দলিল" }] as const).map((item) => <Card key={item.kind}><View style={styles.kycRow}><View style={styles.profileCopy}><Text style={styles.notificationTitle}>{item.label}</Text><Text style={textStyles.meta}>ছবি 500 KB-এর নিচে থাকবে</Text></View><Pressable onPress={() => void capture(item.kind)} style={styles.kycCapture}>{documents[item.kind] ? <Image source={{ uri: documents[item.kind]?.uri }} style={styles.kycImage} /> : <><Camera color={colors.brand.primary} size={22} /><Text style={styles.kycCaptureText}>ছবি দিন</Text></>}</Pressable></View></Card>)}{submitted ? <View style={styles.kycSuccess}><Text style={styles.kycSuccessText}>নথি যাচাইয়ের জন্য জমা হয়েছে।</Text></View> : null}<PrimaryButton disabled={Object.keys(documents).length < 2} label="যাচাইয়ের জন্য জমা দিন" loading={submitting} onPress={() => void submit()} /></AppScreen>;
}

export function NotificationsScreen() {
  const [category, setCategory] = useState("অর্ডার");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(notificationItems.filter((item) => item.read).map((item) => item.id)));
  const categories = ["অর্ডার", "পেমেন্ট", "দর", "সিস্টেম"];
  const visible = notificationItems.filter((item) => item.category === category);
  const markAll = () => setReadIds(new Set(notificationItems.map((item) => item.id)));
  return (
    <AppScreen contentStyle={styles.noHorizontalPadding}>
      <View style={styles.padded}><ScreenTitle bn="বিজ্ঞপ্তি" en="Notifications" right={<Pressable onPress={markAll}><Text style={styles.link}>সব পড়া হয়েছে</Text></Pressable>} /></View>
      <ScrollView contentContainerStyle={styles.chipRow} horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)}><Pill active={category === item} label={`${item}${item === "অর্ডার" ? "  2" : item === "পেমেন্ট" ? "  1" : ""}`} /></Pressable>)}
      </ScrollView>
      <View style={styles.notificationList}>
        {visible.map((item) => {
          const unread = !readIds.has(item.id);
          return (
            <Pressable key={item.id} onPress={() => setReadIds((current) => new Set(current).add(item.id))} style={[styles.notificationRow, unread && styles.unreadNotification]}>
              <View style={[styles.notificationIcon, item.tone === "blue" ? styles.blueIcon : item.tone === "green" ? styles.greenIcon : styles.greyIcon]}><Bell color={item.tone === "blue" ? colors.interactive.blue : item.tone === "green" ? colors.status.good : colors.text.muted} size={20} /></View>
              <View style={styles.notificationCopy}><View style={styles.notificationTitleRow}><Text style={styles.notificationTitle}>{item.title}</Text>{unread ? <View style={styles.unreadDot} /> : null}</View><Text style={textStyles.body}>{item.body}</Text><Text style={textStyles.meta}>১২ মিনিট আগে</Text></View>
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}

type ChatMessage = { id: string; own: boolean; text: string; time: string };

export function ChatScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const threadId = route.params?.threadId;
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "m1", own: false, text: "মাল লোড হয়েছে। গাড়ি ০৯:৩০-এ বগুড়া ছাড়বে।", time: "০৮:১২" },
    { id: "m2", own: true, text: "ভালো। ওয়েব্রিজ স্লিপ পেলে পাঠাবেন।", time: "০৮:২০ · পঠিত" },
    { id: "m3", own: false, text: "ওয়েব্রিজে ১২০.৪ মণ দেখাচ্ছে।", time: "০৮:৪১" },
  ]);
  const { data: remoteMessages } = useQuery({ enabled: Boolean(threadId && threadId !== "support"), queryFn: () => mobileApi.getMessages(threadId ?? ""), queryKey: ["thread-messages", threadId], refetchInterval: 5_000, retry: false });
  useEffect(() => {
    if (!remoteMessages) return;
    setMessages(remoteMessages.map((message) => ({ id: message.id, own: false, text: message.body, time: new Intl.DateTimeFormat("bn-BD", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(message.createdAt)) })));
  }, [remoteMessages]);
  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: String(Date.now()), own: true, text, time: "এখন" }]);
    setDraft("");
    if (threadId && threadId !== "support") await mobileApi.sendMessage(threadId, text);
  };
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.chatSafeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.chatLayout}>
        <View style={styles.chatHeader}><View style={styles.smallAvatar}><Text style={styles.smallAvatarText}>রট</Text></View><View style={styles.profileCopy}><Text style={styles.notificationTitle}>রফিক ট্রেডার্স</Text><Text style={textStyles.meta}>ক্রেতা · AK-4821</Text></View></View>
        <View style={styles.warningStrip}><ShieldCheck color={colors.status.warnDark} size={16} /><Text style={styles.warningText}>অ্যাপের বাইরে টাকা লেনদেন করবেন না — এসক্রোর সুরক্ষা থাকবে না।</Text></View>
        <ScrollView contentContainerStyle={styles.messages}>
          <Pill label="আজ" />
          {messages.map((message) => <View key={message.id} style={[styles.messageWrap, message.own && styles.ownMessageWrap]}><View style={[styles.bubble, message.own && styles.ownBubble]}><Text style={[styles.bubbleText, message.own && styles.ownBubbleText]}>{message.text}</Text></View><Text style={textStyles.meta}>{message.time}</Text></View>)}
        </ScrollView>
        <View style={styles.composer}><Pressable style={styles.attachment}><Camera color={colors.text.muted} size={20} /></Pressable><TextInput accessibilityLabel="বার্তা লিখুন" onChangeText={setDraft} placeholder="বার্তা লিখুন" placeholderTextColor={colors.text.subtle} style={styles.composerInput} value={draft} /><Pressable accessibilityLabel="পাঠান" onPress={() => void send()} style={styles.send}><Send color={colors.background.surface} size={20} /></Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function OrderTrackingScreen() {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.trackingSafeArea}>
      <View style={styles.trackingHeader}><ScreenTitle bn="অর্ডার AK-4821" en="Order tracking" /></View>
      <ScrollView contentContainerStyle={styles.trackingContent}>
        <Card style={styles.escrowCard}><Text style={styles.escrowLabel}>এসক্রোতে সুরক্ষিত</Text><Money color={colors.background.surface} poisha={14256000} size="display" /><Text style={styles.escrowLabel}>ডেলিভারি নিশ্চিত করার পর কৃষককে দেওয়া হবে।</Text></Card>
        <Card>
          {orderTimeline.map((item, index) => <View key={item.label} style={styles.timelineRow}><View style={styles.timelineRail}><View style={[styles.timelineDot, item.state === "complete" && styles.completeDot, item.state === "current" && styles.currentDot]} />{index < orderTimeline.length - 1 ? <View style={[styles.timelineLine, item.state !== "upcoming" && styles.completeLine]} /> : null}</View><View style={styles.timelineCopy}><Text style={[styles.timelineLabel, item.state === "current" && styles.currentText, item.state === "upcoming" && styles.upcomingText]}>{item.label}</Text><Text style={textStyles.meta}>{item.at} · {item.detail}</Text>{item.state === "current" ? <View style={styles.locationStrip}><View style={styles.locationDot} /><View><Text style={styles.locationTitle}>সরাসরি অবস্থান চালু</Text><Text style={styles.locationMeta}>মির্জাপুর · আনুমানিক পৌঁছাবে ১৪:০০</Text></View></View> : null}</View></View>)}
        </Card>
        <Card style={styles.carrierCard}><View style={styles.carrierIcon}><Text style={styles.carrierGlyph}>কপ</Text></View><View style={styles.profileCopy}><Text style={styles.notificationTitle}>কামাল পরিবহন</Text><Text style={textStyles.meta}>ঢাকা মেট্রো-ট ১১-৮২৮৯</Text></View><Pressable accessibilityLabel="পরিবহনকারীকে কল করুন" style={styles.callButton}><Phone color={colors.background.surface} size={19} /></Pressable></Card>
      </ScrollView>
      <View style={styles.stickyActions}><OutlineButton destructive label="সমস্যা জানান" style={styles.flexButton} /><PrimaryButton label="ডেলিভারি নিশ্চিত" style={styles.flexButton} /></View>
    </SafeAreaView>
  );
}

export function OffersScreen() {
  return <AppScreen><ScreenTitle bn="অফার" en="Offers" /><Card><Text style={textStyles.cardTitle}>রফিক ট্রেডার্স</Text><Text style={textStyles.meta}>আলু · গ্রেড A · ১২০ মণ</Text><View style={styles.offerPrice}><Money poisha={129000} size="small" /><Pill label="দরের উপরে" tone="good" /></View><View style={styles.buttonRow}><PrimaryButton label="গ্রহণ করুন" style={styles.flexButton} /><OutlineButton label="বাতিল" style={styles.flexButton} /></View></Card></AppScreen>;
}

const styles = StyleSheet.create({
  attachment: { alignItems: "center", backgroundColor: colors.background.sunken, borderRadius: radii.control, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  avatar: { alignItems: "center", backgroundColor: colors.brand.soft, borderRadius: radii.pill, height: 72, justifyContent: "center", position: "relative", width: 72 },
  avatarText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.headingSmall },
  blueIcon: { backgroundColor: colors.interactive.blueSoft },
  bubble: { backgroundColor: colors.background.surface, borderColor: colors.border.default, borderRadius: radii.modal, borderWidth: 1, maxWidth: "86%", padding: spacing.x3 },
  bubbleText: { color: colors.text.primary, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body, lineHeight: 22 },
  buttonRow: { flexDirection: "row", gap: spacing.x3, marginTop: spacing.x4 },
  callButton: { alignItems: "center", backgroundColor: colors.brand.primary, borderRadius: radii.control, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  cameraBadge: { alignItems: "center", backgroundColor: colors.text.primary, borderRadius: radii.pill, bottom: -2, height: 26, justifyContent: "center", position: "absolute", right: -2, width: 26 },
  carrierCard: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  carrierGlyph: { color: colors.status.warnDark, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  carrierIcon: { alignItems: "center", backgroundColor: colors.status.warnSoft, borderRadius: radii.control, height: 52, justifyContent: "center", width: 52 },
  chatHeader: { alignItems: "center", backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, flexDirection: "row", gap: spacing.x3, minHeight: 72, paddingHorizontal: spacing.x4 },
  chatLayout: { flex: 1 },
  chatSafeArea: { backgroundColor: colors.background.surface, flex: 1 },
  chipRow: { gap: spacing.x2, paddingHorizontal: spacing.x4 },
  completeDot: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  completeLine: { backgroundColor: colors.brand.primary },
  composer: { alignItems: "center", backgroundColor: colors.background.surface, borderTopColor: colors.border.default, borderTopWidth: 1, flexDirection: "row", gap: spacing.x2, padding: spacing.x3 },
  composerInput: { backgroundColor: colors.background.sunken, borderRadius: radii.control, color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body, minHeight: touchTargets.minimum, paddingHorizontal: spacing.x3 },
  currentDot: { backgroundColor: colors.interactive.blue, borderColor: colors.interactive.blue },
  currentText: { color: colors.interactive.blue },
  flexButton: { flex: 1 },
  greenIcon: { backgroundColor: colors.status.goodSoft },
  greyIcon: { backgroundColor: colors.background.sunken },
  link: { color: colors.interactive.blue, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  kycCapture: { alignItems: "center", backgroundColor: colors.brand.soft, borderColor: colors.brand.primary, borderRadius: radii.control, borderStyle: "dashed", borderWidth: 1, gap: spacing.x1, height: 76, justifyContent: "center", overflow: "hidden", width: 92 },
  kycCaptureText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.eyebrow },
  kycImage: { height: "100%", width: "100%" },
  kycRow: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  kycSuccess: { backgroundColor: colors.status.goodSoft, borderRadius: radii.card, padding: spacing.x4 },
  kycSuccessText: { color: colors.status.good, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.body },
  locationDot: { backgroundColor: colors.interactive.blue, borderRadius: radii.pill, height: 8, marginTop: 6, width: 8 },
  locationMeta: { color: colors.interactive.blue, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  locationStrip: { backgroundColor: colors.interactive.blueSoft, borderRadius: radii.card, flexDirection: "row", gap: spacing.x2, marginTop: spacing.x3, padding: spacing.x3 },
  locationTitle: { color: colors.interactive.blue, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  logout: { alignItems: "center", flexDirection: "row", gap: spacing.x2, justifyContent: "center", minHeight: touchTargets.minimum },
  logoutText: { color: colors.destructive.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.body },
  messageWrap: { alignItems: "flex-start", gap: spacing.x1 },
  messages: { flexGrow: 1, gap: spacing.x4, padding: spacing.x4 },
  noHorizontalPadding: { paddingHorizontal: 0 },
  notificationCopy: { flex: 1, gap: spacing.x1 },
  notificationIcon: { alignItems: "center", borderRadius: radii.card, height: 44, justifyContent: "center", width: 44 },
  notificationList: { marginTop: spacing.x2 },
  notificationRow: { alignItems: "flex-start", borderBottomColor: colors.border.hairline, borderBottomWidth: 1, flexDirection: "row", gap: spacing.x3, padding: spacing.x4 },
  notificationTitle: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  notificationTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  offerPrice: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.x3 },
  ownBubble: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  ownBubbleText: { color: colors.background.surface },
  ownMessageWrap: { alignItems: "flex-end" },
  padded: { paddingHorizontal: spacing.x4 },
  profileCopy: { flex: 1, gap: spacing.x1 },
  profileHeader: { alignItems: "center", backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, flexDirection: "row", gap: spacing.x4, marginHorizontal: -spacing.x4, marginTop: -spacing.x4, padding: spacing.x6 },
  profileName: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardLarge },
  send: { alignItems: "center", backgroundColor: colors.brand.primary, borderRadius: radii.control, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  settingsCard: { padding: 0 },
  smallAvatar: { alignItems: "center", backgroundColor: colors.brand.soft, borderRadius: radii.pill, height: 44, justifyContent: "center", width: 44 },
  smallAvatarText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  stickyActions: { backgroundColor: colors.background.surface, borderTopColor: colors.border.default, borderTopWidth: 1, flexDirection: "row", gap: spacing.x3, padding: spacing.x4 },
  timelineCopy: { flex: 1, minHeight: 84, paddingBottom: spacing.x3 },
  timelineDot: { backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.pill, borderWidth: 2, height: 28, width: 28 },
  timelineLabel: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  timelineLine: { backgroundColor: colors.border.default, flex: 1, width: 2 },
  timelineRail: { alignItems: "center", marginRight: spacing.x3, width: 30 },
  timelineRow: { flexDirection: "row" },
  trackingContent: { gap: spacing.x4, padding: spacing.x4 },
  trackingHeader: { backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, padding: spacing.x4 },
  trackingSafeArea: { backgroundColor: colors.background.page, flex: 1 },
  unreadDot: { backgroundColor: colors.destructive.primary, borderRadius: radii.pill, height: 8, width: 8 },
  unreadNotification: { backgroundColor: colors.brand.soft },
  upcomingText: { color: colors.text.subtle },
  warningStrip: { alignItems: "center", backgroundColor: colors.status.warnSoft, borderBottomColor: colors.status.warn, borderBottomWidth: 1, flexDirection: "row", gap: spacing.x2, paddingHorizontal: spacing.x4, paddingVertical: spacing.x2 },
  warningText: { color: colors.status.warnDark, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  escrowCard: { backgroundColor: colors.brand.primary, gap: spacing.x2 },
  escrowLabel: { color: colors.console.mint, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge },
});
