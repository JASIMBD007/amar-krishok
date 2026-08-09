import { useNavigation, useRoute, type NavigationProp, type RouteProp } from "@react-navigation/native";
import { Search, SlidersHorizontal, Star, Truck } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileApi } from "../api/services";
import { AppScreen, Card, Divider, EscrowNote, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, textStyles } from "../components/ui";
import { listings } from "../data/demo";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";

export function MarketplaceScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("সব ফসল");
  const { data: marketListings = listings } = useQuery({ queryFn: mobileApi.getListings, queryKey: ["mobile-listings"], retry: false, staleTime: 30_000 });
  const visible = useMemo(() => marketListings.filter((listing) => {
    const matchesQuery = `${listing.cropBn} ${listing.districtBn} ${listing.farmer}`.includes(query.trim());
    const matchesChip = chip === "সব ফসল" || listing.districtBn === chip || (chip === "গ্রেড A" && listing.grade === "A");
    return matchesQuery && matchesChip && listing.status === "LIVE";
  }), [chip, marketListings, query]);

  return (
    <AppScreen contentStyle={styles.flush}>
      <View style={styles.searchSection}>
        <View style={styles.searchRow}><View style={styles.searchBox}><Search color={colors.text.muted} size={20} /><TextInput accessibilityLabel="ফসল বা জেলা খুঁজুন" onChangeText={setQuery} placeholder="ফসল বা জেলা খুঁজুন" placeholderTextColor={colors.text.muted} style={styles.searchInput} value={query} /></View><Pressable accessibilityLabel="ফিল্টার" style={styles.filterButton}><SlidersHorizontal color={colors.background.surface} size={20} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>{["সব ফসল", "বগুড়া", "যাচাইকৃত", "গ্রেড A"].map((item) => <Pressable key={item} onPress={() => setChip(item)}><Pill active={chip === item} label={item} /></Pressable>)}</ScrollView>
      </View>
      <View style={styles.resultsHeader}><Text style={textStyles.meta}>{visible.length}টি লট · বগুড়া</Text><Text style={styles.sort}>দাম ↑</Text></View>
      <View style={styles.list}>{visible.map((listing, index) => <Pressable key={listing.id} onPress={() => navigation.navigate("LotDetail", { listingId: listing.id })}><Card style={styles.listingCard}><Text style={[styles.verdict, index === 0 ? styles.good : styles.blue]}>{index === 0 ? "ন্যায্য দাম" : "দরের নিচে"}</Text><View style={styles.photoPlaceholder} /><View style={styles.listingTitleRow}><View style={styles.grow}><Text style={styles.listingTitle}>{listing.cropBn} · গ্রেড {listing.grade}</Text><Text style={textStyles.meta}>{listing.quantityMon} মণ · {listing.districtBn}</Text></View><View style={styles.priceCopy}><Money poisha={listing.pricePoisha} size="small" /><Text style={textStyles.meta}>/ মণ</Text></View></View><Divider /><View style={styles.farmerRow}><View style={styles.avatar}><Text style={styles.avatarText}>রউ</Text></View><Text style={styles.farmer}>{listing.farmer}</Text><Pill label="যাচাইকৃত" tone="good" /></View></Card></Pressable>)}</View>
    </AppScreen>
  );
}

export function LotDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "LotDetail">>();
  const listing = listings.find((item) => item.id === route.params.listingId) ?? listings[0];
  const [loading, setLoading] = useState(false);
  const order = async () => {
    if (!listing) return;
    setLoading(true);
    try {
      await mobileApi.createOrder(listing.id, listing.quantityMon);
      navigation.navigate("OrderTracking", { orderId: "AK-4821" });
    } finally {
      setLoading(false);
    }
  };
  if (!listing) return null;
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.detailSafe}>
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.hero}><View style={styles.heroDot} /><View style={styles.heroDot} /></View>
        <ScreenTitle bn={`${listing.cropBn} · গ্রেড ${listing.grade}`} en={`${listing.quantityMon} mon · ${listing.districtBn}`} />
        <Card style={styles.priceCard}><View><Text style={textStyles.meta}>প্রতি মণ</Text><Money poisha={listing.pricePoisha} /></View><View style={styles.priceDivider} /><View><Text style={textStyles.meta}>আজকের দর</Text><Money poisha={125000} size="small" /></View></Card>
        <EscrowNote>দাম ন্যায্য সীমার মধ্যে — বাজার দরের ৩% উপরে, গ্রেড A-এর জন্য স্বাভাবিক।</EscrowNote>
        <Card style={styles.farmerDetail}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>রউ</Text></View><View style={styles.grow}><Text style={styles.listingTitle}>{listing.farmer}</Text><Text style={textStyles.meta}>১১২টি সম্পন্ন অর্ডার · ২০১১ সাল থেকে</Text></View><Star color={colors.text.muted} size={20} /></Card>
        <View><Text style={styles.sectionTitle}>কৃষকের নোট</Text><Text style={textStyles.body}>মাঠ থেকে হিসাব করে রাখা, হাতে বাছাই করা। ৪০ কেজির বস্তা, ডিপোতে লোডিং সহায়তা আছে।</Text></View>
      </ScrollView>
      <View style={styles.actions}><OutlineButton label="দর দিন" style={styles.actionButton} /><PrimaryButton label="অর্ডার করুন" loading={loading} onPress={() => void order()} style={styles.actionButton} /></View>
    </SafeAreaView>
  );
}

