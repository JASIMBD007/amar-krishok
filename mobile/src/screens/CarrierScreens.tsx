import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { Camera, Circle, MapPin } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";

import { mobileApi } from "../api/services";
import { AppScreen, Card, Divider, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, textStyles } from "../components/ui";
import { pickAndCompressPhoto, type PreparedPhoto } from "../media/images";
import type { RootStackParamList } from "../navigation/types";
import { useForegroundTripLocation } from "../location/useForegroundTripLocation";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";

const trips = [
  { destination: "কারওয়ান বাজার, ঢাকা", earningPoisha: 420000, id: "AK-4821", origin: "শিবগঞ্জ ডিপো, বগুড়া", state: "EN_ROUTE_DELIVERY" },
  { destination: "ঢাকা", earningPoisha: 360000, id: "AK-4818", origin: "নওগাঁ", state: "ACCEPTED" },
  { destination: "চট্টগ্রাম", earningPoisha: 980000, id: "AK-4830", origin: "রংপুর", state: "ACCEPTED" },
] as const;

export function TripsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [online, setOnline] = useState(true);
  const [accepted, setAccepted] = useState(() => new Set<string>());
  useForegroundTripLocation("trip-ak-4818", "EN_ROUTE_DELIVERY");
  return (
    <SafeAreaView edges={["top"]} style={styles.tripsSafe}>
      <ScrollView contentContainerStyle={styles.tripsContent}>
        <View style={styles.darkHeader}>
          <View style={styles.carrierProfile}><View style={styles.carrierAvatar}><Text style={styles.carrierAvatarText}>কপ</Text></View><View style={styles.grow}><Text style={styles.carrierName}>কামাল পরিবহন</Text><Text style={styles.darkMeta}>ঢাকা মেট্রো-ট ১১-৮২৮৯</Text></View><View style={styles.online}><View style={styles.onlineDot} /><Text style={styles.onlineText}>অনলাইন</Text><Switch accessibilityLabel="অনলাইন অবস্থা" onValueChange={setOnline} trackColor={{ false: colors.text.strong, true: colors.console.active }} thumbColor={online ? colors.console.mint : colors.text.subtle} value={online} /></View></View>
          <View style={styles.tripStats}><View style={styles.stat}><Text style={styles.darkMeta}>আজকের ট্রিপ</Text><Text style={styles.statValue}>3</Text></View><View style={styles.stat}><Text style={styles.darkMeta}>মোট দূরত্ব</Text><Text style={styles.statValue}>248 km</Text></View><View style={styles.stat}><Text style={styles.darkMeta}>আজকের আয়</Text><Money color={colors.console.mint} poisha={840000} size="small" /></View></View>
        </View>
        <View style={styles.tripList}>
          <Card style={styles.currentTrip}><View style={styles.currentLabel}><Text style={styles.amberText}>চলমান ট্রিপ</Text><Text style={styles.amberText}>AK-4821</Text></View><View style={styles.locationNotice}><MapPin color={colors.interactive.blue} size={16} /><Text style={styles.locationText}>শুধু চলমান ট্রিপে আপনার অবস্থান শেয়ার হচ্ছে।</Text></View><View style={styles.route}><View style={styles.routeRail}><View style={styles.routeDone} /><View style={styles.routeLine} /><View style={styles.routeOpen} /></View><View style={styles.routeCopy}><Text style={styles.routeTitle}>শিবগঞ্জ ডিপো, বগুড়া</Text><Text style={textStyles.meta}>পিকআপ সম্পন্ন · ০৯:৩০</Text><Text style={[styles.routeTitle, styles.destination]}>কারওয়ান বাজার, ঢাকা</Text><Text style={textStyles.meta}>ডেলিভারি · আনুমানিক ১৪:০০</Text></View></View><Divider /><View style={styles.tagRow}><Pill label="আলু · ১২০ মণ" /><Pill label="১৪৪ কিমি" /><Pill label="৳ 4,200" tone="good" /></View><PrimaryButton label="রুট দেখুন" onPress={() => navigation.navigate("OrderTracking", { orderId: "AK-4821" })} tone="amber" /></Card>
          <Text style={styles.sectionTitle}>পরবর্তী ট্রিপ</Text>
          {trips.slice(1).map((trip) => <Card key={trip.id}><View style={styles.jobTitleRow}><View><Text style={styles.routeTitle}>{trip.origin} → {trip.destination}</Text><Text style={textStyles.meta}>পেঁয়াজ · ৮০ মণ · আগামীকাল ০৭:০০</Text></View><Money poisha={trip.earningPoisha} size="small" /></View><View style={styles.buttonRow}><PrimaryButton label={accepted.has(trip.id) ? "গৃহীত" : "গ্রহণ করুন"} onPress={() => setAccepted((current) => new Set(current).add(trip.id))} style={styles.grow} /><OutlineButton label="বাতিল" style={styles.grow} /></View></Card>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function JobsScreen() {
  const [amounts, setAmounts] = useState<Record<string, string>>({ J1: "4000" });
  const [submitted, setSubmitted] = useState<string | null>(null);
  const jobs = [{ bids: 4, crop: "আলু · ১২০ মণ · আজ ১৬:০০ পিকআপ", from: "বগুড়া", id: "J1", lowest: 390000, suggested: 420000, to: "ঢাকা" }, { bids: 1, crop: "পেঁয়াজ · ৮০ মণ · আগামীকাল ০৬:০০", from: "ফরিদপুর", id: "J2", lowest: 0, suggested: 740000, to: "চট্টগ্রাম" }, { bids: 0, crop: "চাল · ২০০ মণ · শুক্রবার", from: "নাটোর", id: "J3", lowest: 0, suggested: 1120000, to: "সিলেট" }];
  const bid = async (jobId: string) => {
    const amountPoisha = (Number(amounts[jobId]) || 0) * 100;
    await mobileApi.placeBid(jobId, amountPoisha);
    setSubmitted(jobId);
  };
  return <AppScreen contentStyle={styles.flush}><View style={styles.padded}><ScreenTitle bn="খোলা কাজ" en="Open jobs · bid to win" /></View><ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>{["আমার রুটে", "আজ", "১০০ মণ+", "সর্বোচ্চ দাম"].map((item, index) => <Pill active={index === 0} key={item} label={item} />)}</ScrollView><View style={styles.tripList}>{jobs.map((job) => <Card key={job.id}><View style={styles.jobTitleRow}><View style={styles.grow}><Text style={styles.routeTitle}>{job.from} → {job.to}</Text><Text style={textStyles.meta}>{job.crop}</Text></View><View><Text style={textStyles.meta}>প্রস্তাবিত</Text><Money poisha={job.suggested} size="small" /></View></View>{job.bids ? <View style={styles.bidStatus}><Text style={textStyles.meta}>{job.bids} জন দর দিয়েছেন · সর্বনিম্ন </Text><Money poisha={job.lowest} size="small" /></View> : <Text style={textStyles.meta}>কেউ দর দেননি</Text>}<View style={styles.bidRow}><TextInput accessibilityLabel="দরের পরিমাণ" keyboardType="number-pad" onChangeText={(value) => setAmounts((current) => ({ ...current, [job.id]: value.replace(/\D/g, "") }))} placeholder="৳ দর" placeholderTextColor={colors.text.muted} style={styles.bidInput} value={amounts[job.id] ?? ""} /><PrimaryButton label={submitted === job.id ? "দর দেওয়া হয়েছে" : "দর দিন"} onPress={() => void bid(job.id)} style={styles.grow} tone="amber" /></View></Card>)}</View></AppScreen>;
}

function SignaturePad({ onChange }: { onChange: (signature: string) => void }) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => setPoints([{ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }]),
    onPanResponderMove: (event) => setPoints((current) => [...current, { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }]),
    onPanResponderRelease: () => setPoints((current) => { const signature = current.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(" "); onChange(signature); return current; }),
  })).current;
  const serialized = useMemo(() => points.map((point) => `${point.x},${point.y}`).join(" "), [points]);
  return <View accessibilityLabel="কৃষকের স্বাক্ষর" style={styles.signature} {...responder.panHandlers}>{points.length ? <Svg height="100%" width="100%"><Polyline fill="none" points={serialized} stroke={colors.text.primary} strokeWidth="2" /></Svg> : <Text style={styles.signatureHint}>এখানে স্বাক্ষর করুন</Text>}</View>;
}

