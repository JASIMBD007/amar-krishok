import { useNavigation, useRoute, type NavigationProp, type RouteProp } from "@react-navigation/native";
import { Search, SlidersHorizontal, Star, Truck } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Image as NativeImage, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../api/errors";
import { mobileApi } from "../api/services";
import { absoluteApiUrl } from "../api/runtime";
import { useSession } from "../auth/SessionProvider";
import { AppScreen, Card, Divider, EmptyState, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, textStyles } from "../components/ui";
import { dhakaDateKey, fairPriceDelta, fairPriceVerdict } from "../domain/market";
import type { ListingSummary } from "../domain/types";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";

function cropPhoto(listing: ListingSummary) {
  if (listing.photo) return absoluteApiUrl(listing.photo);
  const key = listing.cropEn.toLowerCase().replace(/\s+/g, "-");
  const extension = key === "rice" || key === "boro-rice" ? "png" : "jpg";
  const normalized = key === "boro-rice" ? "rice" : key;
  return `${process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://www.amarkrishok.com"}/assets/crops/${normalized}.${extension}`;
}

function apiError(error: unknown) {
  return error instanceof ApiError ? error.messageBn : "অনুরোধটি সম্পন্ন করা যায়নি।";
}

export function MarketplaceScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("সব ফসল");
  const { data: marketListings = [], error, isLoading, refetch } = useQuery({ queryFn: mobileApi.getListings, queryKey: ["mobile-listings"], staleTime: 30_000 });
  const filterChips = useMemo(() => ["সব ফসল", ...(user?.district ? [user.district] : []), "যাচাইকৃত", "গ্রেড A"], [user?.district]);
  const visible = useMemo(() => marketListings.filter((listing) => {
    const cleanQuery = query.trim().toLocaleLowerCase();
    const matchesQuery = `${listing.cropBn} ${listing.cropEn} ${listing.districtBn} ${listing.farmer}`.toLocaleLowerCase().includes(cleanQuery);
    const matchesChip = chip === "সব ফসল" || listing.districtBn === chip || (chip === "যাচাইকৃত" && listing.verified) || (chip === "গ্রেড A" && listing.grade === "A");
    return matchesQuery && matchesChip && listing.status === "LIVE";
  }), [chip, marketListings, query]);

  return (
    <AppScreen contentStyle={styles.flush}>
      <View style={styles.searchSection}>
        <View style={styles.searchRow}><View style={styles.searchBox}><Search color={colors.text.muted} size={20} /><TextInput accessibilityLabel="ফসল বা জেলা খুঁজুন" onChangeText={setQuery} placeholder="ফসল বা জেলা খুঁজুন" placeholderTextColor={colors.text.muted} style={styles.searchInput} value={query} /></View><Pressable accessibilityLabel="ফিল্টার" style={styles.filterButton}><SlidersHorizontal color={colors.background.surface} size={20} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>{filterChips.map((item) => <Pressable key={item} onPress={() => setChip(item)}><Pill active={chip === item} label={item} /></Pressable>)}</ScrollView>
      </View>
      <View style={styles.resultsHeader}><Text style={textStyles.meta}>{visible.length}টি লট</Text><Text style={styles.sort}>দাম ↑</Text></View>
      {error ? <View style={styles.state}><Text style={styles.error}>{apiError(error)}</Text><OutlineButton label="আবার চেষ্টা করুন" onPress={() => void refetch()} /></View> : null}
      {!error && !isLoading && visible.length === 0 ? <EmptyState text="এই ফিল্টারে কোনো লাইভ লট নেই।" /> : null}
      <View style={styles.list}>{visible.map((listing) => { const verdict = fairPriceVerdict(listing.marketDelta); return <Pressable accessibilityRole="button" key={listing.id} onPress={() => navigation.navigate("LotDetail", { listingId: listing.id })}><Card style={styles.listingCard}><View style={styles.photoFrame}><NativeImage accessibilityLabel={`${listing.cropBn} ফসলের ছবি`} resizeMode="cover" source={{ uri: cropPhoto(listing) }} style={styles.photo} />{verdict ? <View style={[styles.verdictBadge, verdict.tone === "good" ? styles.verdictGood : verdict.tone === "warn" ? styles.verdictWarn : styles.verdictBlue]}><Text style={[styles.verdict, verdict.tone === "good" ? styles.good : verdict.tone === "warn" ? styles.warn : styles.blue]}>{verdict.label}</Text></View> : null}</View><View style={styles.listingBody}><View style={styles.listingTitleRow}><View style={styles.grow}><Text style={styles.listingTitle}>{listing.cropBn} · গ্রেড {listing.grade}</Text><Text style={textStyles.meta}>{listing.quantityMon} মণ · {listing.districtBn}</Text></View><View style={styles.priceCopy}><Money poisha={listing.pricePoisha} size="small" /><Text style={textStyles.meta}>/ মণ</Text></View></View><Divider /><View style={styles.farmerRow}><View style={styles.avatar}><Text style={styles.avatarText}>{listing.farmer.slice(0, 2)}</Text></View><Text style={styles.farmer}>{listing.farmer}</Text>{listing.verified ? <Pill label="যাচাইকৃত" tone="good" /> : null}</View></View></Card></Pressable>; })}</View>
    </AppScreen>
  );
}

