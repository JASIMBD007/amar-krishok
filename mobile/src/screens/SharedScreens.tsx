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
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "../auth/SessionProvider";
import { AppScreen, Card, Divider, Field, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, SettingRow, textStyles } from "../components/ui";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";
import { pickAndCompressPhoto, type PreparedPhoto } from "../media/images";
import { mobileApi } from "../api/services";
import { useLocaleSettings } from "../i18n/LocaleSettingsProvider";
import { ApiError } from "../api/errors";

function apiError(error: unknown) {
  return error instanceof ApiError ? error.messageBn : "অনুরোধটি সম্পন্ন করা যায়নি।";
}

const notificationCategories = [{ key: "ORDER", label: "অর্ডার" }, { key: "PAYOUT", label: "পেমেন্ট" }, { key: "RATE", label: "দর" }, { key: "SYSTEM", label: "সিস্টেম" }] as const;

export function ProfileScreen() {
  const { logout, refreshUser, user } = useSession();
  const { showEnglishGloss, toggleEnglishGloss } = useLocaleSettings();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<"personal" | "payout" | "prefs" | "pin" | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [district, setDistrict] = useState(user?.district ?? "");
  const [method, setMethod] = useState<"BKASH" | "NAGAD" | "BANK">("BKASH");
  const [accountNo, setAccountNo] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data: payout } = useQuery({ queryFn: mobileApi.getPayoutAccount, queryKey: ["payout-account"] });
  const { data: prefs } = useQuery({ enabled: panel === "prefs", queryFn: mobileApi.getNotificationPrefs, queryKey: ["notification-prefs"] });
  useEffect(() => { if (payout) { setAccountNo(payout.accountNo); setMethod(payout.method); } }, [payout]);
  if (!user) return null;
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      if (panel === "personal") { await mobileApi.updateProfile({ district, name }); await refreshUser(); }
      if (panel === "payout") { await mobileApi.setPayoutAccount(accountNo, method); await queryClient.invalidateQueries({ queryKey: ["payout-account"] }); }
      if (panel === "pin") { await mobileApi.updatePin(currentPin, newPin); setCurrentPin(""); setNewPin(""); }
      setMessage("পরিবর্তন সংরক্ষিত হয়েছে।");
    } catch (error) { setMessage(apiError(error)); } finally { setSaving(false); }
  };
  const updatePref = async (key: "appAll" | "smsOrders" | "smsRates" | "weeklyDigest", value: boolean) => {
    await mobileApi.updateNotificationPrefs({ [key]: value });
    await queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
  };
  return (
    <AppScreen>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text><View style={styles.cameraBadge}><Camera color={colors.background.surface} size={14} /></View></View>
        <View style={styles.profileCopy}><Text style={styles.profileName}>{user.name}</Text><Text style={textStyles.meta}>{user.role === "FARMER" ? "কৃষক" : user.role === "BUYER" ? "ক্রেতা" : "পরিবহন অংশীদার"} · {user.district}</Text><Pill label={user.verified ? "যাচাইকৃত" : "যাচাই বাকি"} tone={user.verified ? "good" : "warn"} /></View>
      </View>
      <Card style={styles.settingsCard}>
        <SettingRow icon={UserRound} label="ব্যক্তিগত তথ্য" onPress={() => setPanel(panel === "personal" ? null : "personal")} />
        <Divider />
        <SettingRow icon={FileBadge} label="এনআইডি ও জমির দলিল" meta={user.verified ? "যাচাই সম্পন্ন" : "নথি জমা দিন"} onPress={() => navigation.navigate("Kyc")} />
        <Divider />
        <SettingRow icon={CircleDollarSign} label="পেমেন্ট অ্যাকাউন্ট" meta={payout ? `${payout.method} · ${payout.accountNo}` : "অ্যাকাউন্ট যোগ করুন"} onPress={() => setPanel(panel === "payout" ? null : "payout")} />
      </Card>
      <Card style={styles.settingsCard}>
        <SettingRow icon={Globe2} label="ভাষা" meta={showEnglishGloss ? "বাংলা · English gloss চালু" : "বাংলা"} onPress={toggleEnglishGloss} />
        <Divider />
        <SettingRow icon={Bell} label="বিজ্ঞপ্তি ও SMS" onPress={() => setPanel(panel === "prefs" ? null : "prefs")} />
        <Divider />
        <SettingRow icon={LockKeyhole} label="পিন ও নিরাপত্তা" onPress={() => setPanel(panel === "pin" ? null : "pin")} />
      </Card>
      {panel === "personal" ? <Card><Text style={styles.panelTitle}>ব্যক্তিগত তথ্য</Text><Field label="নাম" onChangeText={setName} value={name} /><Field label="জেলা" onChangeText={setDistrict} value={district} /><PrimaryButton disabled={!name.trim() || !district.trim()} label="সংরক্ষণ করুন" loading={saving} onPress={() => void save()} /></Card> : null}
      {panel === "payout" ? <Card><Text style={styles.panelTitle}>পেমেন্ট অ্যাকাউন্ট</Text><View style={styles.methodRow}>{(["BKASH", "NAGAD", "BANK"] as const).map((item) => <Pressable key={item} onPress={() => setMethod(item)}><Pill active={method === item} label={item === "BKASH" ? "বিকাশ" : item === "NAGAD" ? "নগদ" : "ব্যাংক"} /></Pressable>)}</View><Field keyboardType="phone-pad" label="অ্যাকাউন্ট নম্বর" onChangeText={setAccountNo} value={accountNo} /><PrimaryButton disabled={!accountNo.trim()} label="সংরক্ষণ করুন" loading={saving} onPress={() => void save()} /></Card> : null}
      {panel === "prefs" && prefs ? <Card><Text style={styles.panelTitle}>বিজ্ঞপ্তি ও SMS</Text><OutlineButton label="সব বিজ্ঞপ্তি দেখুন" onPress={() => navigation.navigate("Notifications")} />{([{ key: "appAll", label: "অ্যাপ বিজ্ঞপ্তি" }, { key: "smsOrders", label: "অর্ডার SMS" }, { key: "smsRates", label: "দরের SMS" }, { key: "weeklyDigest", label: "সাপ্তাহিক সারাংশ" }] as const).map((item) => <View key={item.key} style={styles.switchRow}><Text style={styles.switchLabel}>{item.label}</Text><Switch accessibilityLabel={item.label} onValueChange={(value) => void updatePref(item.key, value)} trackColor={{ false: colors.border.strong, true: colors.brand.primary }} value={prefs[item.key]} /></View>)}</Card> : null}
      {panel === "pin" ? <Card><Text style={styles.panelTitle}>পিন ও নিরাপত্তা</Text><Field keyboardType="number-pad" label="বর্তমান 4 সংখ্যার পিন" onChangeText={setCurrentPin} secureTextEntry value={currentPin} /><Field keyboardType="number-pad" label="নতুন 4 সংখ্যার পিন" onChangeText={setNewPin} secureTextEntry value={newPin} /><PrimaryButton disabled={!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)} label="পিন পরিবর্তন করুন" loading={saving} onPress={() => void save()} /></Card> : null}
      {message ? <Text accessibilityRole="alert" style={message.includes("সংরক্ষিত") ? styles.successText : styles.errorText}>{message}</Text> : null}
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
      await Promise.all(Object.entries(documents).map(([kind, photo]) => mobileApi.uploadKycDocument(kind as KycKind, photo)));
      setSubmitted(true);
    } finally { setSubmitting(false); }
  };
  return <AppScreen><ScreenTitle bn="পরিচয় যাচাই" en="Profile & KYC" /><Text style={textStyles.body}>পরিষ্কার ছবি দিন। তথ্য শুধু যাচাইয়ের কাজে ব্যবহার করা হবে।</Text>{([{ kind: "NID_FRONT", label: "এনআইডির সামনের দিক" }, { kind: "NID_BACK", label: "এনআইডির পেছনের দিক" }, { kind: "LAND", label: "জমির দলিল" }] as const).map((item) => <Card key={item.kind}><View style={styles.kycRow}><View style={styles.profileCopy}><Text style={styles.notificationTitle}>{item.label}</Text><Text style={textStyles.meta}>ছবি 500 KB-এর নিচে থাকবে</Text></View><Pressable onPress={() => void capture(item.kind)} style={styles.kycCapture}>{documents[item.kind] ? <Image source={{ uri: documents[item.kind]?.uri }} style={styles.kycImage} /> : <><Camera color={colors.brand.primary} size={22} /><Text style={styles.kycCaptureText}>ছবি দিন</Text></>}</Pressable></View></Card>)}{submitted ? <View style={styles.kycSuccess}><Text style={styles.kycSuccessText}>নথি যাচাইয়ের জন্য জমা হয়েছে।</Text></View> : null}<PrimaryButton disabled={Object.keys(documents).length < 2} label="যাচাইয়ের জন্য জমা দিন" loading={submitting} onPress={() => void submit()} /></AppScreen>;
}

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<"ORDER" | "PAYOUT" | "RATE" | "SYSTEM">("ORDER");
  const { data: notifications = [], error } = useQuery({ queryFn: () => mobileApi.getNotifications(), queryKey: ["notifications"] });
  const visible = useMemo(() => notifications.filter((item) => item.category === category), [category, notifications]);
  const unreadByCategory = useMemo(() => new Map(notificationCategories.map((item) => [item.key, notifications.filter((notification) => notification.category === item.key && !notification.readAt).length])), [notifications]);
  const markAll = async () => { await mobileApi.markAllNotificationsRead(); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); };
  const markOne = async (id: string) => { await mobileApi.markNotificationRead(id); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); };
  return (
    <AppScreen contentStyle={styles.noHorizontalPadding}>
      <View style={styles.padded}><ScreenTitle bn="বিজ্ঞপ্তি" en="Notifications" right={<Pressable accessibilityRole="button" onPress={() => void markAll()}><Text style={styles.link}>সব পড়ুন</Text></Pressable>} /></View>
      <ScrollView contentContainerStyle={styles.chipRow} horizontal showsHorizontalScrollIndicator={false}>
        {notificationCategories.map((item) => { const unread = unreadByCategory.get(item.key) ?? 0; return <Pressable key={item.key} onPress={() => setCategory(item.key)}><Pill active={category === item.key} label={`${item.label}${unread ? ` · ${unread}` : ""}`} /></Pressable>; })}
      </ScrollView>
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{apiError(error)}</Text> : null}
      <View style={styles.notificationList}>
        {visible.map((item) => {
          const unread = !item.readAt;
          return (
            <Pressable key={item.id} onPress={() => void markOne(item.id)} style={[styles.notificationRow, unread && styles.unreadNotification]}>
              <View style={[styles.notificationIcon, item.tone === "blue" ? styles.blueIcon : item.tone === "green" ? styles.greenIcon : styles.greyIcon]}><Bell color={item.tone === "blue" ? colors.interactive.blue : item.tone === "green" ? colors.status.good : colors.text.muted} size={20} /></View>
              <View style={styles.notificationCopy}><View style={styles.notificationTitleRow}><Text style={styles.notificationTitle}>{item.title}</Text>{unread ? <View style={styles.unreadDot} /> : null}</View><Text style={textStyles.body}>{item.body}</Text><Text style={textStyles.meta}>{new Intl.DateTimeFormat("en-GB", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short", timeZone: "Asia/Dhaka" }).format(new Date(item.sentAt))}</Text></View>
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}

type ChatMessage = { id: string; own: boolean; text: string; time: string };

export function ChatScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useSession();
  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const threadId = route.params?.threadId;
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { data: threads = [] } = useQuery({ queryFn: mobileApi.getThreads, queryKey: ["threads"], refetchInterval: 15_000 });
  const selectedThreadId = threadId === "support" ? threads.find((thread) => thread.kind === "SUPPORT")?.id : threadId;
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId);
  const { data: remoteMessages } = useQuery({ enabled: Boolean(selectedThreadId), queryFn: () => mobileApi.getMessages(selectedThreadId ?? ""), queryKey: ["thread-messages", selectedThreadId], refetchInterval: 5_000, retry: false });
  useEffect(() => {
    if (!remoteMessages) return;
    setMessages(remoteMessages.map((message) => ({ id: message.id, own: message.authorId === user?.id, text: message.body, time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(message.createdAt)) })));
  }, [remoteMessages, user?.id]);
  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: String(Date.now()), own: true, text, time: "এখন" }]);
    setDraft("");
    if (selectedThreadId) await mobileApi.sendMessage(selectedThreadId, text);
  };
  if (!selectedThreadId) {
    return <AppScreen><ScreenTitle bn="বার্তা" />{threads.length === 0 ? <Text style={textStyles.body}>এখন কোনো বার্তার থ্রেড নেই। অর্ডার বা সহায়তা থেকে নতুন কথোপকথন শুরু হবে।</Text> : threads.map((thread) => <Pressable accessibilityRole="button" key={thread.id} onPress={() => navigation.navigate("Chat", { threadId: thread.id })}><Card><Text style={styles.notificationTitle}>{thread.subject}</Text><Text style={textStyles.meta}>{thread.messages[0]?.body ?? "নতুন কথোপকথন"}</Text></Card></Pressable>)}</AppScreen>;
  }
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.chatSafeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.chatLayout}>
        <View style={styles.chatHeader}><View style={styles.smallAvatar}><Text style={styles.smallAvatarText}>ব</Text></View><View style={styles.profileCopy}><Text style={styles.notificationTitle}>{selectedThread?.subject ?? "বার্তা"}</Text><Text style={textStyles.meta}>{selectedThread?.kind === "SUPPORT" ? "আমার কৃষক সহায়তা" : "অর্ডার কথোপকথন"}</Text></View></View>
        <View style={styles.warningStrip}><ShieldCheck color={colors.status.warnDark} size={16} /><Text style={styles.warningText}>অ্যাপের বাইরে টাকা লেনদেন করবেন না — এসক্রোর সুরক্ষা থাকবে না।</Text></View>
        <ScrollView contentContainerStyle={styles.messages}>
          <Pill label="আজ" />
          {messages.map((message) => <View key={message.id} style={[styles.messageWrap, message.own && styles.ownMessageWrap]}><View style={[styles.bubble, message.own && styles.ownBubble]}><Text style={[styles.bubbleText, message.own && styles.ownBubbleText]}>{message.text}</Text></View><Text style={textStyles.meta}>{message.time}</Text></View>)}
        </ScrollView>
        <View style={styles.composer}><TextInput accessibilityLabel="বার্তা লিখুন" onChangeText={setDraft} placeholder="বার্তা লিখুন" placeholderTextColor={colors.text.subtle} style={styles.composerInput} value={draft} /><Pressable accessibilityLabel="পাঠান" onPress={() => void send()} style={styles.send}><Send color={colors.background.surface} size={20} /></Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function OrderTrackingScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "OrderTracking">>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: orders = [] } = useQuery({ enabled: !route.params?.orderId, queryFn: mobileApi.getOrders, queryKey: ["orders"] });
  const orderId = route.params?.orderId ?? orders[0]?.id;
  const { data: order, error } = useQuery({ enabled: Boolean(orderId), queryFn: () => mobileApi.getOrder(orderId ?? ""), queryKey: ["order", orderId], refetchInterval: 15_000 });
  const [disputeMode, setDisputeMode] = useState(false);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const action = async (kind: "confirm" | "dispute") => {
    if (!order) return;
    setLoading(true);
    try {
      if (kind === "confirm") await mobileApi.confirmDelivery(order.id); else await mobileApi.createDispute(order.id, subject);
      setDisputeMode(false); setSubject("");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["order", order.id] }), queryClient.invalidateQueries({ queryKey: ["orders"] })]);
    } finally { setLoading(false); }
  };
  if (error) return <AppScreen><Text accessibilityRole="alert" style={styles.errorText}>{apiError(error)}</Text></AppScreen>;
  if (!order) return <AppScreen><Text style={textStyles.body}>অর্ডার লোড হচ্ছে…</Text></AppScreen>;
  const stages = [{ key: "PLACED", label: "অর্ডার হয়েছে" }, { key: "ACCEPTED", label: "কৃষক গ্রহণ করেছেন" }, { key: "PICKED_UP", label: "পিকআপ হয়েছে" }, { key: "DELIVERED", label: "ডেলিভারি হয়েছে" }, { key: "PAID", label: "পেমেন্ট ছাড়া হয়েছে" }];
  const stageIndex = Math.max(0, stages.findIndex((item) => item.key === order.stage));
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.trackingSafeArea}>
      <View style={styles.trackingHeader}><ScreenTitle bn={`অর্ডার ${order.code}`} en="Order tracking" /></View>
      <ScrollView contentContainerStyle={styles.trackingContent}>
        <Card style={styles.escrowCard}><Text style={styles.escrowLabel}>{order.escrow?.state === "FROZEN" ? "বিরোধ নিষ্পত্তি পর্যন্ত স্থগিত" : order.escrow?.state === "RELEASED" ? "কৃষককে পরিশোধ হয়েছে" : "এসক্রোতে সুরক্ষিত"}</Text><Money color={colors.background.surface} poisha={order.escrow?.amount ?? order.total} size="display" /><Text style={styles.escrowLabel}>টাকার অবস্থা সার্ভার থেকে সরাসরি দেখানো হচ্ছে।</Text></Card>
        <Card>
          {stages.map((item, index) => { const state = index < stageIndex ? "complete" : index === stageIndex ? "current" : "upcoming"; return <View key={item.key} style={styles.timelineRow}><View style={styles.timelineRail}><View style={[styles.timelineDot, state === "complete" && styles.completeDot, state === "current" && styles.currentDot]} />{index < stages.length - 1 ? <View style={[styles.timelineLine, state !== "upcoming" && styles.completeLine]} /> : null}</View><View style={styles.timelineCopy}><Text style={[styles.timelineLabel, state === "current" && styles.currentText, state === "upcoming" && styles.upcomingText]}>{item.label}</Text><Text style={textStyles.meta}>{state === "complete" ? "সম্পন্ন" : state === "current" ? "বর্তমান অবস্থা" : "অপেক্ষমাণ"}</Text>{state === "current" && order.trip && (order.trip.state === "EN_ROUTE_PICKUP" || order.trip.state === "EN_ROUTE_DELIVERY") ? <View style={styles.locationStrip}><View style={styles.locationDot} /><View><Text style={styles.locationTitle}>সরাসরি অবস্থান চালু</Text><Text style={styles.locationMeta}>সর্বশেষ অবস্থান: {order.trip.locationAt ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(order.trip.locationAt)) : "অপেক্ষমাণ"}</Text></View></View> : null}</View></View>; })}
        </Card>
        {order.trip?.carrier ? <Card style={styles.carrierCard}><View style={styles.carrierIcon}><Text style={styles.carrierGlyph}>প</Text></View><View style={styles.profileCopy}><Text style={styles.notificationTitle}>{order.trip.carrier.companyName}</Text><Text style={textStyles.meta}>{order.trip.carrier.vehicleReg}</Text></View><View style={styles.callButton}><Phone color={colors.background.surface} size={19} /></View></Card> : null}
        {disputeMode ? <Card><Text style={styles.notificationTitle}>সমস্যার সংক্ষিপ্ত বিবরণ</Text><TextInput accessibilityLabel="সমস্যার বিবরণ" multiline onChangeText={setSubject} placeholder="যেমন: ওজন বা মান নিয়ে সমস্যা" placeholderTextColor={colors.text.subtle} style={styles.disputeInput} value={subject} /><View style={styles.buttonRow}><OutlineButton label="বাতিল" onPress={() => setDisputeMode(false)} style={styles.flexButton} /><PrimaryButton disabled={!subject.trim()} label="জমা দিন" loading={loading} onPress={() => void action("dispute")} style={styles.flexButton} tone="red" /></View></Card> : null}
      </ScrollView>
      {user?.role === "BUYER" && order.stage !== "PAID" && order.stage !== "REFUNDED" ? <View style={styles.stickyActions}><OutlineButton destructive label="সমস্যা জানান" onPress={() => setDisputeMode(true)} style={styles.flexButton} /><PrimaryButton disabled={order.stage !== "DELIVERED" || order.escrow?.state === "FROZEN"} label="ডেলিভারি নিশ্চিত" loading={loading} onPress={() => void action("confirm")} style={styles.flexButton} /></View> : null}
    </SafeAreaView>
  );
}

