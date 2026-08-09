import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { Bell, Camera, Minus, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppScreen, Card, Divider, EmptyState, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, textStyles } from "../components/ui";
import { useSession } from "../auth/SessionProvider";
import { pickAndCompressPhoto, type PreparedPhoto } from "../media/images";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";
import { mobileApi } from "../api/services";
import { dhakaDateKey, dhakaGreeting, fairPriceDelta, fairPriceVerdict } from "../domain/market";

export function FarmerHomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: summary } = useQuery({ queryFn: mobileApi.getDeskSummary, queryKey: ["farmer-summary"] });
  const { data: offers = [] } = useQuery({ queryFn: mobileApi.getOffers, queryKey: ["farmer-offers"] });
  const respond = async (id: string, accept: boolean) => {
    if (accept) await mobileApi.acceptOffer(id); else await mobileApi.declineOffer(id);
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["farmer-offers"] }), queryClient.invalidateQueries({ queryKey: ["farmer-summary"] })]);
  };
  const initials = user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "কৃ";
  return (
    <SafeAreaView edges={["top"]} style={styles.homeSafeArea}>
      <ScrollView contentContainerStyle={styles.homeContent}>
        <View style={styles.greenHeader}>
          <View style={styles.greetingRow}><View style={styles.farmerAvatar}><Text style={styles.farmerAvatarText}>{initials}</Text></View><View style={styles.flex}><Text style={styles.greeting}>{dhakaGreeting()}</Text><Text style={styles.greetingName}>{user?.name}</Text></View><Pressable accessibilityLabel="বিজ্ঞপ্তি" onPress={() => navigation.navigate("Notifications")} style={styles.headerIcon}><Bell color={colors.background.surface} size={20} />{summary?.openOffers ? <View style={styles.headerUnread} /> : null}</Pressable></View>
          <View style={styles.rateCard}><Text style={styles.rateLabel}>{summary?.focusRate ? `আজ ${summary.focusRate.districtBn}য় ${summary.focusRate.cropBn}র দর` : "আজকের জেলা বাজার"}</Text><View style={styles.rateRow}>{summary?.focusRate ? <Money color={colors.background.surface} poisha={summary.focusRate.pricePoisha} size="small" /> : <Text style={styles.rateValue}>{user?.district}</Text>}<Pill label={`${summary?.liveLots ?? 0}টি লাইভ লট`} tone="good" /></View></View>
        </View>
        <View style={styles.bodySection}>
          <PrimaryButton label="ফসল পোস্ট করুন" onPress={() => navigation.navigate("PostCrop")} tone="red" />
          <View style={styles.kpiGrid}><Card style={styles.kpiCard}><Text style={textStyles.meta}>এসক্রোতে</Text><Money poisha={summary?.escrowPoisha ?? 0} size="small" /><Text style={textStyles.meta}>{summary?.liveLots ?? 0}টি লাইভ লট</Text></Card><Card style={styles.kpiCard}><Text style={textStyles.meta}>এ মাসে আয়</Text><Money poisha={summary?.monthlyEarningsPoisha ?? 0} size="small" /><Text style={styles.positive}>পরিশোধিত অর্ডার</Text></Card></View>
          <Card style={styles.offerCard}><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>নতুন অফার</Text>{offers.length ? <View style={styles.countBadge}><Text style={styles.countText}>{offers.filter((item) => item.status === "OPEN").length}</Text></View> : null}</View>{offers.filter((item) => item.status === "OPEN").slice(0, 2).map((offer) => <View key={offer.id}><Divider /><Text style={styles.offerBuyer}>{offer.buyer.name}</Text><View style={styles.offerMetaRow}><Text style={textStyles.meta}>{offer.listing.crop.nameBn} · গ্রেড {offer.listing.grade} · {offer.quantity} মণ</Text><Money poisha={offer.price} size="small" /></View><View style={styles.buttonRow}><PrimaryButton label="গ্রহণ করুন" onPress={() => void respond(offer.id, true)} style={styles.flex} /><OutlineButton label="বাতিল" onPress={() => void respond(offer.id, false)} style={styles.flex} /></View></View>)}{offers.filter((item) => item.status === "OPEN").length === 0 ? <Text style={textStyles.meta}>এখন কোনো নতুন অফার নেই।</Text> : null}</Card>
          <View style={styles.deliveryNote}><Text style={styles.deliveryText}>ডেলিভারি নিশ্চিত হলে 2 ঘণ্টার মধ্যে টাকা আপনার বিকাশে চলে যাবে।</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MyLotsScreen() {
  const [filter, setFilter] = useState("সব");
  const queryClient = useQueryClient();
  const { data: summary, isLoading } = useQuery({ queryFn: mobileApi.getDeskSummary, queryKey: ["farmer-summary"] });
  const listings = useMemo(() => summary?.listings ?? [], [summary?.listings]);
  const chips = [`সব · ${listings.length}`, `লাইভ · ${listings.filter((item) => item.status === "LIVE").length}`, `বিক্রি · ${listings.filter((item) => item.status === "SOLD").length}`, `বিরতি · ${listings.filter((item) => item.status === "PAUSED").length}`];
  const visible = useMemo(() => filter.startsWith("সব") ? listings : filter.startsWith("বিরতি") ? listings.filter((item) => item.status === "PAUSED") : filter.startsWith("বিক্রি") ? listings.filter((item) => item.status === "SOLD") : listings.filter((item) => item.status === "LIVE"), [filter, listings]);
  const toggle = async (id: string, status: string) => { if (status === "LIVE") await mobileApi.pauseListing(id); else await mobileApi.publishListing(id); await queryClient.invalidateQueries({ queryKey: ["farmer-summary"] }); };
  return (
    <AppScreen contentStyle={styles.noHorizontalPadding}>
      <View style={styles.padded}><ScreenTitle bn="আমার লট" en="My lots" /></View>
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>{chips.map((chip) => <Pressable key={chip} onPress={() => setFilter(chip)}><Pill active={filter === chip} label={chip} /></Pressable>)}</ScrollView>
      {!isLoading && visible.length === 0 ? <EmptyState text="এই অবস্থায় কোনো লট নেই।" /> : null}<View style={styles.lotList}>{visible.map((listing) => <Card key={listing.id} style={styles.lotCard}><View style={styles.lotTitleRow}><Text style={styles.lotTitle}>{listing.cropBn} · গ্রেড {listing.grade}</Text><Pill label={listing.status === "LIVE" ? "লাইভ" : listing.status === "SOLD" ? "বিক্রি" : "বিরতি"} tone={listing.status === "LIVE" ? "good" : "neutral"} /></View><Text style={textStyles.meta}>{listing.quantityMon} মণ · {listing.pickup}</Text><View style={styles.priceRow}><Money poisha={listing.pricePoisha} size="small" /><Text style={styles.unit}>/ মণ</Text></View>{listing.status !== "SOLD" ? <><Divider /><Pressable accessibilityRole="button" onPress={() => void toggle(listing.id, listing.status)} style={styles.lotAction}><Text style={styles.lotActionText}>{listing.status === "LIVE" ? "বিরতি দিন" : "চালু করুন"}</Text></Pressable></> : null}</Card>)}</View>
    </AppScreen>
  );
}

export function PostCropScreen() {
  const { user } = useSession();
  const [step, setStep] = useState(1);
  const [cropId, setCropId] = useState("");
  const [grade, setGrade] = useState<"A" | "B" | "C">("A");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [pickup, setPickup] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const numericPrice = Number(price) || 0;
  const { data: crops = [] } = useQuery({ queryFn: mobileApi.getCrops, queryKey: ["service-crops"] });
  const { data: districts = [] } = useQuery({ queryFn: mobileApi.getDistricts, queryKey: ["service-districts"] });
  const selectedCrop = crops.find((item) => item.id === cropId);
  const selectedDistrict = districts.find((item) => item.nameBn === user?.district || item.nameEn === user?.district);
  const { data: rateRows } = useQuery({ enabled: Boolean(selectedCrop && selectedDistrict), queryFn: () => mobileApi.getRates(selectedCrop?.id ?? "", selectedDistrict?.id ?? ""), queryKey: ["today-rate", selectedCrop?.id, selectedDistrict?.id], retry: false, staleTime: 0 });
  const freshRate = rateRows?.find((rate) => dhakaDateKey(rate.date) === dhakaDateKey());
  const currentDelta = freshRate ? fairPriceDelta(numericPrice * 100, freshRate.price) : null;
  const currentVerdict = fairPriceVerdict(currentDelta);
  const addPhoto = async () => {
    if (photos.length >= 6) return;
    const photo = await pickAndCompressPhoto();
    if (photo) setPhotos((current) => [...current, photo].slice(0, 6));
  };
  const publish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      if (!selectedCrop || !selectedDistrict) throw new Error("catalogue unavailable");
      const listing = await mobileApi.createListing({ cropId: selectedCrop.id, districtId: selectedDistrict.id, grade, pickupWindow: pickup, pricePoisha: numericPrice * 100, quantityMon: quantity });
      for (const [position, photo] of photos.entries()) {
        await mobileApi.uploadListingPhoto(listing.id, photo, position);
      }
      await mobileApi.publishListing(listing.id);
      setPublished(true);
    } catch {
      setPublishError("লট প্রকাশ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
    } finally {
      setPublishing(false);
    }
  };
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.postSafeArea}>
      <View style={styles.postHeader}><ScreenTitle bn="ফসল পোস্ট করুন" en="Post a crop" right={<Text style={styles.stepCount}>{step}/3</Text>} /><View style={styles.stepper}>{[1, 2, 3].map((item) => <View key={item} style={item <= step ? styles.stepActive : styles.stepIdle} />)}</View></View>
      <ScrollView contentContainerStyle={styles.postContent}>
        {step === 1 ? <>
          <Text style={styles.fieldLabel}>ফসল বেছে নিন</Text>
          <View style={styles.cropGrid}>{crops.map((item) => <Pressable key={item.id} onPress={() => setCropId(item.id)} style={[styles.cropChoice, selectedCrop?.id === item.id && styles.cropChoiceActive]}><Text style={[styles.cropChoiceText, selectedCrop?.id === item.id && styles.cropChoiceTextActive]}>{item.nameBn}</Text></Pressable>)}</View>
          <Text style={styles.fieldLabel}>গ্রেড</Text><View style={styles.pickupRow}>{(["A", "B", "C"] as const).map((item) => <Pressable key={item} onPress={() => setGrade(item)}><Pill active={grade === item} label={`গ্রেড ${item}`} /></Pressable>)}</View>
        </> : null}
        {step === 2 ? <>
        <Text style={styles.fieldLabel}>পরিমাণ (মণ)</Text>
        <View style={styles.quantityRow}><Pressable accessibilityLabel="পরিমাণ কমান" onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.stepButton}><Minus color={colors.text.primary} size={20} /></Pressable><View style={styles.quantityValue}><Text style={styles.quantityText}>{quantity}</Text></View><Pressable accessibilityLabel="পরিমাণ বাড়ান" onPress={() => setQuantity((value) => value + 1)} style={styles.stepButton}><Plus color={colors.text.primary} size={20} /></Pressable></View>
        <Text style={styles.fieldLabel}>আপনার দাম (৳ / মণ)</Text><TextInput accessibilityLabel="আপনার দাম" keyboardType="number-pad" onChangeText={(value) => setPrice(value.replace(/\D/g, ""))} style={styles.priceInput} value={price} />
        {freshRate && currentVerdict && currentDelta !== null && numericPrice > 0 ? <View style={[styles.fairCard, currentVerdict.tone === "good" ? styles.fairGood : currentVerdict.tone === "warn" ? styles.fairWarn : styles.fairBlue]}><Text style={[styles.fairTitle, currentVerdict.tone === "warn" ? styles.fairWarnText : currentVerdict.tone === "blue" ? styles.fairBlueText : null]}>{currentVerdict.label}</Text><Text style={styles.fairBody}>আজকের {selectedDistrict?.nameBn} জেলার দর ৳ {Math.round(freshRate.price / 100).toLocaleString("en-IN")}। আপনার দাম {Math.abs(currentDelta)}% {currentDelta > 0 ? "উপরে" : currentDelta < 0 ? "নিচে" : "সমান"}।</Text></View> : null}
        <Text style={styles.fieldLabel}>ছবি (কমপক্ষে 1টি)</Text><View style={styles.photoRow}>{photos.map((photo, index) => <View key={photo.uri} style={styles.photoTile}><Image source={{ uri: photo.uri }} style={styles.photo} />{index === 0 ? <View style={styles.coverBadge}><Text style={styles.coverText}>কভার</Text></View> : null}</View>)}<Pressable accessibilityLabel="ছবি তুলুন" onPress={() => void addPhoto()} style={styles.addPhoto}><Camera color={colors.brand.primary} size={24} /><Text style={styles.addPhotoText}>ছবি তুলুন</Text></Pressable></View><Text style={textStyles.meta}>সর্বোচ্চ 6টি · প্রতিটি ছবি 500 KB-এর নিচে সংকুচিত হয়</Text>
        <Text style={styles.fieldLabel}>পিকআপ</Text><View style={styles.pickupRow}>{["24 ঘণ্টায়", "3 দিনে", "ক্রেতা ঠিক করবে"].map((option) => <Pressable key={option} onPress={() => setPickup(option)}><Pill active={pickup === option} label={option} /></Pressable>)}</View>
        </> : null}
        {step === 3 ? <><Card><Text style={styles.reviewTitle}>{selectedCrop?.nameBn} · গ্রেড {grade}</Text><Text style={textStyles.body}>{quantity} মণ · {pickup}</Text><Divider /><View style={styles.reviewRow}><Text style={textStyles.body}>প্রতি মণ</Text><Money poisha={numericPrice * 100} size="small" /></View><View style={styles.reviewRow}><Text style={textStyles.body}>মোট মূল্য</Text><Money poisha={numericPrice * quantity * 100} size="small" /></View><Text style={textStyles.meta}>{photos.length}টি ছবি · প্রথম ছবিটি কভার</Text></Card><View style={styles.deliveryNote}><Text style={styles.deliveryText}>ক্রেতার টাকা এসক্রোতে নিশ্চিত না হওয়া পর্যন্ত লটের অর্থ ছাড়া হবে না।</Text></View>{publishError ? <Text style={styles.publishError}>{publishError}</Text> : null}{published ? <Text style={styles.publishSuccess}>লটটি প্রকাশ হয়েছে।</Text> : null}</> : null}
      </ScrollView>
      <View style={styles.totalBar}>{step > 1 ? <View><Text style={textStyles.meta}>মোট মূল্য</Text><Money poisha={numericPrice * quantity * 100} size="small" /></View> : <View />}{step > 1 ? <OutlineButton label="পেছনে" onPress={() => setStep((current) => current - 1)} /> : null}<PrimaryButton disabled={(step === 1 && !selectedCrop) || (step === 2 && (!photos.length || !numericPrice || !pickup || !selectedDistrict)) || published} label={step < 3 ? "পরবর্তী" : published ? "প্রকাশ হয়েছে" : "প্রকাশ করুন"} loading={publishing} onPress={step < 3 ? () => setStep((current) => current + 1) : () => void publish()} style={styles.nextButton} /></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addPhoto: { alignItems: "center", borderColor: colors.border.strong, borderRadius: radii.card, borderStyle: "dashed", borderWidth: 1, gap: spacing.x2, height: 112, justifyContent: "center", width: 112 },
  addPhotoText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  bodySection: { gap: spacing.x4, padding: spacing.x4 },
  buttonRow: { flexDirection: "row", gap: spacing.x3, marginTop: spacing.x4 },
  chips: { gap: spacing.x2, paddingHorizontal: spacing.x4 },
  countBadge: { alignItems: "center", backgroundColor: colors.destructive.primary, borderRadius: radii.pill, height: 22, justifyContent: "center", minWidth: 22 },
  countText: { color: colors.background.surface, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.eyebrow },
  coverBadge: { backgroundColor: colors.brand.primary, borderRadius: radii.input, left: 4, paddingHorizontal: spacing.x2, paddingVertical: 2, position: "absolute", top: 4 },
  coverText: { color: colors.background.surface, fontFamily: fontFamilies.ui.bold, fontSize: fontSizes.eyebrow },
  cropChoice: { alignItems: "center", backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.card, borderWidth: 1, justifyContent: "center", minHeight: touchTargets.primaryMaximum, width: "47%" },
  cropChoiceActive: { backgroundColor: colors.brand.soft, borderColor: colors.brand.primary, borderWidth: 2 },
  cropChoiceText: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  cropChoiceTextActive: { color: colors.brand.deepText },
  cropGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x3 },
  deliveryNote: { backgroundColor: colors.brand.soft, borderColor: colors.border.default, borderRadius: radii.card, borderWidth: 1, padding: spacing.x4 },
  deliveryText: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, textAlign: "center" },
  fairBody: { color: colors.text.body, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, lineHeight: 20 },
  fairCard: { backgroundColor: colors.brand.soft, borderColor: colors.border.default, borderRadius: radii.card, borderWidth: 1, gap: spacing.x1, padding: spacing.x4 },
  fairBlue: { backgroundColor: colors.interactive.blueSoft },
  fairBlueText: { color: colors.interactive.blue },
  fairGood: { backgroundColor: colors.status.goodSoft },
  fairWarn: { backgroundColor: colors.status.warnSoft },
  fairWarnText: { color: colors.status.warnDark },
  fairTitle: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.metaLarge },
  farmerAvatar: { alignItems: "center", backgroundColor: colors.brand.hover, borderRadius: radii.pill, height: 48, justifyContent: "center", width: 48 },
  farmerAvatarText: { color: colors.background.surface, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  fieldLabel: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.body, marginTop: spacing.x2 },
  flex: { flex: 1 },
  greenHeader: { backgroundColor: colors.brand.primary, gap: spacing.x4, padding: spacing.x4 },
  greeting: { color: colors.console.mint, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  greetingName: { color: colors.background.surface, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  greetingRow: { alignItems: "center", flexDirection: "row", gap: spacing.x3 },
  headerIcon: { alignItems: "center", backgroundColor: colors.brand.hover, borderRadius: radii.pill, height: touchTargets.minimum, justifyContent: "center", position: "relative", width: touchTargets.minimum },
  headerUnread: { backgroundColor: colors.destructive.primary, borderRadius: radii.pill, height: 8, position: "absolute", right: 8, top: 7, width: 8 },
  homeContent: { flexGrow: 1 },
  homeSafeArea: { backgroundColor: colors.background.page, flex: 1 },
  kpiCard: { flex: 1, gap: spacing.x2 },
  kpiGrid: { flexDirection: "row", gap: spacing.x3 },
  lotAction: { alignItems: "center", flex: 1, minHeight: touchTargets.minimum, justifyContent: "center" },
  lotActions: { flexDirection: "row", marginBottom: -spacing.x4 },
  lotActionText: { color: colors.text.strong, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.body },
  lotCard: { gap: spacing.x2, paddingBottom: 0 },
  lotList: { gap: spacing.x3, padding: spacing.x4 },
  lotTitle: { color: colors.text.primary, flex: 1, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  lotTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  nextButton: { flex: 1, maxWidth: 220 },
  noHorizontalPadding: { paddingHorizontal: 0 },
  offerBuyer: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.bodyLarge },
  offerCard: { padding: spacing.x4 },
  offerMetaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  padded: { paddingHorizontal: spacing.x4 },
  photo: { height: "100%", width: "100%" },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x3 },
  photoTile: { borderRadius: radii.card, height: 112, overflow: "hidden", position: "relative", width: 112 },
  pickupRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.x2 },
  positive: { color: colors.status.good, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  postContent: { gap: spacing.x3, padding: spacing.x4 },
  postHeader: { backgroundColor: colors.background.surface, borderBottomColor: colors.border.default, borderBottomWidth: 1, gap: spacing.x3, padding: spacing.x4 },
  postSafeArea: { backgroundColor: colors.background.page, flex: 1 },
  priceInput: { backgroundColor: colors.background.surface, borderColor: colors.brand.primary, borderRadius: radii.control, borderWidth: 2, color: colors.text.primary, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.headingSmall, minHeight: 60, paddingHorizontal: spacing.x4 },
  priceRow: { alignItems: "center", flexDirection: "row", gap: spacing.x2 },
  publishError: { color: colors.destructive.primary, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  publishSuccess: { color: colors.status.good, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.meta },
  quantityRow: { flexDirection: "row", gap: spacing.x3 },
  quantityText: { color: colors.text.primary, fontFamily: fontFamilies.mono.semibold, fontSize: fontSizes.headingSmall },
  quantityValue: { alignItems: "center", backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 60 },
  rateCard: { backgroundColor: colors.brand.hover, borderRadius: radii.card, gap: spacing.x1, padding: spacing.x4 },
  rateLabel: { color: colors.console.mint, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge },
  rateValue: { color: colors.background.surface, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  rateRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  reviewRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.x3 },
  reviewTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.card },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: colors.text.primary, fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.cardSmall },
  stepActive: { backgroundColor: colors.brand.primary, borderRadius: radii.pill, flex: 1, height: 4 },
  stepButton: { alignItems: "center", backgroundColor: colors.background.surface, borderColor: colors.border.strong, borderRadius: radii.control, borderWidth: 1, height: 60, justifyContent: "center", width: 60 },
  stepCount: { color: colors.text.muted, fontFamily: fontFamilies.mono.medium, fontSize: fontSizes.body },
  stepIdle: { backgroundColor: colors.border.default, borderRadius: radii.pill, flex: 1, height: 4 },
  stepper: { flexDirection: "row", gap: spacing.x2 },
  totalBar: { alignItems: "center", backgroundColor: colors.background.surface, borderTopColor: colors.border.default, borderTopWidth: 1, flexDirection: "row", gap: spacing.x4, justifyContent: "space-between", padding: spacing.x4 },
  unit: { color: colors.text.muted, flex: 1, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.meta },
  verticalDivider: { backgroundColor: colors.border.hairline, width: 1 },
});