export function PickupProofScreen() {
  const [weight, setWeight] = useState("120.4");
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const addPhoto = async () => { const photo = await pickAndCompressPhoto(); if (photo) setPhotos((current) => [...current, photo].slice(0, 4)); };
  const submit = async () => {
    setLoading(true);
    try {
      await mobileApi.submitPickupProof({ photos, signature, tripId: "AK-4821", weightMon: Number(weight) });
      setComplete(true);
    } finally { setLoading(false); }
  };
  return <SafeAreaView edges={["top", "bottom"]} style={styles.proofSafe}><View style={styles.proofHeader}><ScreenTitle bn="পিকআপ প্রমাণ" en="Pickup proof · AK-4821" /></View><ScrollView contentContainerStyle={styles.proofContent}><Card><Text style={styles.sectionTitle}>ওজন নিশ্চিত করুন</Text><View style={styles.weightRow}><View><Text style={textStyles.meta}>অর্ডারে</Text><Text style={styles.weightText}>120.0 মণ</Text></View><View><Text style={textStyles.meta}>ওয়েব্রিজে</Text><TextInput accessibilityLabel="ওয়েব্রিজের ওজন" keyboardType="decimal-pad" onChangeText={setWeight} style={styles.weightInput} value={weight} /></View></View><View style={styles.goodStrip}><Text style={styles.goodText}>০.৩% পার্থক্য — গ্রহণযোগ্য সীমার মধ্যে</Text></View></Card><Card><View style={styles.jobTitleRow}><Text style={styles.sectionTitle}>ছবি</Text><Text style={textStyles.meta}>{photos.length} / 4</Text></View><View style={styles.photoRow}>{photos.map((photo) => <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.proofPhoto} />)}<Pressable onPress={() => void addPhoto()} style={styles.photoButton}><Camera color={colors.status.warn} size={24} /><Text style={styles.amberText}>ছবি তুলুন</Text></Pressable></View><Text style={textStyles.meta}>বস্তা, ওয়েব্রিজ স্লিপ এবং গাড়ির নম্বর প্লেট — অন্তত একটি করে।</Text></Card><Card><Text style={styles.sectionTitle}>কৃষকের স্বাক্ষর</Text><SignaturePad onChange={setSignature} /></Card>{complete ? <View style={styles.goodStrip}><Text style={styles.goodText}>পিকআপ প্রমাণ সফলভাবে জমা হয়েছে।</Text></View> : null}</ScrollView><View style={styles.proofAction}><PrimaryButton disabled={!photos.length || !signature || !weight} label="পিকআপ সম্পন্ন করুন" loading={loading} onPress={() => void submit()} tone="amber" /><Text style={styles.proofFootnote}>সাবমিট করলে ক্রেতা ও কৃষক দুজনেই SMS পাবেন।</Text></View></SafeAreaView>;
}