export function OffersScreen() {
  const queryClient = useQueryClient();
  const { data: offers = [] } = useQuery({ queryFn: mobileApi.getOffers, queryKey: ["farmer-offers"] });
  const respond = async (id: string, accept: boolean) => { if (accept) await mobileApi.acceptOffer(id); else await mobileApi.declineOffer(id); await queryClient.invalidateQueries({ queryKey: ["farmer-offers"] }); };
  const open = offers.filter((offer) => offer.status === "OPEN");
  return <AppScreen><ScreenTitle bn="অফার" en="Offers" />{open.length === 0 ? <Text style={textStyles.body}>এখন কোনো নতুন অফার নেই।</Text> : open.map((offer) => <Card key={offer.id}><Text style={textStyles.cardTitle}>{offer.buyer.name}</Text><Text style={textStyles.meta}>{offer.listing.crop.nameBn} · গ্রেড {offer.listing.grade} · {offer.quantity} মণ</Text><View style={styles.offerPrice}><Money poisha={offer.price} size="small" /><Pill label="নতুন দর" tone="good" /></View><View style={styles.buttonRow}><PrimaryButton label="গ্রহণ করুন" onPress={() => void respond(offer.id, true)} style={styles.flexButton} /><OutlineButton label="বাতিল" onPress={() => void respond(offer.id, false)} style={styles.flexButton} /></View></Card>)}</AppScreen>;
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
  disputeInput: { backgroundColor: colors.background.sunken, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, color: colors.text.primary, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body, marginTop: spacing.x3, minHeight: 92, padding: spacing.x3, textAlignVertical: "top" },
  errorText: { backgroundColor: colors.destructive.soft, borderRadius: radii.card, color: colors.destructive.primary, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, margin: spacing.x4, padding: spacing.x3 },
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
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x2, marginBottom: spacing.x3 },
  messages: { flexGrow: 1, gap: spacing.x4, padding: spacing.x4 },
  noHorizontalPadding: { paddingHorizontal: 0 },
  notificationCopy: { flex: 1, gap: spacing.x1 },
  notificationIcon: { alignItems: "center", borderRadius: radii.card, height: 44, justifyContent: "center", width: 44 },
  notificationList: { marginTop: spacing.x2 },
  notificationRow: { alignItems: "flex-start", borderBottomColor: colors.border.hairline, borderBottomWidth: 1, flexDirection: "row", gap: spacing.x3, padding: spacing.x4 },
  notificationTitle: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  notificationTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  offerPrice: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.x3 },
  panelTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall, marginBottom: spacing.x3 },
  ownBubble: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  ownBubbleText: { color: colors.background.surface },
  ownMessageWrap: { alignItems: "flex-end" },
  padded: { paddingHorizontal: spacing.x4 },
  profileCopy: { flex: 1, gap: spacing.x1 },
  profileHeader: { alignItems: "center", backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, flexDirection: "row", gap: spacing.x4, marginHorizontal: -spacing.x4, marginTop: -spacing.x4, padding: spacing.x6 },
  profileName: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardLarge },
  send: { alignItems: "center", backgroundColor: colors.brand.primary, borderRadius: radii.control, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  settingsCard: { padding: 0 },
  successText: { backgroundColor: colors.status.goodSoft, borderRadius: radii.card, color: colors.status.good, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, padding: spacing.x3 },
  switchLabel: { color: colors.text.body, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body },
  switchRow: { alignItems: "center", borderBottomColor: colors.border.hairline, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: touchTargets.minimum, paddingVertical: spacing.x2 },
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