export function LotDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "LotDetail">>();
  const { data: listing, error, isLoading, refetch } = useQuery({ queryFn: () => mobileApi.getListing(route.params.listingId), queryKey: ["listing", route.params.listingId] });
  const { data: rateRows = [] } = useQuery({ enabled: Boolean(listing), queryFn: () => mobileApi.getRates(listing?.cropId ?? "", listing?.districtId ?? ""), queryKey: ["listing-rate", listing?.cropId, listing?.districtId], staleTime: 0 });
  const [quantity, setQuantity] = useState("1");
  const [offerMode, setOfferMode] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const freshRate = rateRows.find((rate) => dhakaDateKey(rate.date) === dhakaDateKey());
  const currentDelta = listing && freshRate ? fairPriceDelta(listing.pricePoisha, freshRate.price) : null;
  const currentVerdict = fairPriceVerdict(currentDelta);
  const order = async () => {
    if (!listing) return;
    setLoading(true); setActionError(null);
    try {
      const result = await mobileApi.createOrder(listing.id, Math.min(listing.quantityMon, Math.max(1, Number(quantity) || 1)));
      navigation.navigate("OrderTracking", { orderId: result.orderId });
    } catch (caught) { setActionError(apiError(caught)); } finally { setLoading(false); }
  };
  const offer = async () => {
    if (!listing) return;
    setLoading(true); setActionError(null);
    try {
      await mobileApi.createOffer(listing.id, (Number(offerPrice) || 0) * 100, Math.min(listing.quantityMon, Math.max(1, Number(quantity) || 1)));
      setOfferMode(false);
    } catch (caught) { setActionError(apiError(caught)); } finally { setLoading(false); }
  };
  if (error) return <AppScreen><EmptyState text={apiError(error)} /><OutlineButton label="আবার চেষ্টা করুন" onPress={() => void refetch()} /></AppScreen>;
  if (!listing || isLoading) return <AppScreen><EmptyState text="লটের তথ্য লোড হচ্ছে…" /></AppScreen>;
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.detailSafe}>
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.heroFrame}><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{(listing.photos?.length ? listing.photos : [listing.photo]).filter(Boolean).map((photo, index) => <NativeImage accessibilityLabel={`${listing.cropBn} ফসলের ছবি ${index + 1}`} key={`${photo}-${index}`} resizeMode="cover" source={{ uri: absoluteApiUrl(photo!) }} style={[styles.hero, { width }]} />)}</ScrollView>{(listing.photos?.length ?? 0) > 1 ? <View style={styles.heroDots}>{listing.photos?.map((photo, index) => <View key={`${photo}-dot`} style={[styles.heroDot, index === 0 && styles.heroDotActive]} />)}</View> : null}</View>
        <ScreenTitle bn={`${listing.cropBn} · গ্রেড ${listing.grade}`} />
        <Text style={textStyles.meta}>{listing.quantityMon} মণ · {listing.districtBn} · {listing.pickup}</Text>
        <Card style={styles.priceCard}><View><Text style={textStyles.meta}>প্রতি মণ</Text><Money poisha={listing.pricePoisha} /></View>{freshRate ? <><View style={styles.priceDivider} /><View><Text style={textStyles.meta}>আজকের দর</Text><Money poisha={freshRate.price} size="small" /></View></> : null}</Card>
        {freshRate && currentVerdict && currentDelta !== null ? <View style={[styles.detailVerdict, currentVerdict.tone === "good" ? styles.verdictGood : currentVerdict.tone === "warn" ? styles.verdictWarn : styles.verdictBlue]}><Text style={[styles.detailVerdictTitle, currentVerdict.tone === "good" ? styles.good : currentVerdict.tone === "warn" ? styles.warn : styles.blue]}>{currentVerdict.label}</Text><Text style={textStyles.body}>আজকের জেলার বাজারদরের তুলনায় এই লট {Math.abs(currentDelta)}% {currentDelta > 0 ? "উপরে" : currentDelta < 0 ? "নিচে" : "সমান"}।</Text></View> : null}
        <Card style={styles.farmerDetail}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>{listing.farmer.slice(0, 2)}</Text></View><View style={styles.grow}><Text style={styles.listingTitle}>{listing.farmer}</Text><Text style={textStyles.meta}>{listing.verified ? "যাচাইকৃত কৃষক" : "যাচাই প্রক্রিয়াধীন"}</Text></View><Star color={colors.text.muted} size={20} /></Card>
        {listing.note ? <View><Text style={styles.sectionTitle}>কৃষকের নোট</Text><Text style={textStyles.body}>{listing.note}</Text></View> : null}
        <View><Text style={styles.sectionTitle}>পরিমাণ (মণ)</Text><TextInput accessibilityLabel="অর্ডারের পরিমাণ" keyboardType="number-pad" onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} style={styles.quantityInput} value={quantity} /></View>
        {offerMode ? <Card><Text style={styles.sectionTitle}>আপনার দর (৳ / মণ)</Text><TextInput accessibilityLabel="আপনার দর" keyboardType="number-pad" onChangeText={(value) => setOfferPrice(value.replace(/\D/g, ""))} style={styles.quantityInput} value={offerPrice} /><View style={styles.inlineActions}><OutlineButton label="বাতিল" onPress={() => setOfferMode(false)} style={styles.actionButton} /><PrimaryButton disabled={!offerPrice} label="দর পাঠান" loading={loading} onPress={() => void offer()} style={styles.actionButton} /></View></Card> : null}
        {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
      </ScrollView>
      <View style={styles.actions}><OutlineButton label="দর দিন" onPress={() => setOfferMode(true)} style={styles.actionButton} /><PrimaryButton label="অর্ডার করুন" loading={loading} onPress={() => void order()} style={styles.actionButton} /></View>
    </SafeAreaView>
  );
}

