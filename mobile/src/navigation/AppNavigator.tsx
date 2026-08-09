import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { type LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BriefcaseBusiness, CircleDollarSign, Home, ListChecks, MessageCircle, PackageOpen, ShoppingBasket, UserRound, WalletCards } from "lucide-react-native";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import * as Notifications from "expo-notifications";

import { useSession } from "../auth/SessionProvider";
import { BuyerOrdersScreen, LotDetailScreen, MarketplaceScreen } from "../screens/BuyerScreens";
import { EarningsScreen, JobsScreen, PickupProofScreen, TripsScreen } from "../screens/CarrierScreens";
import { FarmerHomeScreen, MyLotsScreen, PostCropScreen } from "../screens/FarmerScreens";
import { ChatScreen, KycScreen, NotificationsScreen, OffersScreen, OrderTrackingScreen, ProfileScreen } from "../screens/SharedScreens";
import { OnboardingScreen } from "../screens/OnboardingScreens";
import { colors, fontFamilies, fontSizes, spacing, touchTargets } from "../theme";
import type { RootStackParamList } from "./types";
import { notificationDeepLink } from "../notifications/push";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const linking: LinkingOptions<RootStackParamList> = {
  config: { screens: { AppTabs: "", Chat: "chat/:threadId?", Kyc: "profile/kyc", LotDetail: "lot/:listingId", Notifications: "notifications", OrderTracking: "order/:orderId?", PickupProof: "trip/:tripId?/proof", PostCrop: "post-crop" } },
  getInitialURL: async () => (await ExpoLinking.getInitialURL()) ?? notificationDeepLink(),
  prefixes: [ExpoLinking.createURL("/"), "amarkrishok://"],
  subscribe(listener) {
    const linkSubscription = Linking.addEventListener("url", ({ url }) => listener(url));
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data.url;
      if (typeof url === "string") listener(url);
    });
    return () => { linkSubscription.remove(); notificationSubscription.remove(); };
  },
};

const tabBarStyle = { backgroundColor: colors.background.surface, borderTopColor: colors.border.default, height: touchTargets.minimum + spacing.x6, paddingBottom: spacing.x2, paddingTop: spacing.x2 } as const;

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.brand.primary,
  tabBarInactiveTintColor: colors.text.muted,
  tabBarLabelStyle: { fontFamily: fontFamilies.bengali.semibold, fontSize: fontSizes.eyebrow },
  tabBarStyle,
} as const;

function icon(Icon: typeof Home) {
  function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <Icon color={color} size={size} strokeWidth={1.75} />;
  }
  return TabBarIcon;
}

function FarmerTabs() {
  return <Tab.Navigator screenOptions={tabOptions}><Tab.Screen component={FarmerHomeScreen} name="FarmerHome" options={{ tabBarIcon: icon(Home), tabBarLabel: "হোম" }} /><Tab.Screen component={MyLotsScreen} name="FarmerLots" options={{ tabBarIcon: icon(ListChecks), tabBarLabel: "আমার লট" }} /><Tab.Screen component={OffersScreen} name="FarmerOffers" options={{ tabBarBadge: 2, tabBarIcon: icon(WalletCards), tabBarLabel: "অফার" }} /><Tab.Screen component={ChatScreen} name="FarmerChat" options={{ tabBarIcon: icon(MessageCircle), tabBarLabel: "বার্তা" }} /><Tab.Screen component={ProfileScreen} name="FarmerProfile" options={{ tabBarIcon: icon(UserRound), tabBarLabel: "প্রোফাইল" }} /></Tab.Navigator>;
}

function BuyerTabs() {
  return <Tab.Navigator screenOptions={tabOptions}><Tab.Screen component={MarketplaceScreen} name="BuyerMarket" options={{ tabBarIcon: icon(ShoppingBasket), tabBarLabel: "বাজার" }} /><Tab.Screen component={BuyerOrdersScreen} name="BuyerOrders" options={{ tabBarIcon: icon(PackageOpen), tabBarLabel: "অর্ডার" }} /><Tab.Screen component={ChatScreen} name="BuyerChat" options={{ tabBarIcon: icon(MessageCircle), tabBarLabel: "বার্তা" }} /><Tab.Screen component={ProfileScreen} name="BuyerProfile" options={{ tabBarIcon: icon(UserRound), tabBarLabel: "প্রোফাইল" }} /></Tab.Navigator>;
}

function CarrierTabs() {
  return <Tab.Navigator screenOptions={{ ...tabOptions, tabBarActiveTintColor: colors.status.warn }}><Tab.Screen component={TripsScreen} name="CarrierTrips" options={{ tabBarBadge: 6, tabBarIcon: icon(Home), tabBarLabel: "ট্রিপ" }} /><Tab.Screen component={JobsScreen} name="CarrierJobs" options={{ tabBarIcon: icon(BriefcaseBusiness), tabBarLabel: "কাজ" }} /><Tab.Screen component={EarningsScreen} name="CarrierEarnings" options={{ tabBarIcon: icon(CircleDollarSign), tabBarLabel: "আয়" }} /><Tab.Screen component={ChatScreen} name="CarrierChat" options={{ tabBarIcon: icon(MessageCircle), tabBarLabel: "বার্তা" }} /><Tab.Screen component={ProfileScreen} name="CarrierProfile" options={{ tabBarIcon: icon(UserRound), tabBarLabel: "প্রোফাইল" }} /></Tab.Navigator>;
}

function RoleTabs() {
  const { user } = useSession();
  if (user?.role === "FARMER") return <FarmerTabs />;
  if (user?.role === "BUYER") return <BuyerTabs />;
  return <CarrierTabs />;
}

export function AppNavigator() {
  const { isLoading, user } = useSession();
  if (isLoading) return <View style={styles.loading}><ActivityIndicator color={colors.brand.primary} /></View>;
  if (!user) return <OnboardingScreen />;
  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ animation: "slide_from_right", headerShown: false }}>
        <RootStack.Screen component={RoleTabs} name="AppTabs" />
        <RootStack.Screen component={ChatScreen} name="Chat" />
        <RootStack.Screen component={KycScreen} name="Kyc" />
        <RootStack.Screen component={LotDetailScreen} name="LotDetail" />
        <RootStack.Screen component={NotificationsScreen} name="Notifications" />
        <RootStack.Screen component={OrderTrackingScreen} name="OrderTracking" />
        <RootStack.Screen component={PickupProofScreen} name="PickupProof" />
        <RootStack.Screen component={PostCropScreen} name="PostCrop" />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", backgroundColor: colors.background.page, flex: 1, justifyContent: "center" },
});