export function BuyerOrdersScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return <AppScreen><ScreenTitle bn="অর্ডার" en="Orders" /><Pressable onPress={() => navigation.navigate("OrderTracking", { orderId: "AK-4821" })}><Card><View style={styles.orderTop}><Text style={styles.listingTitle}>AK-4821 · আলু</Text><Pill label="পরিবহনে" tone="blue" /></View><Text style={textStyles.meta}>১২০ মণ · বগুড়া → ঢাকা</Text><Divider /><View style={styles.orderTop}><Money poisha={14256000} size="small" /><View style={styles.truckRow}><Truck color={colors.interactive.blue} size={18} /><Text style={styles.blue}>আগামীকাল ১৪:০০</Text></View></View></Card></Pressable></AppScreen>;
}

const styles = StyleSheet.create({
  actionButton: { flex: 1 },
  actions: { backgroundColor: colors.background.surface, borderTopColor: colors.border.default, borderTopWidth: 1, flexDirection: "row", gap: spacing.x3, padding: spacing.x4 },
  avatar: { alignItems: "center", backgroundColor: colors.brand.soft, borderRadius: radii.pill, height: touchTargets.minimum, justifyContent: "center", width: touchTargets.minimum },
  avatarText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  blue: { color: colors.interactive.blue, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  chips: { gap: spacing.x2 },
  detailContent: { gap: spacing.x4, padding: spacing.x4 },
  detailSafe: { backgroundColor: colors.background.page, flex: 1 },
  farmer: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  farmerDetail: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  farmerRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  filterButton: { alignItems: "center", backgroundColor: colors.text.primary, borderRadius: radii.control, height: touchTargets.primaryMinimum, justifyContent: "center", width: touchTargets.primaryMinimum },
  flush: { paddingHorizontal: 0 },
  good: { color: colors.status.good },
  grow: { flex: 1 },
  hero: { alignItems: "center", backgroundColor: colors.background.sunken, flexDirection: "row", gap: spacing.x2, height: 264, justifyContent: "center", marginHorizontal: -spacing.x4, marginTop: -spacing.x4 },
  heroDot: { backgroundColor: colors.background.surface, borderRadius: radii.pill, height: 8, width: 8 },
  largeAvatar: { alignItems: "center", backgroundColor: colors.brand.soft, borderRadius: radii.pill, height: 52, justifyContent: "center", width: 52 },
  largeAvatarText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  list: { gap: spacing.x4, paddingHorizontal: spacing.x4 },
  listingCard: { gap: spacing.x3, minHeight: 280 },
  listingTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.card },
  listingTitleRow: { alignItems: "flex-end", flexDirection: "row", gap: spacing.x3 },
  orderTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  photoPlaceholder: { backgroundColor: colors.background.sunken, height: 116, marginHorizontal: -spacing.x4, marginTop: -spacing.x3 },
  priceCard: { alignItems: "center", flexDirection: "row", justifyContent: "space-around" },
  priceCopy: { alignItems: "flex-end" },
  priceDivider: { backgroundColor: colors.border.default, height: 48, width: 1 },
  resultsHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.x4 },
  searchBox: { alignItems: "center", backgroundColor: colors.background.sunken, borderRadius: radii.control, flex: 1, flexDirection: "row", gap: spacing.x2, minHeight: touchTargets.primaryMinimum, paddingHorizontal: spacing.x4 },
  searchInput: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.body },
  searchRow: { flexDirection: "row", gap: spacing.x3 },
  searchSection: { backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, gap: spacing.x3, padding: spacing.x4 },
  sectionTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall, marginBottom: spacing.x2 },
  sort: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  truckRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  verdict: { fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
});
