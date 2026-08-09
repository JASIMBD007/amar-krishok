import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { Bell, Camera, Minus, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppScreen, Card, Divider, Money, OutlineButton, Pill, PrimaryButton, ScreenTitle, textStyles } from "../components/ui";
import { listings } from "../data/demo";
import { pickAndCompressPhoto, type PreparedPhoto } from "../media/images";
import type { RootStackParamList } from "../navigation/types";
import { colors, fontFamilies, fontSizes, radii, spacing, touchTargets } from "../theme";
import { mobileApi } from "../api/services";

export function FarmerHomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return (
    <SafeAreaView edges={["top"]} style={styles.homeSafeArea}>
      <ScrollView contentContainerStyle={styles.homeContent}>
        <View style={styles.greenHeader}>
          <View style={styles.greetingRow}><View style={styles.farmerAvatar}><Text style={styles.farmerAvatarText}>রউ</Text></View><View style={styles.flex}><Text style={styles.greeting}>শুভ সকাল</Text><Text style={styles.greetingName}>রহিম উদ্দিন</Text></View><Pressable accessibilityLabel="বিজ্ঞপ্তি" onPress={() => navigation.navigate("Notifications")} style={styles.headerIcon}><Bell color={colors.background.surface} size={20} /><View style={styles.headerUnread} /></Pressable></View>
          <View style={styles.rateCard}><Text style={styles.rateLabel}>আজ বগুড়ায় আলুর দর</Text><View style={styles.rateRow}><Money color={colors.background.surface} poisha={125000} /><Pill label="+2.4%" tone="good" /></View></View>
        </View>
        <View style={styles.bodySection}>
          <PrimaryButton label="ফসল পোস্ট করুন" onPress={() => navigation.navigate("PostCrop")} tone="red" />
          <View style={styles.kpiGrid}><Card style={styles.kpiCard}><Text style={textStyles.meta}>এসক্রোতে</Text><Money poisha={14256000} size="small" /><Text style={textStyles.meta}>২টি অর্ডার</Text></Card><Card style={styles.kpiCard}><Text style={textStyles.meta}>এ মাসে আয়</Text><Money poisha={31840000} size="small" /><Text style={styles.positive}>+14% গত মাস</Text></Card></View>
          <Card style={styles.offerCard}><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>নতুন অফার</Text><View style={styles.countBadge}><Text style={styles.countText}>2</Text></View></View><Divider /><Text style={styles.offerBuyer}>রফিক ট্রেডার্স</Text><View style={styles.offerMetaRow}><Text style={textStyles.meta}>আলু · গ্রেড A · ১২০ মণ</Text><Money poisha={129000} size="small" /></View><View style={styles.buttonRow}><PrimaryButton label="গ্রহণ করুন" style={styles.flex} /><OutlineButton label="বাতিল" style={styles.flex} /></View><Divider /><Text style={styles.offerBuyer}>চট্টগ্রাম হোলসেল</Text><View style={styles.offerMetaRow}><Text style={textStyles.meta}>টমেটো · গ্রেড B · ৪০ মণ</Text><Money poisha={94000} size="small" /></View></Card>
          <View style={styles.deliveryNote}><Text style={styles.deliveryText}>ডেলিভারি নিশ্চিত হলে ২ ঘণ্টার মধ্যে টাকা আপনার বিকাশে চলে যাবে।</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MyLotsScreen() {
  const [filter, setFilter] = useState("সব");
  const chips = ["সব · 4", "লাইভ · 3", "বিক্রি · 0", "বিরতি · 1"];
  const visible = useMemo(() => filter.startsWith("সব") ? listings.slice(0, 3) : filter.startsWith("বিরতি") ? listings.filter((item) => item.status === "PAUSED") : listings.filter((item) => item.status === "LIVE"), [filter]);
  return (
    <AppScreen contentStyle={styles.noHorizontalPadding}>
      <View style={styles.padded}><ScreenTitle bn="আমার লট" en="My lots" /></View>
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>{chips.map((chip) => <Pressable key={chip} onPress={() => setFilter(chip)}><Pill active={filter === chip} label={chip} /></Pressable>)}</ScrollView>
      <View style={styles.lotList}>{visible.map((listing) => <Card key={listing.id} style={styles.lotCard}><View style={styles.lotTitleRow}><Text style={styles.lotTitle}>{listing.cropBn} · গ্রেড {listing.grade}</Text><Pill label={listing.status === "LIVE" ? "লাইভ" : "বিরতি"} tone={listing.status === "LIVE" ? "good" : "neutral"} /></View><Text style={textStyles.meta}>{listing.quantityMon} মণ · {listing.pickup}</Text><View style={styles.priceRow}><Money poisha={listing.pricePoisha} size="small" /><Text style={styles.unit}>/ মণ</Text><Pill label={`${listing.marketDelta > 0 ? "+" : ""}${listing.marketDelta}%`} tone={listing.marketDelta >= 0 ? "good" : "blue"} /></View><Divider /><View style={styles.lotActions}><Pressable style={styles.lotAction}><Text style={styles.lotActionText}>সম্পাদনা</Text></Pressable><View style={styles.verticalDivider} /><Pressable style={styles.lotAction}><Text style={styles.lotActionText}>{listing.status === "LIVE" ? "বিরতি" : "চালু করুন"}</Text></Pressable></View></Card>)}</View>
    </AppScreen>
  );
}

export function PostCropScreen() {
  const [step, setStep] = useState(1);
  const [crop, setCrop] = useState({ id: "crop-potato", label: "আলু" });
  const [grade, setGrade] = useState<"A" | "B" | "C">("A");
  const [quantity, setQuantity] = useState(120);
  const [price, setPrice] = useState("1290");
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [pickup, setPickup] = useState("২৪ ঘণ্টায়");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const numericPrice = Number(price) || 0;
  const { data: rateRows } = useQuery({ queryFn: () => mobileApi.getRates(crop.id, "district-bogura"), queryKey: ["today-rate", crop.id, "district-bogura"], retry: false, staleTime: 0 });
  const todayDhaka = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Asia/Dhaka", year: "numeric" }).format(new Date());
  const freshRate = rateRows?.find((rate) => new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Asia/Dhaka", year: "numeric" }).format(new Date(rate.date)) === todayDhaka);
  const addPhoto = async () => {
    if (photos.length >= 6) return;
    const photo = await pickAndCompressPhoto();
    if (photo) setPhotos((current) => [...current, photo].slice(0, 6));
  };
  const publish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      const listing = await mobileApi.createListing({ cropId: crop.id, districtId: "district-bogura", grade, pickupWindow: pickup, pricePoisha: numericPrice * 100, quantityMon: quantity });
      for (const [position, photo] of photos.entries()) {
        const signed = await mobileApi.requestListingPhotoUpload(listing.id, "image/jpeg", photo.sizeBytes);
        const file = await (await fetch(photo.uri)).blob();
        const uploadResponse = await fetch(signed.uploadUrl, { body: file, headers: { "Content-Type": "image/jpeg" }, method: "PUT" });
        if (!uploadResponse.ok) throw new Error("photo upload failed");
        await mobileApi.commitListingPhoto(listing.id, signed.objectKey, position);
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
          <View style={styles.cropGrid}>{[{ id: "crop-potato", label: "আলু" }, { id: "crop-onion", label: "পেঁয়াজ" }, { id: "crop-tomato", label: "টমেটো" }, { id: "crop-boro-rice", label: "বোরো ধান" }].map((item) => <Pressable key={item.id} onPress={() => setCrop(item)} style={[styles.cropChoice, crop.id === item.id && styles.cropChoiceActive]}><Text style={[styles.cropChoiceText, crop.id === item.id && styles.cropChoiceTextActive]}>{item.label}</Text></Pressable>)}</View>
          <Text style={styles.fieldLabel}>গ্রেড</Text><View style={styles.pickupRow}>{(["A", "B", "C"] as const).map((item) => <Pressable key={item} onPress={() => setGrade(item)}><Pill active={grade === item} label={`গ্রেড ${item}`} /></Pressable>)}</View>
        </> : null}
        {step === 2 ? <>
        <Text style={styles.fieldLabel}>পরিমাণ (মণ)</Text>
        <View style={styles.quantityRow}><Pressable accessibilityLabel="পরিমাণ কমান" onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.stepButton}><Minus color={colors.text.primary} size={20} /></Pressable><View style={styles.quantityValue}><Text style={styles.quantityText}>{quantity}</Text></View><Pressable accessibilityLabel="পরিমাণ বাড়ান" onPress={() => setQuantity((value) => value + 1)} style={styles.stepButton}><Plus color={colors.text.primary} size={20} /></Pressable></View>
        <Text style={styles.fieldLabel}>আপনার দাম (৳ / মণ)</Text><TextInput accessibilityLabel="আপনার দাম" keyboardType="number-pad" onChangeText={(value) => setPrice(value.replace(/\D/g, ""))} style={styles.priceInput} value={price} />
        {freshRate ? <View style={styles.fairCard}><Text style={styles.fairTitle}>আজকের জেলার দরের তুলনা</Text><Text style={styles.fairBody}>আজকের বগুড়ার দর ৳ {Math.round(freshRate.price / 100).toLocaleString("en-IN")}। আপনার দাম দেওয়ার সময় এই লাইভ দরটি ব্যবহার করা হয়েছে।</Text></View> : null}
        <Text style={styles.fieldLabel}>ছবি (কমপক্ষে ১টি)</Text><View style={styles.photoRow}>{photos.map((photo, index) => <View key={photo.uri} style={styles.photoTile}><Image source={{ uri: photo.uri }} style={styles.photo} />{index === 0 ? <View style={styles.coverBadge}><Text style={styles.coverText}>COVER</Text></View> : null}</View>)}<Pressable accessibilityLabel="ছবি তুলুন" onPress={() => void addPhoto()} style={styles.addPhoto}><Camera color={colors.brand.primary} size={24} /><Text style={styles.addPhotoText}>ছবি তুলুন</Text></Pressable></View><Text style={textStyles.meta}>সর্বোচ্চ ৬টি · প্রতিটি ছবি 500 KB-এর নিচে সংকুচিত হয়</Text>
        <Text style={styles.fieldLabel}>পিকআপ</Text><View style={styles.pickupRow}>{["২৪ ঘণ্টায়", "৩ দিনে", "ক্রেতা ঠিক করবে"].map((option) => <Pressable key={option} onPress={() => setPickup(option)}><Pill active={pickup === option} label={option} /></Pressable>)}</View>
        </> : null}
        {step === 3 ? <><Card><Text style={styles.reviewTitle}>{crop.label} · গ্রেড {grade}</Text><Text style={textStyles.body}>{quantity} মণ · {pickup}</Text><Divider /><View style={styles.reviewRow}><Text style={textStyles.body}>প্রতি মণ</Text><Money poisha={numericPrice * 100} size="small" /></View><View style={styles.reviewRow}><Text style={textStyles.body}>মোট মূল্য</Text><Money poisha={numericPrice * quantity * 100} size="small" /></View><Text style={textStyles.meta}>{photos.length}টি ছবি · প্রথম ছবিটি কভার</Text></Card><View style={styles.deliveryNote}><Text style={styles.deliveryText}>ক্রেতার টাকা এসক্রোতে নিশ্চিত না হওয়া পর্যন্ত লটের অর্থ ছাড়া হবে না।</Text></View>{publishError ? <Text style={styles.publishError}>{publishError}</Text> : null}{published ? <Text style={styles.publishSuccess}>লটটি প্রকাশ হয়েছে।</Text> : null}</> : null}
      </ScrollView>
      <View style={styles.totalBar}>{step > 1 ? <View><Text style={textStyles.meta}>মোট মূল্য</Text><Money poisha={numericPrice * quantity * 100} size="small" /></View> : <View />}{step > 1 ? <OutlineButton label="পেছনে" onPress={() => setStep((current) => current - 1)} /> : null}<PrimaryButton disabled={(step === 2 && photos.length === 0) || published} label={step < 3 ? "পরবর্তী" : published ? "প্রকাশ হয়েছে" : "প্রকাশ করুন"} loading={publishing} onPress={step < 3 ? () => setStep((current) => current + 1) : () => void publish()} style={styles.nextButton} /></View>
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
  fairBody: { color: colors.brand.deepText, fontFamily: fontFamilies.bengali.regular, fontSize: fontSizes.metaLarge, lineHeight: 20 },
  fairCard: { backgroundColor: colors.brand.soft, borderColor: colors.border.default, borderRadius: radii.card, borderWidth: 1, gap: spacing.x1, padding: spacing.x4 },
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