export function BuyerOrdersScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: orders = [], error, isLoading, refetch } = useQuery({ queryFn: mobileApi.getOrders, queryKey: ["orders"] });
  return <AppScreen><ScreenTitle bn="অর্ডার" />{error ? <><EmptyState text={apiError(error)} /><OutlineButton label="আবার চেষ্টা করুন" onPress={() => void refetch()} /></> : null}{!error && !isLoading && orders.length === 0 ? <EmptyState text="এখনও কোনো অর্ডার নেই।" /> : null}{orders.map((order) => <Pressable accessibilityRole="button" key={order.id} onPress={() => navigation.navigate("OrderTracking", { orderId: order.id })}><Card><View style={styles.orderTop}><Text style={styles.listingTitle}>{order.code} · {order.listing.crop.nameBn}</Text><Pill label={order.stage === "PAID" ? "সম্পন্ন" : order.escrow?.state === "FROZEN" ? "বিরোধ" : "চলমান"} tone={order.stage === "PAID" ? "good" : order.escrow?.state === "FROZEN" ? "bad" : "blue"} /></View><Text style={textStyles.meta}>{order.quantity} মণ · {order.listing.district.nameBn}</Text><Divider /><View style={styles.orderTop}><Money poisha={order.total} size="small" />{order.trip ? <View style={styles.truckRow}><Truck color={colors.interactive.blue} size={18} /><Text style={styles.blue}>{order.trip.state}</Text></View> : null}</View></Card></Pressable>)}</AppScreen>;
}