export function EarningsScreen() {
  const [loading, setLoading] = useState(false);
  const withdraw = async () => { setLoading(true); try { await mobileApi.withdrawCarrierEarnings(2460000); } finally { setLoading(false); } };
  return <AppScreen><ScreenTitle bn="আয়" en="Earnings" /><Card style={styles.wallet}><Text style={styles.darkMeta}>উত্তোলনযোগ্য</Text><Money color={colors.background.surface} poisha={2460000} size="display" /><Divider /><View style={styles.walletStats}><View><Text style={styles.darkMeta}>এ সপ্তাহে</Text><Money color={colors.background.surface} poisha={3820000} size="small" /></View><View><Text style={styles.darkMeta}>অপেক্ষমাণ</Text><Money color={colors.status.warnSoft} poisha={420000} size="small" /></View></View><PrimaryButton label="উত্তোলন করুন" loading={loading} onPress={() => void withdraw()} tone="dark" /></Card><Card><View style={styles.paymentRow}><View style={styles.bkash}><Text style={styles.bkashText}>bK</Text></View><View style={styles.grow}><Text style={styles.routeTitle}>বিকাশ · 01711 ••• 442</Text><Text style={textStyles.meta}>ডিফল্ট অ্যাকাউন্ট</Text></View><Text style={styles.blueText}>বদলান</Text></View></Card><Text style={styles.sectionTitle}>সাম্প্রতিক</Text>{[{ amount: 420000, label: "AK-4818 · বগুড়া → ঢাকা", tone: "good" }, { amount: -1800000, label: "বিকাশে উত্তোলন", tone: "neutral" }, { amount: 420000, label: "AK-4821 · চলমান", tone: "warn" }].map((entry) => <Card key={entry.label}><View style={styles.paymentRow}><Circle color={entry.tone === "good" ? colors.status.good : entry.tone === "warn" ? colors.status.warn : colors.text.subtle} fill={entry.tone === "good" ? colors.status.goodSoft : entry.tone === "warn" ? colors.status.warnSoft : colors.background.sunken} size={40} /><View style={styles.grow}><Text style={styles.routeTitle}>{entry.label}</Text><Text style={textStyles.meta}>গতকাল ১৮:৪১</Text></View><Money color={entry.amount > 0 ? colors.status.good : colors.text.primary} poisha={entry.amount} size="small" /></View></Card>)}</AppScreen>;
}

