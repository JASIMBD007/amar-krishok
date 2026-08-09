import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Camera, Circle, MapPin } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";

import { mobileApi } from "../api/services";
import { ApiError } from "../api/errors";
import { useSession } from "../auth/SessionProvider";
import { AppScreen, Card, Divider, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, textStyles } from "../components/ui";
import { pickAndCompressPhoto, type PreparedPhoto } from "../media/images";
import type { RootStackParamList } from "../navigation/types";
import { useForegroundTripLocation } from "../location/useForegroundTripLocation";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";

export function TripsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useSession();
  const [online, setOnline] = useState(user?.carrier?.online ?? false);
  const queryClient = useQueryClient();
  const { data: trips = [], isLoading } = useQuery({ queryFn: mobileApi.getTrips, queryKey: ["carrier-trips"], refetchInterval: 30_000 });
  const { data: earnings } = useQuery({ queryFn: mobileApi.getCarrierEarnings, queryKey: ["carrier-earnings"] });
  const active = trips.find((trip) => trip.state === "EN_ROUTE_PICKUP" || trip.state === "EN_ROUTE_DELIVERY" || trip.state === "PICKED_UP") ?? trips[0];
  useForegroundTripLocation(active?.id ?? "", active?.state ?? "CANCELLED");
  const setAvailability = async (value: boolean) => { setOnline(value); try { await mobileApi.setCarrierOnline(value); } catch { setOnline(!value); } };
  const tripAction = async (tripId: string, action: "accept" | "decline" | "start") => {
    if (action === "accept") await mobileApi.acceptTrip(tripId);
    if (action === "decline") await mobileApi.declineTrip(tripId);
    if (action === "start") await mobileApi.startTrip(tripId);
    await queryClient.invalidateQueries({ queryKey: ["carrier-trips"] });
  };
  const stops = active?.stops ?? [];
  const pickup = stops.find((stop) => stop.kind === "PICKUP");
  const delivery = stops.find((stop) => stop.kind === "DELIVERY");
  const carrierName = user?.carrier?.companyName ?? user?.name ?? "পরিবহন অংশীদার";
  const carrierMeta = user?.carrier?.vehicleReg ?? user?.district ?? "";
  const carrierInitials = carrierName.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return (
    <SafeAreaView edges={["top"]} style={styles.tripsSafe}>
      <ScrollView contentContainerStyle={styles.tripsContent}>
        <View style={styles.darkHeader}>
          <View style={styles.carrierProfile}><View style={styles.carrierAvatar}><Text style={styles.carrierAvatarText}>{carrierInitials}</Text></View><View style={styles.grow}><Text style={styles.carrierName}>{carrierName}</Text><Text style={styles.darkMeta}>{carrierMeta}</Text></View><View style={styles.online}><View style={styles.onlineDot} /><Text style={styles.onlineText}>{online ? "অনলাইন" : "অফলাইন"}</Text><Switch accessibilityLabel="অনলাইন অবস্থা" onValueChange={(value) => void setAvailability(value)} trackColor={{ false: colors.text.strong, true: colors.console.active }} thumbColor={online ? colors.console.mint : colors.text.subtle} value={online} /></View></View>
          <View style={styles.tripStats}><View style={styles.stat}><Text style={styles.darkMeta}>ট্রিপ</Text><Text style={styles.statValue}>{trips.length}</Text></View><View style={styles.stat}><Text style={styles.darkMeta}>মোট দূরত্ব</Text><Text style={styles.statValue}>{trips.reduce((total, trip) => total + trip.distanceKm, 0)} km</Text></View><View style={styles.stat}><Text style={styles.darkMeta}>আয়</Text><Money color={colors.console.mint} poisha={earnings?.weekPoisha ?? 0} size="small" /></View></View>
        </View>
        <View style={styles.tripList}>
          {!isLoading && !active ? <Text style={textStyles.body}>এখন কোনো নির্ধারিত ট্রিপ নেই। খোলা কাজ থেকে দর দিন।</Text> : null}
          {active ? <Card style={styles.currentTrip}><View style={styles.currentLabel}><Text style={styles.amberText}>বর্তমান ট্রিপ</Text><Text style={styles.amberText}>{active.order.code}</Text></View>{active.state === "EN_ROUTE_PICKUP" || active.state === "EN_ROUTE_DELIVERY" ? <View style={styles.locationNotice}><MapPin color={colors.interactive.blue} size={16} /><Text style={styles.locationText}>শুধু চলমান ট্রিপে আপনার অবস্থান শেয়ার হচ্ছে।</Text></View> : null}<View style={styles.route}><View style={styles.routeRail}><View style={styles.routeDone} /><View style={styles.routeLine} /><View style={styles.routeOpen} /></View><View style={styles.routeCopy}><Text style={styles.routeTitle}>{pickup?.address}, {pickup?.district.nameBn}</Text><Text style={textStyles.meta}>পিকআপ</Text><Text style={[styles.routeTitle, styles.destination]}>{delivery?.address}, {delivery?.district.nameBn}</Text><Text style={textStyles.meta}>ডেলিভারি</Text></View></View><Divider /><View style={styles.tagRow}><Pill label={`${active.order.listing.crop.nameBn} · ${active.order.quantity} মণ`} /><Pill label={`${active.distanceKm} কিমি`} /><Pill label={`৳ ${Math.round(active.fee / 100).toLocaleString("en-IN")}`} tone="good" /></View>{active.state === "ACCEPTED" ? <PrimaryButton label="পিকআপের পথে যাত্রা" onPress={() => void tripAction(active.id, "start")} tone="amber" /> : active.state === "EN_ROUTE_PICKUP" ? <PrimaryButton label="পিকআপ প্রমাণ দিন" onPress={() => navigation.navigate("PickupProof", { tripId: active.id })} tone="amber" /> : active.state === "PICKED_UP" ? <PrimaryButton label="ডেলিভারির পথে যাত্রা" onPress={() => void tripAction(active.id, "start")} tone="amber" /> : active.state === "EN_ROUTE_DELIVERY" ? <PrimaryButton label="ডেলিভারি পৌঁছেছে" onPress={async () => { await mobileApi.arriveTrip(active.id); await queryClient.invalidateQueries({ queryKey: ["carrier-trips"] }); }} tone="amber" /> : null}</Card> : null}
          {trips.filter((trip) => trip.id !== active?.id).length ? <Text style={styles.sectionTitle}>পরবর্তী ট্রিপ</Text> : null}
          {trips.filter((trip) => trip.id !== active?.id).map((trip) => { const from = trip.stops.find((stop) => stop.kind === "PICKUP"); const to = trip.stops.find((stop) => stop.kind === "DELIVERY"); return <Card key={trip.id}><View style={styles.jobTitleRow}><View style={styles.grow}><Text style={styles.routeTitle}>{from?.district.nameBn} → {to?.district.nameBn}</Text><Text style={textStyles.meta}>{trip.order.listing.crop.nameBn} · {trip.order.quantity} মণ</Text></View><Money poisha={trip.fee} size="small" /></View>{trip.state === "OFFERED" ? <View style={styles.buttonRow}><PrimaryButton label="গ্রহণ করুন" onPress={() => void tripAction(trip.id, "accept")} style={styles.grow} /><OutlineButton label="বাতিল" onPress={() => void tripAction(trip.id, "decline")} style={styles.grow} /></View> : null}</Card>; })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function JobsScreen() {
  const queryClient = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery({ queryFn: mobileApi.getCarrierJobs, queryKey: ["carrier-jobs"], refetchInterval: 30_000 });
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const bid = async (jobId: string) => {
    const amountPoisha = (Number(amounts[jobId]) || 0) * 100;
    await mobileApi.placeBid(jobId, amountPoisha);
    setSubmitted(jobId);
    await queryClient.invalidateQueries({ queryKey: ["carrier-jobs"] });
  };
  return <AppScreen contentStyle={styles.flush}><View style={styles.padded}><ScreenTitle bn="খোলা কাজ" /></View><ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>{["আমার রুটে", "আজ", "100 মণ+", "সর্বোচ্চ দাম"].map((item, index) => <Pill active={index === 0} key={item} label={item} />)}</ScrollView>{!isLoading && jobs.length === 0 ? <View style={styles.tripList}><Text style={textStyles.body}>এই মুহূর্তে আপনার রুটে কোনো খোলা কাজ নেই।</Text></View> : null}<View style={styles.tripList}>{jobs.map((job) => { const from = job.stops.find((stop) => stop.kind === "PICKUP"); const to = job.stops.find((stop) => stop.kind === "DELIVERY"); const lowest = job.bids.length ? Math.min(...job.bids.map((item) => item.amount)) : 0; return <Card key={job.id}><View style={styles.jobTitleRow}><View style={styles.grow}><Text style={styles.routeTitle}>{from?.district.nameBn} → {to?.district.nameBn}</Text><Text style={textStyles.meta}>{job.order.listing.crop.nameBn} · {job.order.quantity} মণ · {job.distanceKm} কিমি</Text></View><View><Text style={textStyles.meta}>প্রস্তাবিত</Text><Money poisha={job.fee} size="small" /></View></View>{job.bids.length ? <View style={styles.bidStatus}><Text style={textStyles.meta}>{job.bids.length} জন দর দিয়েছেন · সর্বনিম্ন </Text><Money poisha={lowest} size="small" /></View> : <Text style={textStyles.meta}>এখনও কেউ দর দেননি</Text>}<View style={styles.bidRow}><TextInput accessibilityLabel="দরের পরিমাণ" keyboardType="number-pad" onChangeText={(value) => setAmounts((current) => ({ ...current, [job.id]: value.replace(/\D/g, "") }))} placeholder="৳ দর" placeholderTextColor={colors.text.muted} style={styles.bidInput} value={amounts[job.id] ?? ""} /><PrimaryButton disabled={!amounts[job.id]} label={submitted === job.id ? "দর দেওয়া হয়েছে" : "দর দিন"} onPress={() => void bid(job.id)} style={styles.grow} tone="amber" /></View></Card>; })}</View></AppScreen>;
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
  const route = useRoute<RouteProp<RootStackParamList, "PickupProof">>();
  const tripId = route.params?.tripId ?? "";
  const { data: trip } = useQuery({ enabled: Boolean(tripId), queryFn: () => mobileApi.getTrip(tripId), queryKey: ["carrier-trip", tripId] });
  const [weight, setWeight] = useState("");
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [signature, setSignature] = useState("");
  const [farmerConfirmed, setFarmerConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const addPhoto = async () => { const photo = await pickAndCompressPhoto(); if (photo) setPhotos((current) => [...current, photo].slice(0, 4)); };
  const submit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      if (!tripId) return;
      await mobileApi.submitPickupProof({ photos, signature, tripId, weightMon: Number(weight) });
      setComplete(true);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.messageBn : "পিকআপ প্রমাণ জমা দেওয়া যায়নি।");
    } finally { setLoading(false); }
  };
  const difference = trip && Number(weight) ? Math.abs((Number(weight) - trip.order.quantity) / trip.order.quantity * 100) : null;
  const weightTone = difference === null ? null : difference <= 1 ? "good" : difference <= 3 ? "warn" : "bad";
  return <SafeAreaView edges={["top", "bottom"]} style={styles.proofSafe}><View style={styles.proofHeader}><ScreenTitle bn="পিকআপ প্রমাণ" /></View><ScrollView contentContainerStyle={styles.proofContent}><Text style={textStyles.meta}>{trip?.order.code ?? "ট্রিপ লোড হচ্ছে"}</Text><Card><Text style={styles.sectionTitle}>ওজন নিশ্চিত করুন</Text><View style={styles.weightRow}><View><Text style={textStyles.meta}>অর্ডারে</Text><Text style={styles.weightText}>{trip?.order.quantity ?? 0} মণ</Text></View><View><Text style={textStyles.meta}>ওয়েব্রিজে</Text><TextInput accessibilityLabel="ওয়েব্রিজের ওজন" keyboardType="decimal-pad" onChangeText={setWeight} placeholder="0.0" placeholderTextColor={colors.text.subtle} style={styles.weightInput} value={weight} /></View></View>{difference !== null ? <View style={weightTone === "good" ? styles.goodStrip : weightTone === "warn" ? styles.warnStrip : styles.badStrip}><Text style={weightTone === "good" ? styles.goodText : weightTone === "warn" ? styles.warnText : styles.badText}>{difference.toFixed(1)}% পার্থক্য — {weightTone === "good" ? "গ্রহণযোগ্য সীমার মধ্যে" : weightTone === "warn" ? "স্টাফের জন্য চিহ্নিত হবে" : "স্টাফ পর্যালোচনা প্রয়োজন"}</Text></View> : null}</Card><Card><View style={styles.jobTitleRow}><Text style={styles.sectionTitle}>ছবি</Text><Text style={textStyles.meta}>{photos.length} / 4</Text></View><View style={styles.photoRow}>{photos.map((photo) => <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.proofPhoto} />)}<Pressable accessibilityRole="button" onPress={() => void addPhoto()} style={styles.photoButton}><Camera color={colors.status.warn} size={24} /><Text style={styles.amberText}>ছবি তুলুন</Text></Pressable></View><Text style={textStyles.meta}>বস্তা, ওয়েব্রিজ স্লিপ এবং গাড়ির নম্বর প্লেট পরিষ্কারভাবে দিন।</Text></Card><Card><Text style={styles.sectionTitle}>কৃষকের স্বাক্ষর</Text><SignaturePad onChange={setSignature} /><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: farmerConfirmed }} onPress={() => setFarmerConfirmed((value) => !value)} style={styles.confirmRow}><View style={[styles.checkbox, farmerConfirmed && styles.checkboxChecked]}>{farmerConfirmed ? <Text style={styles.checkmark}>✓</Text> : null}</View><Text style={textStyles.body}>কৃষক ওজন ও ছবিগুলো দেখে নিশ্চিত করেছেন</Text></Pressable></Card>{submitError ? <View style={styles.badStrip}><Text accessibilityRole="alert" style={styles.badText}>{submitError}</Text></View> : null}{complete ? <View style={styles.goodStrip}><Text style={styles.goodText}>পিকআপ প্রমাণ সফলভাবে জমা হয়েছে।</Text></View> : null}</ScrollView><View style={styles.proofAction}><PrimaryButton disabled={!photos.length || !signature || !weight || !farmerConfirmed || difference === null || difference > 3 || complete} label={complete ? "জমা হয়েছে" : difference !== null && difference > 3 ? "স্টাফ পর্যালোচনা প্রয়োজন" : "পিকআপ সম্পন্ন করুন"} loading={loading} onPress={() => void submit()} tone="amber" /><Text style={styles.proofFootnote}>ওজন, ছবি, স্বাক্ষর, সময় ও GPS একবারে নিরাপদভাবে জমা হবে।</Text></View></SafeAreaView>;
}