const styles = StyleSheet.create({
  actionButton: { flex: 1 },
  actions: { backgroundColor: colors.background.surface, borderTopColor: colors.border.default, borderTopWidth: 1, flexDirection: "row", gap: spacing.x3, padding: spacing.x4 },
  avatar: { alignItems: "center", backgroundColor: colors.brand.soft, borderRadius: radii.pill, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  avatarText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  blue: { color: colors.interactive.blue, fontFamily: fontFamilies.ui.semibold, fontSize: fontSizes.meta },
  chips: { gap: spacing.x2 },
  detailContent: { gap: spacing.x4, padding: spacing.x4 },
  detailSafe: { backgroundColor: colors.background.page, flex: 1 },
  error: { backgroundColor: colors.destructive.soft, borderRadius: radii.card, color: colors.destructive.primary, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, padding: spacing.x3 },
  farmer: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  farmerDetail: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  farmerRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  filterButton: { alignItems: "center", backgroundColor: colors.text.primary, borderRadius: radii.control, height: touchTargets.primaryMinimum, justifyContent: "center", width: touchTargets.primaryMinimum },
  flush: { paddingHorizontal: 0 },
  good: { color: colors.status.good },
  grow: { flex: 1 },
  detailVerdict: { borderRadius: radii.card, gap: spacing.x1, padding: spacing.x4 },
  detailVerdictTitle: { fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  hero: { backgroundColor: colors.background.sunken, height: 264 },
  heroDot: { backgroundColor: colors.border.strong, borderRadius: radii.pill, height: 6, width: 6 },
  heroDotActive: { backgroundColor: colors.background.surface, width: 20 },
  heroDots: { bottom: spacing.x3, flexDirection: "row", gap: spacing.x1, left: 0, position: "absolute", right: 0, justifyContent: "center" },
  heroFrame: { marginHorizontal: -spacing.x4, marginTop: -spacing.x4, position: "relative" },
  inlineActions: { flexDirection: "row", gap: spacing.x3, marginTop: spacing.x3 },
  largeAvatar: { alignItems: "center", backgroundColor: colors.brand.soft, borderRadius: radii.pill, height: 52, justifyContent: "center", width: 52 },
  largeAvatarText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  list: { gap: spacing.x4, paddingHorizontal: spacing.x4 },
  listingBody: { gap: spacing.x3, padding: spacing.x4 },
  listingCard: { overflow: "hidden", padding: 0 },
  listingTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.card },
  listingTitleRow: { alignItems: "flex-end", flexDirection: "row", gap: spacing.x3 },
  orderTop: { alignItems: "center", flexDirection: "row", gap: spacing.x2, justifyContent: "space-between" },
  photo: { height: 184, width: "100%" },
  photoFrame: { backgroundColor: colors.background.sunken, position: "relative" },
  priceCard: { alignItems: "center", flexDirection: "row", justifyContent: "space-around" },
  priceCopy: { alignItems: "flex-end" },
  priceDivider: { backgroundColor: colors.border.default, height: 48, width: 1 },
  quantityInput: { backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, color: colors.text.primary, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.cardSmall, minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4 },
  resultsHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.x4 },
  searchBox: { alignItems: "center", backgroundColor: colors.background.sunken, borderRadius: radii.control, flex: 1, flexDirection: "row", gap: spacing.x2, minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4 },
  searchInput: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body },
  searchRow: { flexDirection: "row", gap: spacing.x3 },
  searchSection: { backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, gap: spacing.x3, padding: spacing.x4 },
  sectionTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall, marginBottom: spacing.x2 },
  sort: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  state: { gap: spacing.x3, paddingHorizontal: spacing.x4 },
  truckRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  verdict: { fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  verdictBadge: { borderRadius: radii.pill, left: spacing.x3, paddingHorizontal: spacing.x3, paddingVertical: spacing.x1, position: "absolute", top: spacing.x3 },
  verdictBlue: { backgroundColor: colors.interactive.blueSoft },
  verdictGood: { backgroundColor: colors.status.goodSoft },
  verdictWarn: { backgroundColor: colors.status.warnSoft },
  warn: { color: colors.status.warnDark },
});