const styles = StyleSheet.create({
  amberText: { color: colors.status.warnDark, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  bidInput: { borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, color: colors.text.primary, flex: 1, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.bodyLarge, minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4 },
  bidRow: { flexDirection: "row", gap: spacing.x3, marginTop: spacing.x3 },
  bidStatus: { backgroundColor: colors.background.sunken, borderRadius: radii.control, flexDirection: "row", marginTop: spacing.x3, padding: spacing.x3 },
  bkash: { alignItems: "center", backgroundColor: colors.destructive.soft, borderRadius: radii.control, height: 44, justifyContent: "center", width: 44 },
  bkashText: { color: colors.destructive.primary, fontFamily: fontFamilies.ui.bold, fontSize: fontSizes.body },
  blueText: { color: colors.interactive.blue, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  buttonRow: { flexDirection: "row", gap: spacing.x3, marginTop: spacing.x4 },
  carrierAvatar: { alignItems: "center", backgroundColor: colors.status.warnSoft, borderRadius: radii.pill, height: 48, justifyContent: "center", width: 48 },
  carrierAvatarText: { color: colors.status.warnDark, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.body },
  carrierName: { color: colors.background.surface, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.card },
  carrierProfile: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  chips: { gap: spacing.x2, paddingHorizontal: spacing.x4 },
  currentLabel: { flexDirection: "row", justifyContent: "space-between" },
  currentTrip: { borderColor: colors.status.warn, borderWidth: 2, gap: spacing.x3 },
  darkHeader: { backgroundColor: colors.text.primary, gap: spacing.x4, padding: spacing.x4 },
  darkMeta: { color: colors.text.subtle, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  destination: { marginTop: spacing.x4 },
  flush: { paddingHorizontal: 0 },
  goodStrip: { backgroundColor: colors.status.goodSoft, borderRadius: radii.control, marginTop: spacing.x3, padding: spacing.x3 },
  goodText: { color: colors.status.good, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  grow: { flex: 1 },
  jobTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.x3, justifyContent: "space-between" },
  locationNotice: { alignItems: "center", backgroundColor: colors.interactive.blueSoft, borderRadius: radii.control, flexDirection: "row", gap: spacing.x2, padding: spacing.x2 },
  locationText: { color: colors.interactive.blue, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  online: { alignItems: "center", backgroundColor: colors.console.active, borderRadius: radii.pill, flexDirection: "row", gap: spacing.x1, paddingLeft: spacing.x3 },
  onlineDot: { backgroundColor: colors.console.mint, borderRadius: radii.pill, height: 8, width: 8 },
  onlineText: { color: colors.console.mint, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  padded: { paddingHorizontal: spacing.x4 },
  paymentRow: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  photoButton: { alignItems: "center", backgroundColor: colors.status.warnSoft, borderColor: colors.status.warn, borderRadius: radii.card, borderStyle: "dashed", borderWidth: 1, height: 104, justifyContent: "center", width: 104 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x2 },
  proofAction: { backgroundColor: colors.background.surface, borderTopColor: colors.border.default, borderTopWidth: 1, gap: spacing.x2, padding: spacing.x4 },
  proofContent: { gap: spacing.x4, padding: spacing.x4 },
  proofFootnote: { color: colors.text.muted, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.eyebrow, textAlign: "center" },
  proofHeader: { backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, padding: spacing.x4 },
  proofPhoto: { borderRadius: radii.card, height: 104, width: 104 },
  proofSafe: { backgroundColor: colors.background.page, flex: 1 },
  route: { flexDirection: "row" },
  routeCopy: { flex: 1 },
  routeDone: { backgroundColor: colors.brand.primary, borderRadius: radii.pill, height: 12, width: 12 },
  routeLine: { backgroundColor: colors.border.default, flex: 1, width: 2 },
  routeOpen: { backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.pill, borderWidth: 2, height: 12, width: 12 },
  routeRail: { alignItems: "center", marginRight: spacing.x3, width: 16 },
  routeTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  sectionTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  signature: { alignItems: "center", backgroundColor: colors.background.page, borderColor: colors.border.strong, borderRadius: radii.card, borderStyle: "dashed", borderWidth: 1, height: 132, justifyContent: "center" },
  signatureHint: { color: colors.text.subtle, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body },
  stat: { backgroundColor: colors.console.raised, borderRadius: radii.card, flex: 1, gap: spacing.x1, padding: spacing.x3 },
  statValue: { color: colors.background.surface, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.cardSmall },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x2 },
  tripList: { gap: spacing.x4, padding: spacing.x4 },
  tripStats: { flexDirection: "row", gap: spacing.x2 },
  tripsContent: { flexGrow: 1 },
  tripsSafe: { backgroundColor: colors.text.primary, flex: 1 },
  wallet: { backgroundColor: colors.text.primary, gap: spacing.x4 },
  walletStats: { flexDirection: "row", justifyContent: "space-between" },
  weightInput: { color: colors.text.primary, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.headingSmall, minHeight: touchTargets.minimum, padding: 0 },
  weightRow: { flexDirection: "row", justifyContent: "space-between" },
  weightText: { color: colors.text.muted, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.cardLarge },
});