export function EarningsScreen() {
  const { data: earnings, refetch } = useQuery({ queryFn: mobileApi.getCarrierEarnings, queryKey: ["carrier-earnings"] });
  const { data: payoutAccount } = useQuery({ queryFn: mobileApi.getPayoutAccount, queryKey: ["payout-account"] });
  const [loading, setLoading] = useState(false);
  const withdraw = async () => { if (!earnings?.withdrawablePoisha) return; setLoading(true); try { await mobileApi.withdrawCarrierEarnings(earnings.withdrawablePoisha); await refetch(); } finally { setLoading(false); } };
  const maskedAccount = payoutAccount?.accountNo ? `${payoutAccount.accountNo.slice(0, 5)} ••• ${payoutAccount.accountNo.slice(-3)}` : "পেমেন্ট অ্যাকাউন্ট যোগ করুন";
  return <AppScreen><ScreenTitle bn="আয়" /><Card style={styles.wallet}><Text style={styles.darkMeta}>উত্তোলনযোগ্য</Text><Money color={colors.background.surface} poisha={earnings?.withdrawablePoisha ?? 0} size="display" /><Divider /><View style={styles.walletStats}><View><Text style={styles.darkMeta}>এ সপ্তাহে</Text><Money color={colors.background.surface} poisha={earnings?.weekPoisha ?? 0} size="small" /></View><View><Text style={styles.darkMeta}>অপেক্ষমাণ</Text><Money color={colors.status.warnSoft} poisha={earnings?.pendingPoisha ?? 0} size="small" /></View></View><PrimaryButton disabled={!earnings?.withdrawablePoisha || !payoutAccount} label="উত্তোলনের অনুরোধ করুন" loading={loading} onPress={() => void withdraw()} tone="dark" /></Card><Card><View style={styles.paymentRow}><View style={styles.bkash}><Text style={styles.bkashText}>{payoutAccount?.method === "NAGAD" ? "N" : payoutAccount?.method === "BANK" ? "B" : "bK"}</Text></View><View style={styles.grow}><Text style={styles.routeTitle}>{maskedAccount}</Text><Text style={textStyles.meta}>উত্তোলনের অ্যাকাউন্ট</Text></View></View></Card><Text style={styles.sectionTitle}>সাম্প্রতিক</Text>{earnings?.ledger.map((entry) => <Card key={entry.id}><View style={styles.paymentRow}><Circle color={entry.state === "AVAILABLE" ? colors.status.good : colors.status.warn} fill={entry.state === "AVAILABLE" ? colors.status.goodSoft : colors.status.warnSoft} size={40} /><View style={styles.grow}><Text style={styles.routeTitle}>{entry.trip.id}</Text><Text style={textStyles.meta}>{entry.state === "AVAILABLE" ? "উত্তোলনযোগ্য" : "অপেক্ষমাণ"}</Text></View><Money color={entry.state === "AVAILABLE" ? colors.status.good : colors.text.primary} poisha={entry.amount} size="small" /></View></Card>)}</AppScreen>;
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
  checkbox: { alignItems: "center", borderColor: colors.border.strong, borderRadius: radii.input, borderWidth: 1, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  checkboxChecked: { backgroundColor: colors.status.warn, borderColor: colors.status.warn },
  checkmark: { color: colors.background.surface, fontFamily: fontFamilies.ui.bold, fontSize: fontSizes.bodyLarge },
  confirmRow: { alignItems: "center", flexDirection: "row", gap: spacing.x3, marginTop: spacing.x3, minHeight: touchTargets.minimum },
  chips: { gap: spacing.x2, paddingHorizontal: spacing.x4 },
  currentLabel: { flexDirection: "row", justifyContent: "space-between" },
  currentTrip: { borderColor: colors.status.warn, borderWidth: 2, gap: spacing.x3 },
  darkHeader: { backgroundColor: colors.text.primary, gap: spacing.x4, padding: spacing.x4 },
  darkMeta: { color: colors.text.subtle, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  destination: { marginTop: spacing.x4 },
  flush: { paddingHorizontal: 0 },
  goodStrip: { backgroundColor: colors.status.goodSoft, borderRadius: radii.control, marginTop: spacing.x3, padding: spacing.x3 },
  goodText: { color: colors.status.good, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  badStrip: { backgroundColor: colors.destructive.soft, borderRadius: radii.control, marginTop: spacing.x3, padding: spacing.x3 },
  badText: { color: colors.destructive.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
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
  warnStrip: { backgroundColor: colors.status.warnSoft, borderRadius: radii.control, marginTop: spacing.x3, padding: spacing.x3 },
  warnText: { color: colors.status.warnDark, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  weightInput: { color: colors.text.primary, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.headingSmall, minHeight: touchTargets.minimum, padding: 0 },
  weightRow: { flexDirection: "row", justifyContent: "space-between" },
  weightText: { color: colors.text.muted, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.cardLarge },
});
