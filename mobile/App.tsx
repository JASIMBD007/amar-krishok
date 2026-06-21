import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ArrowLeft,
  Bell,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  Lock,
  LogOut,
  MapPin,
  Package,
  PlusCircle,
  Save,
  Search,
  Send,
  ShoppingBag,
  Sprout,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  createLot,
  createOrder,
  fetchDistricts,
  fetchMyLots,
  fetchMyOrders,
  fetchMyProfile,
  fetchPublicLots,
  login,
  registerAccount,
  requestPasswordReset,
  updateMyProfile,
  uploadImage,
} from "./src/api";
import { fallbackDistricts, fallbackLots, gradeOptions, upazillasByDistrict } from "./src/data";
import { roleLabel, t } from "./src/i18n";
import type { AccountProfile, AuthUser, CropLot, Language, Order, RegisterPayload, Role, SelectOption } from "./src/types";

type Screen = "marketplace" | "dashboard" | "post" | "orders" | "profile";

type MobileNotification = {
  body: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  id: string;
  screen?: Screen;
  title: string;
};

const roleOptions: Array<SelectOption<Role>> = [
  { label: "Admin", value: "admin" },
  { label: "Buyer", value: "buyer" },
  { label: "Seller / Farmer", value: "farmer" },
];

const cropImageFallback = "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=900&q=80";

function currency(value: number) {
  return `৳${Math.round(value).toLocaleString("en-US")}`;
}

function kgToDisplay(value: number, language: Language = "en") {
  if (value >= 1000) return `${Number((value / 1000).toFixed(1))} ${language === "bn" ? "টন" : "tons"}`;
  return `${value} ${language === "bn" ? "কেজি" : "kg"}`;
}

function pricePerKg(value: number, language: Language) {
  return `৳${Math.round(value)}/${language === "bn" ? "কেজি" : "kg"}`;
}

function formatDate(value?: string | null, language: Language = "en") {
  if (!value) return language === "bn" ? "দেওয়া হয়নি" : "Not added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", { day: "numeric", month: "short" });
}

function statusLabel(status: string, language: Language) {
  const normalized = status.toLowerCase();
  if (language === "en") return status;
  if (normalized.includes("active") || normalized.includes("approved")) return "সক্রিয়";
  if (normalized.includes("pending")) return "অপেক্ষায়";
  if (normalized.includes("reject")) return "বাতিল";
  if (normalized.includes("transit")) return "পথে আছে";
  if (normalized.includes("match")) return "ম্যাচিং";
  return status;
}

function matchesQuery(values: Array<string | number | null | undefined>, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(term));
}

function buildNotifications({
  language,
  lots,
  marketplaceLots,
  orders,
  profile,
  user,
}: {
  language: Language;
  lots: CropLot[];
  marketplaceLots: CropLot[];
  orders: Order[];
  profile: AccountProfile | null;
  user: AuthUser | null;
}) {
  if (!user) return [];

  const notifications: MobileNotification[] = [];

  if (profile?.status === "pending") {
    notifications.push({
      body: t(language, "profileReviewBody"),
      icon: UserRound,
      id: `profile-${profile.id}`,
      screen: "profile",
      title: t(language, "profileReview"),
    });
  }

  if (user.role === "farmer") {
    const latestLot = lots[0];
    if (latestLot) {
      notifications.push({
        body: `${latestLot.crop} · ${latestLot.district}${latestLot.upazilla ? `, ${latestLot.upazilla}` : ""} · ${statusLabel(latestLot.status, language)}`,
        icon: Sprout,
        id: `lot-${latestLot.id}`,
        screen: "post",
        title: t(language, "lotUpdate"),
      });
      notifications.push({
        body: `${pricePerKg(latestLot.pricePerKg, language)} · ${kgToDisplay(latestLot.quantityKg, language)}`,
        icon: WalletCards,
        id: `payment-${latestLot.id}`,
        screen: "post",
        title: t(language, "paymentUpdate"),
      });
    } else {
      notifications.push({
        body: t(language, "postFirstCropLot"),
        icon: PlusCircle,
        id: "farmer-first-lot",
        screen: "post",
        title: t(language, "lotUpdate"),
      });
    }
  }

  if (user.role === "buyer") {
    const latestOrder = orders[0];
    if (latestOrder) {
      notifications.push({
        body: `${latestOrder.items.map((item) => item.crop).join(", ") || latestOrder.id} · ${statusLabel(latestOrder.status, language)} · ${currency(latestOrder.totalValue)}`,
        icon: ShoppingBag,
        id: `order-${latestOrder.id}`,
        screen: "orders",
        title: t(language, "orderUpdate"),
      });
    } else {
      notifications.push({
        body: t(language, "marketplaceUpdateBody"),
        icon: Package,
        id: "buyer-marketplace",
        screen: "marketplace",
        title: t(language, "marketplaceUpdate"),
      });
    }
  }

  if (user.role === "admin") {
    if (lots.length) {
      notifications.push({
        body: `${lots.length} ${t(language, "farmerSupplyLots")} · ${kgToDisplay(lots.reduce((sum, lot) => sum + lot.quantityKg, 0), language)}`,
        icon: Sprout,
        id: `admin-lots-${lots.length}`,
        screen: "post",
        title: t(language, "lotUpdate"),
      });
    }
    if (orders.length) {
      notifications.push({
        body: `${orders.length} ${t(language, "buyerOrder")} · ${currency(orders.reduce((sum, order) => sum + order.totalValue, 0))}`,
        icon: ShoppingBag,
        id: `admin-orders-${orders.length}`,
        screen: "orders",
        title: t(language, "orderUpdate"),
      });
    }
    if (!lots.length && !orders.length && marketplaceLots.length) {
      notifications.push({
        body: `${marketplaceLots.length} ${t(language, "approvedMarketplaceLots")}`,
        icon: Package,
        id: `admin-marketplace-${marketplaceLots.length}`,
        screen: "marketplace",
        title: t(language, "marketplaceUpdate"),
      });
    }
  }

  return notifications.slice(0, 5);
}

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const [language, setLanguage] = useState<Language>("en");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [screen, setScreen] = useState<Screen>("marketplace");
  const [lots, setLots] = useState<CropLot[]>(fallbackLots);
  const [myLots, setMyLots] = useState<CropLot[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [districts, setDistricts] = useState(fallbackDistricts);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [registerRole, setRegisterRole] = useState<Exclude<Role, "admin">>("buyer");
  const [accountChoiceOpen, setAccountChoiceOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [reviewedNotificationIds, setReviewedNotificationIds] = useState<string[]>([]);

  useEffect(() => {
    fetchDistricts()
      .then((items) => setDistricts(items.length ? items : fallbackDistricts))
      .catch(() => setDistricts(fallbackDistricts));
    loadMarketplace();
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshProtectedData(user);
  }, [user]);

  async function loadMarketplace() {
    try {
      const backendLots = await fetchPublicLots();
      setLots(backendLots.length ? backendLots : fallbackLots);
    } catch {
      setLots(fallbackLots);
    }
  }

  async function refreshProtectedData(activeUser = user) {
    if (!activeUser) return;
    try {
      const nextProfile = await fetchMyProfile(activeUser.accessToken);
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    }

    if (activeUser.role === "farmer" || activeUser.role === "admin") {
      fetchMyLots(activeUser.accessToken).then(setMyLots).catch(() => setMyLots([]));
    }

    if (activeUser.role === "buyer" || activeUser.role === "admin") {
      fetchMyOrders(activeUser.accessToken).then(setOrders).catch(() => setOrders([]));
    }
  }

  function completeLogout() {
    setUser(null);
    setProfile(null);
    setMyLots([]);
    setOrders([]);
    setScreen("marketplace");
  }

  function requestLogout() {
    Alert.alert(t(language, "confirmLogoutTitle"), t(language, "confirmLogoutMessage"), [
      { text: t(language, "stayLoggedIn"), style: "cancel" },
      { text: t(language, "logout"), onPress: completeLogout, style: "destructive" },
    ]);
  }

  const visibleLots = useMemo(
    () => lots.filter((lot) => matchesQuery([lot.crop, lot.farmer, lot.district, lot.upazilla, lot.grade, lot.pricePerKg], search)),
    [lots, search],
  );
  const visibleMyLots = useMemo(
    () => myLots.filter((lot) => matchesQuery([lot.crop, lot.farmer, lot.district, lot.upazilla, lot.grade, lot.pricePerKg, lot.status], search)),
    [myLots, search],
  );
  const visibleOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesQuery(
          [order.id, order.district, order.upazilla, order.status, order.totalValue, ...order.items.flatMap((item) => [item.crop, item.quantityKg, item.offeredPricePerKg])],
          search,
        ),
      ),
    [orders, search],
  );
  const notifications = useMemo(
    () => buildNotifications({ language, lots: myLots, marketplaceLots: lots, orders, profile, user }),
    [language, lots, myLots, orders, profile, user],
  );
  const unreadNotifications = notifications.filter((notification) => !reviewedNotificationIds.includes(notification.id)).length;

  const protectedKicker = user?.role === "buyer" ? t(language, "buyerWorkspace") : user?.role === "farmer" ? t(language, "farmerWorkspace") : t(language, "adminWorkspace");
  const protectedTitle =
    screen === "dashboard"
      ? user?.role === "buyer"
        ? t(language, "buyerDashboard")
        : user?.role === "farmer"
          ? t(language, "farmerDashboard")
          : t(language, "adminSummary")
      : screen === "post"
        ? t(language, "postCrop")
      : screen === "orders"
        ? t(language, "orders")
        : screen === "profile"
          ? t(language, "profileSetting")
          : t(language, "marketplace");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Header
          language={language}
          notificationCount={unreadNotifications}
          onNotificationsPress={() => setNotificationOpen(true)}
          onLanguageChange={setLanguage}
          onNavigate={setScreen}
          compact={compact}
          user={user}
        />
        <ScrollView contentContainerStyle={[styles.page, user && styles.pageWithBottomTabs]} keyboardShouldPersistTaps="handled">
          {!user && authMode === "login" ? (
            <LoginScreen
              language={language}
              onCreateAccount={() => setAccountChoiceOpen(true)}
              onLoggedIn={(nextUser) => {
                setUser(nextUser);
                setScreen("dashboard");
              }}
            />
          ) : !user && authMode === "register" ? (
            <RegisterScreen
              districts={districts}
              language={language}
              onBack={() => setAuthMode("login")}
              onRegistered={() => {
                Alert.alert(t(language, "registrationSubmitted"), t(language, "adminVerifyAccount"));
                setAuthMode("login");
              }}
              role={registerRole}
            />
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.kicker}>{screen === "marketplace" ? t(language, "marketplace") : protectedKicker}</Text>
                <Text style={[styles.title, compact && styles.titleCompact]}>{screen === "marketplace" ? t(language, "marketplace") : protectedTitle}</Text>
              </View>
              {screen !== "profile" ? <SearchBox language={language} search={search} setSearch={setSearch} /> : null}
              {screen === "marketplace" ? (
                <MarketplaceScreen language={language} lots={visibleLots} onRefresh={loadMarketplace} />
              ) : screen === "dashboard" ? (
                <DashboardScreen
                  language={language}
                  marketplaceLots={visibleLots}
                  lots={visibleMyLots}
                  onNavigate={setScreen}
                  orders={visibleOrders}
                  role={user?.role ?? "buyer"}
                />
              ) : screen === "post" && user?.role !== "buyer" ? (
                <FarmerPostScreen
                  districts={districts}
                  language={language}
                  loading={loading}
                  onSubmit={async (payload, imageUri) => {
                    if (!user) return;
                    setLoading(true);
                    try {
                      const imageUrl = imageUri ? await uploadImage(user.accessToken, imageUri, "crop-lot-image") : undefined;
                      await createLot(user.accessToken, { ...payload, imageUrl });
                      Alert.alert(t(language, "cropLotSubmitted"), t(language, "adminApprovalMarketplace"));
                      await refreshProtectedData();
                      await loadMarketplace();
                    } catch (error) {
                      Alert.alert(t(language, "couldNotSubmitLot"), error instanceof Error ? error.message : t(language, "commonTryAgain"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              ) : screen === "orders" ? (
                <OrdersScreen
                  districts={districts}
                  language={language}
                  loading={loading}
                  lots={lots}
                  onSubmit={async (payload) => {
                    if (!user) return;
                    setLoading(true);
                    try {
                      await createOrder(user.accessToken, payload);
                      Alert.alert(t(language, "orderRequestSubmitted"), t(language, "teamReview"));
                      await refreshProtectedData();
                    } catch (error) {
                      Alert.alert(t(language, "couldNotCreateOrder"), error instanceof Error ? error.message : t(language, "commonTryAgain"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  orders={visibleOrders}
                  role={user?.role ?? "buyer"}
                />
              ) : (
                <ProfileScreen
                  districts={districts}
                  language={language}
                  onLogout={requestLogout}
                  onNavigate={setScreen}
                  onNotificationsPress={() => setNotificationOpen(true)}
                  onSave={async (payload) => {
                    if (!user) return;
                    setLoading(true);
                    try {
                      const updated = await updateMyProfile(user.accessToken, payload);
                      setProfile(updated);
                      Alert.alert(t(language, "saveProfile"), t(language, "updateProfileSuccess"));
                    } catch (error) {
                      Alert.alert(t(language, "couldNotUpdateProfile"), error instanceof Error ? error.message : t(language, "commonTryAgain"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  profile={profile}
                />
              )}
            </>
          )}
        </ScrollView>
        {user ? <BottomTabs language={language} role={user.role} screen={screen} setScreen={setScreen} /> : null}
        <CreateAccountModal
          language={language}
          onClose={() => setAccountChoiceOpen(false)}
          onPick={(role) => {
            setRegisterRole(role);
            setAuthMode("register");
            setAccountChoiceOpen(false);
          }}
          visible={accountChoiceOpen}
        />
        <NotificationModal
          language={language}
          notifications={notifications}
          onClose={() => setNotificationOpen(false)}
          onMarkAll={() => setReviewedNotificationIds((ids) => Array.from(new Set([...ids, ...notifications.map((notification) => notification.id)])))}
          onOpenNotification={(notification) => {
            setReviewedNotificationIds((ids) => (ids.includes(notification.id) ? ids : [...ids, notification.id]));
            if (notification.screen) setScreen(notification.screen);
            setNotificationOpen(false);
          }}
          reviewedIds={reviewedNotificationIds}
          user={user}
          visible={notificationOpen}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({
  compact,
  language,
  notificationCount,
  onLanguageChange,
  onNavigate,
  onNotificationsPress,
  user,
}: {
  compact: boolean;
  language: Language;
  notificationCount: number;
  onLanguageChange: (language: Language) => void;
  onNavigate: (screen: Screen) => void;
  onNotificationsPress: () => void;
  user: AuthUser | null;
}) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Pressable onPress={() => onNavigate(user ? "dashboard" : "marketplace")} style={styles.brand}>
        <View style={[styles.logoBox, compact && styles.logoBoxCompact]}>
          <Sprout color="#fff" size={compact ? 23 : 26} />
        </View>
        <View style={styles.brandCopy}>
          <Text numberOfLines={1} style={[styles.brandTitle, compact && styles.brandTitleCompact]}>
            AmarKrishok
          </Text>
          {!compact ? <Text numberOfLines={1} style={styles.brandSubtitle}>{t(language, "appSubtitle")}</Text> : null}
        </View>
      </Pressable>
      <View style={[styles.headerActions, compact && styles.headerActionsCompact]}>
        <View style={styles.languageToggle}>
          <Pressable
            accessibilityLabel="Switch to English"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onLanguageChange("en")}
            style={[styles.languageButton, compact && styles.languageButtonCompact, language === "en" && styles.languageButtonActive]}
          >
            <Text style={[styles.languageText, language === "en" && styles.languageTextActive]}>EN</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Switch to Bangla"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onLanguageChange("bn")}
            style={[styles.languageButton, compact && styles.languageButtonCompact, language === "bn" && styles.languageButtonActive]}
          >
            <Text style={[styles.languageText, language === "bn" && styles.languageTextActive]}>{compact ? "BN" : "বাংলা"}</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel={t(language, "notifications")}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onNotificationsPress}
          style={[styles.notificationButton, compact && styles.notificationButtonCompact]}
          testID="notification-button"
        >
          <Bell color="#17382b" size={22} />
          {notificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

function LoginScreen({
  language,
  onCreateAccount,
  onLoggedIn,
}: {
  language: Language;
  onCreateAccount: () => void;
  onLoggedIn: (user: AuthUser) => void;
}) {
  const [role, setRole] = useState<Role>("buyer");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      onLoggedIn(await login(role, identifier.trim(), password));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t(language, "loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.authCard}>
      <Text style={styles.authTitle}>{t(language, "loginToAmarkrishok")}</Text>
      <Text style={styles.authCopy}>{t(language, "loginCopy")}</Text>
      <SelectField language={language} label={`${t(language, "selectAccountType")} *`} options={roleOptions.map((option) => ({ ...option, label: roleLabel(language, option.value) }))} value={role} onChange={setRole} />
      <Field
        autoCapitalize="none"
        keyboardType={role === "admin" ? "default" : "phone-pad"}
        label={role === "admin" ? `${t(language, "username")} *` : `${t(language, "mobile")} *`}
        onChangeText={setIdentifier}
        placeholder={role === "admin" ? t(language, "adminUsername") : "01700000000"}
        value={identifier}
      />
      <Field
        label={`${t(language, "password")} *`}
        onChangeText={setPassword}
        placeholder={t(language, "password")}
        rightIcon={
          <Pressable onPress={() => setShowPassword((value) => !value)}>
            {showPassword ? <EyeOff color="#50685c" size={22} /> : <Eye color="#50685c" size={22} />}
          </Pressable>
        }
        secureTextEntry={!showPassword}
        value={password}
      />
      {error ? <Text style={styles.errorBox}>{error}</Text> : null}
      <PrimaryButton disabled={busy} icon={<Lock color="#fff" size={20} />} label={busy ? "..." : t(language, "login")} onPress={submit} />
      <View style={styles.authLinks}>
        <Text style={styles.muted}>{t(language, "forgotPassword")} </Text>
        <Pressable onPress={() => setResetOpen(true)}>
          <Text style={styles.link}>{t(language, "reset")}</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.centerRow}>
        <Text style={styles.muted}>{language === "bn" ? "অ্যাকাউন্ট নেই? " : "Don't have an account? "}</Text>
        <Pressable onPress={onCreateAccount}>
          <Text style={styles.link}>{t(language, "createAccount")}</Text>
        </Pressable>
      </View>
      <PasswordResetModal language={language} onClose={() => setResetOpen(false)} visible={resetOpen} />
    </View>
  );
}

function PasswordResetModal({
  defaultPhone = "",
  defaultRole = "buyer",
  language,
  onClose,
  visible,
}: {
  defaultPhone?: string;
  defaultRole?: Exclude<Role, "admin">;
  language: Language;
  onClose: () => void;
  visible: boolean;
}) {
  const [role, setRole] = useState<Exclude<Role, "admin">>(defaultRole);
  const [phone, setPhone] = useState(defaultPhone);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRole(defaultRole);
    setPhone(defaultPhone);
    setPassword("");
    setConfirm("");
  }, [defaultPhone, defaultRole, visible]);

  async function submit() {
    if (password !== confirm) {
      Alert.alert(t(language, "passwordsDoNotMatch"));
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(role, phone.trim(), password);
      Alert.alert(t(language, "resetRequestSent"), t(language, "resetRequiresAdmin"));
      onClose();
    } catch (error) {
      Alert.alert(t(language, "couldNotRequestReset"), error instanceof Error ? error.message : t(language, "commonTryAgain"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog onClose={onClose} title={t(language, "passwordReset")} visible={visible}>
      <View style={styles.resetDialogContent}>
        <SelectField
          language={language}
          label={`${t(language, "selectAccountType")} *`}
          options={[
            { label: roleLabel(language, "buyer"), value: "buyer" },
            { label: roleLabel(language, "farmer"), value: "farmer" },
          ]}
          style={styles.resetDialogField}
          value={role}
          onChange={setRole}
        />
        <Field
          keyboardType="phone-pad"
          label={`${t(language, "mobile")} *`}
          onChangeText={setPhone}
          placeholder="01700000000"
          style={styles.resetDialogField}
          value={phone}
        />
        <Field
          label={`${t(language, "newPassword")} *`}
          onChangeText={setPassword}
          placeholder={t(language, "newPassword")}
          secureTextEntry
          style={styles.resetDialogField}
          value={password}
        />
        <Field
          label={`${t(language, "confirmPassword")} *`}
          onChangeText={setConfirm}
          placeholder={t(language, "confirmPassword")}
          secureTextEntry
          style={styles.resetDialogField}
          value={confirm}
        />
        <PrimaryButton disabled={busy} icon={<Send color="#fff" size={18} />} label={busy ? "..." : t(language, "submit")} onPress={submit} />
      </View>
    </Dialog>
  );
}

function RegisterScreen({
  districts,
  language,
  onBack,
  onRegistered,
  role,
}: {
  districts: string[];
  language: Language;
  onBack: () => void;
  onRegistered: () => void;
  role: Exclude<Role, "admin">;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<RegisterPayload>({
    address: "",
    district: districts[0] || "",
    focus: "",
    identity: "",
    name: "",
    organization: "",
    password: "",
    phone: "",
    role,
    upazilla: "",
  });

  useEffect(() => {
    setForm((current) => ({ ...current, role }));
  }, [role]);

  const upazillaOptions = (upazillasByDistrict[form.district] || []).map((value) => ({ label: value, value }));

  async function submit() {
    try {
      await registerAccount(form);
      onRegistered();
    } catch (error) {
      Alert.alert(t(language, "registrationFailed"), error instanceof Error ? error.message : t(language, "commonTryAgain"));
    }
  }

  return (
    <View style={styles.authCard}>
      <Text style={styles.kicker}>{t(language, "newRegistration")}</Text>
      <Text style={styles.authTitle}>{role === "buyer" ? t(language, "createBuyerAccount") : t(language, "createSellerAccount")}</Text>
      <View style={styles.twoColumn}>
        <Field label={t(language, "name")} onChangeText={(name) => setForm({ ...form, name })} placeholder={t(language, "name")} value={form.name} />
        <Field keyboardType="phone-pad" label={t(language, "mobile")} onChangeText={(phone) => setForm({ ...form, phone })} placeholder="01700000000" value={form.phone} />
        <Field
          label={t(language, "password")}
          onChangeText={(password) => setForm({ ...form, password })}
          placeholder={t(language, "password")}
          rightIcon={
            <Pressable onPress={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff color="#50685c" size={22} /> : <Eye color="#50685c" size={22} />}
            </Pressable>
          }
          secureTextEntry={!showPassword}
          value={form.password}
        />
        <Field label={t(language, "organization")} onChangeText={(organization) => setForm({ ...form, organization })} placeholder={t(language, "organizationPlaceholder")} value={form.organization} />
        <Field label={t(language, "identity")} onChangeText={(identity) => setForm({ ...form, identity })} placeholder={t(language, "identityPlaceholder")} value={form.identity} />
        <Field label={t(language, "focus")} onChangeText={(focus) => setForm({ ...form, focus })} placeholder={t(language, "focusPlaceholder")} value={form.focus} />
        <SelectField
          language={language}
          label={t(language, "district")}
          options={districts.map((value) => ({ label: value, value }))}
          value={form.district}
          onChange={(district) => setForm({ ...form, district, upazilla: "" })}
        />
        <SelectField
          language={language}
          label={t(language, "upazilla")}
          options={upazillaOptions}
          placeholder={form.district ? t(language, "selectUpazilla") : t(language, "selectDistrict")}
          value={form.upazilla}
          onChange={(upazilla) => setForm({ ...form, upazilla })}
        />
      </View>
      <Field label={t(language, "address")} onChangeText={(address) => setForm({ ...form, address })} placeholder={t(language, "addressPlaceholder")} value={form.address} />
      <View style={styles.rowGap}>
        <SecondaryButton label={t(language, "home")} onPress={onBack} />
        <PrimaryButton icon={<CheckCircle2 color="#fff" size={20} />} label={t(language, "register")} onPress={submit} />
      </View>
    </View>
  );
}

function MarketplaceScreen({ language, lots, onRefresh }: { language: Language; lots: CropLot[]; onRefresh: () => void }) {
  return (
    <View>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{t(language, "marketplace")}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>{t(language, "refresh")}</Text>
        </TouchableOpacity>
      </View>
      {lots.length ? lots.map((lot) => (
        <LotCard key={lot.id} language={language} lot={lot} />
      )) : <EmptyState text={t(language, "noApprovedLots")} />}
    </View>
  );
}

function DashboardScreen({
  language,
  marketplaceLots,
  lots,
  onNavigate,
  orders,
  role,
}: {
  language: Language;
  marketplaceLots: CropLot[];
  lots: CropLot[];
  onNavigate: (screen: Screen) => void;
  orders: Order[];
  role: Role;
}) {
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantityKg, 0);
  const averageAsk = lots.length ? lots.reduce((sum, lot) => sum + lot.pricePerKg, 0) / lots.length : 0;
  const orderValue = orders.reduce((sum, order) => sum + order.totalValue, 0);

  if (role === "admin") {
    return (
      <View>
        <MetricGrid
          items={[
            { icon: Package, label: t(language, "lots"), value: String(lots.length), detail: t(language, "farmerSupplyLots") },
            { icon: ShoppingBag, label: t(language, "orders"), value: String(orders.length), detail: t(language, "buyerDemand") },
            { icon: WalletCards, label: t(language, "gmv"), value: currency(orderValue), detail: t(language, "orderValue") },
            { icon: Truck, label: t(language, "logistics"), value: t(language, "live"), detail: t(language, "pickupFollowUp") },
          ]}
        />
        <ActionGrid
          actions={[
            { icon: Package, label: t(language, "lots"), onPress: () => onNavigate("post") },
            { icon: ShoppingBag, label: t(language, "orders"), onPress: () => onNavigate("orders") },
          ]}
        />
        <MobilePanel icon={<ShoppingBag color="#157747" size={22} />} title={t(language, "buyerDemandQueue")}>
          <OrderList language={language} orders={orders.slice(0, 4)} emptyText={t(language, "noOrderRecords")} />
        </MobilePanel>
        <MobilePanel icon={<Sprout color="#157747" size={22} />} title={t(language, "verifiedSupplyLots")}>
          <LotList language={language} lots={lots.slice(0, 4)} emptyText={t(language, "noFarmerLots")} />
        </MobilePanel>
      </View>
    );
  }

  return (
    <View>
      <MetricGrid
        items={
          role === "farmer"
            ? [
                { icon: Package, label: t(language, "activeLots"), value: String(lots.length), detail: t(language, "readyForBuyerRequests") },
                { icon: Sprout, label: t(language, "listedQuantity"), value: kgToDisplay(totalQuantity, language), detail: t(language, "fromYourLots") },
                { icon: CheckCircle2, label: t(language, "averageAsk"), value: averageAsk ? pricePerKg(averageAsk, language) : pricePerKg(0, language), detail: t(language, "approvedSupply") },
                { icon: WalletCards, label: t(language, "estimatedPayout"), value: currency(totalQuantity * averageAsk), detail: t(language, "afterBuyerConfirmation") },
              ]
            : [
                { icon: ShoppingBag, label: t(language, "orders"), value: String(orders.length), detail: t(language, "yourOrderRequests") },
                { icon: WalletCards, label: t(language, "orderValue"), value: currency(orderValue), detail: t(language, "requestedSupply") },
                { icon: Truck, label: t(language, "pickup"), value: t(language, "team"), detail: t(language, "afterOrderApproval") },
                { icon: Package, label: t(language, "availableLots"), value: String(marketplaceLots.length), detail: t(language, "approvedSupply") },
              ]
        }
      />
      {role === "farmer" ? (
        <>
          <MobilePanel icon={<Sprout color="#157747" size={22} />} title={t(language, "yourCropLots")}>
            <LotList language={language} lots={lots.slice(0, 5)} emptyText={t(language, "postFirstCropLot")} />
          </MobilePanel>
        </>
      ) : (
        <>
          <ActionGrid
            actions={[
              { icon: ShoppingBag, label: t(language, "requestOrder"), onPress: () => onNavigate("orders") },
              { icon: Package, label: t(language, "marketplace"), onPress: () => onNavigate("marketplace") },
            ]}
          />
          <MobilePanel icon={<ShoppingBag color="#157747" size={22} />} title={t(language, "yourOrders")}>
            <OrderList language={language} orders={orders.slice(0, 5)} emptyText={t(language, "noOrderRecords")} />
          </MobilePanel>
          <MobilePanel icon={<Package color="#157747" size={22} />} title={t(language, "approvedMarketplaceLots")}>
            <LotList language={language} lots={marketplaceLots.slice(0, 4)} emptyText={t(language, "noApprovedLots")} />
          </MobilePanel>
        </>
      )}
    </View>
  );
}

function FarmerPostScreen({
  districts,
  language,
  loading,
  onSubmit,
}: {
  districts: string[];
  language: Language;
  loading: boolean;
  onSubmit: (payload: Parameters<typeof createLot>[1], imageUri?: string) => Promise<void>;
}) {
  const kgUnit = language === "bn" ? "কেজি" : "kg";
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [form, setForm] = useState({
    crop: "",
    district: districts[0] || "",
    grade: "A",
    harvestDate: "",
    notes: "",
    pricePerKg: "",
    quantityKg: "",
    upazilla: "",
  });
  const upazillaOptions = (upazillasByDistrict[form.district] || []).map((value) => ({ label: value, value }));

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(language === "bn" ? "অনুমতি প্রয়োজন" : "Permission needed", language === "bn" ? "ফসলের ছবি বেছে নিতে ফটো অ্যাক্সেস দিন।" : "Please allow photo access to choose a crop image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
    if (!result.canceled) setImageUri(result.assets[0]?.uri);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t(language, "cropListing")}</Text>
      <Text style={styles.panelTitle}>{t(language, "postCrop")}</Text>
      <View style={styles.twoColumn}>
        <Field label={t(language, "crop")} onChangeText={(crop) => setForm({ ...form, crop })} placeholder={language === "bn" ? "টমেটো" : "Tomato"} value={form.crop} />
        <SelectField language={language} label={t(language, "district")} options={districts.map((value) => ({ label: value, value }))} value={form.district} onChange={(district) => setForm({ ...form, district, upazilla: "" })} />
        <SelectField language={language} label={t(language, "upazilla")} options={upazillaOptions} placeholder={t(language, "selectUpazilla")} value={form.upazilla} onChange={(upazilla) => setForm({ ...form, upazilla })} />
        <Field keyboardType="numeric" label={`${t(language, "quantity")} (${kgUnit})`} onChangeText={(quantityKg) => setForm({ ...form, quantityKg })} placeholder="1200" value={form.quantityKg} />
        <Field keyboardType="numeric" label={`${t(language, "price")} / ${kgUnit}`} onChangeText={(pricePerKg) => setForm({ ...form, pricePerKg })} placeholder="34" value={form.pricePerKg} />
        <Field label={t(language, "harvestDate")} onChangeText={(harvestDate) => setForm({ ...form, harvestDate })} placeholder="2026-06-12" value={form.harvestDate} />
        <SelectField language={language} label={t(language, "grade")} options={gradeOptions.map((value) => ({ label: value, value }))} value={form.grade} onChange={(grade) => setForm({ ...form, grade })} />
      </View>
      <TouchableOpacity onPress={pickImage} style={styles.uploadBox}>
        <PlusCircle color="#157747" size={20} />
        <Text style={styles.uploadText}>{imageUri ? t(language, "cropImageSelected") : t(language, "cropImage")}</Text>
      </TouchableOpacity>
      <Field label={t(language, "notes")} multiline onChangeText={(notes) => setForm({ ...form, notes })} placeholder={t(language, "packagingPlaceholder")} value={form.notes} />
      <PrimaryButton
        disabled={loading}
        icon={<PlusCircle color="#fff" size={20} />}
        label={loading ? "..." : t(language, "postCrop")}
        onPress={() =>
          onSubmit(
            {
              crop: form.crop,
              district: form.district,
              grade: form.grade,
              harvestDate: form.harvestDate || undefined,
              notes: form.notes || undefined,
              pricePerKg: Number(form.pricePerKg),
              quantityKg: Number(form.quantityKg),
              upazilla: form.upazilla,
            },
            imageUri,
          )
        }
      />
    </View>
  );
}

function OrdersScreen({
  districts,
  language,
  loading,
  lots,
  onSubmit,
  orders,
  role,
}: {
  districts: string[];
  language: Language;
  loading: boolean;
  lots: CropLot[];
  onSubmit: (payload: Parameters<typeof createOrder>[1]) => Promise<void>;
  orders: Order[];
  role: Role;
}) {
  const kgUnit = language === "bn" ? "কেজি" : "kg";
  const [form, setForm] = useState({
    crop: lots[0]?.crop || "",
    deliveryAddress: "",
    district: districts[0] || "",
    notes: "",
    offeredPricePerKg: "",
    quantityKg: "",
    targetDate: "",
    upazilla: "",
  });
  const upazillaOptions = (upazillasByDistrict[form.district] || []).map((value) => ({ label: value, value }));

  return (
    <View>
      {role === "buyer" ? (
        <View style={styles.card}>
          <Text style={styles.kicker}>{t(language, "buyerOrder")}</Text>
          <Text style={styles.panelTitle}>{t(language, "requestOrder")}</Text>
          <View style={styles.twoColumn}>
            <Field label={t(language, "crop")} onChangeText={(crop) => setForm({ ...form, crop })} placeholder={language === "bn" ? "টমেটো" : "Tomato"} value={form.crop} />
            <Field keyboardType="numeric" label={`${t(language, "quantity")} (${kgUnit})`} onChangeText={(quantityKg) => setForm({ ...form, quantityKg })} placeholder="500" value={form.quantityKg} />
            <Field keyboardType="numeric" label={`${t(language, "price")} / ${kgUnit}`} onChangeText={(offeredPricePerKg) => setForm({ ...form, offeredPricePerKg })} placeholder="34" value={form.offeredPricePerKg} />
            <SelectField language={language} label={t(language, "district")} options={districts.map((value) => ({ label: value, value }))} value={form.district} onChange={(district) => setForm({ ...form, district, upazilla: "" })} />
            <SelectField language={language} label={t(language, "upazilla")} options={upazillaOptions} placeholder={t(language, "selectUpazilla")} value={form.upazilla} onChange={(upazilla) => setForm({ ...form, upazilla })} />
            <Field label={t(language, "targetDate")} onChangeText={(targetDate) => setForm({ ...form, targetDate })} placeholder="2026-06-12" value={form.targetDate} />
          </View>
          <Field label={t(language, "address")} onChangeText={(deliveryAddress) => setForm({ ...form, deliveryAddress })} placeholder={t(language, "deliveryAddressPlaceholder")} value={form.deliveryAddress} />
          <Field label={t(language, "notes")} multiline onChangeText={(notes) => setForm({ ...form, notes })} placeholder={t(language, "packagingPlaceholder")} value={form.notes} />
          <PrimaryButton
            disabled={loading}
            icon={<Send color="#fff" size={20} />}
            label={loading ? "..." : t(language, "requestOrder")}
            onPress={() =>
              onSubmit({
                deliveryAddress: form.deliveryAddress,
                district: form.district,
                items: [
                  {
                    crop: form.crop,
                    offeredPricePerKg: Number(form.offeredPricePerKg),
                    quantityKg: Number(form.quantityKg),
                  },
                ],
                notes: form.notes || undefined,
                targetDate: form.targetDate || undefined,
                upazilla: form.upazilla,
              })
            }
          />
        </View>
      ) : null}
      <Text style={styles.panelTitle}>{t(language, "orders")}</Text>
      {orders.length ? orders.map((order) => <OrderCard key={order.id} language={language} order={order} />) : <EmptyState text={t(language, "noOrderRecords")} />}
    </View>
  );
}

function ProfileScreen({
  districts,
  language,
  onLogout,
  onNavigate,
  onNotificationsPress,
  onSave,
  profile,
}: {
  districts: string[];
  language: Language;
  onLogout: () => void;
  onNavigate: (screen: Screen) => void;
  onNotificationsPress: () => void;
  onSave: (payload: Omit<AccountProfile, "id" | "phone" | "role" | "status" | "username">) => Promise<void>;
  profile: AccountProfile | null;
}) {
  const [profileMode, setProfileMode] = useState<"settings" | "edit">("settings");
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [form, setForm] = useState({
    address: "",
    district: districts[0] || "",
    focus: "",
    identity: "",
    name: "",
    organization: "",
    upazilla: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      address: profile.address,
      district: profile.district || districts[0] || "",
      focus: profile.focus,
      identity: profile.identity,
      name: profile.name,
      organization: profile.organization,
      upazilla: profile.upazilla,
    });
  }, [districts, profile]);

  const upazillaOptions = (upazillasByDistrict[form.district] || []).map((value) => ({ label: value, value }));

  if (!profile) return <EmptyState text={t(language, "profileLoading")} />;

  const resetRole: Exclude<Role, "admin"> = profile.role === "farmer" ? "farmer" : "buyer";

  async function saveProfile() {
    await onSave(form);
    setProfileMode("settings");
  }

  async function pickProfileImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t(language, "photoPermissionTitle"), t(language, "photoPermissionBody"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });

    if (!result.canceled) {
      setProfilePhotoUri(result.assets[0]?.uri ?? null);
    }
  }

  function openPasswordReset() {
    if (profile?.role === "admin") {
      Alert.alert(t(language, "changePassword"), t(language, "adminPasswordManaged"));
      return;
    }
    setResetOpen(true);
  }

  function openPayments() {
    Alert.alert(t(language, "payments"), t(language, "paymentsSubtitle"));
  }

  function openFaq() {
    Alert.alert(t(language, "faq"), t(language, "faqMessage"));
  }

  if (profileMode === "edit") {
    return (
      <View style={styles.profileEditScreen}>
        <View style={styles.profileEditHeader}>
          <TouchableOpacity accessibilityLabel={t(language, "profileSetting")} onPress={() => setProfileMode("settings")} style={styles.profileBackButton}>
            <ArrowLeft color="#17382b" size={22} />
          </TouchableOpacity>
          <Text style={styles.profileEditHeaderTitle}>{t(language, "editProfile")}</Text>
          <View style={styles.profileBackSpacer} />
        </View>

        <View style={styles.profilePhotoSection}>
          <TouchableOpacity accessibilityRole="button" onPress={pickProfileImage} style={styles.profilePhotoWrap}>
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <UserRound color="#157747" size={44} />
              </View>
            )}
            <View style={styles.profileCameraBadge}>
              <Camera color="#fff" size={16} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profilePhotoHint}>{t(language, "changePhoto")}</Text>
        </View>

        <View style={styles.editProfileForm}>
          <View style={styles.twoColumn}>
            <Field label={t(language, "name")} onChangeText={(name) => setForm({ ...form, name })} value={form.name} />
            <Field editable={false} label={t(language, "mobile")} value={profile.phone || t(language, "phoneNotAdded")} />
            <Field label={t(language, "organization")} onChangeText={(organization) => setForm({ ...form, organization })} value={form.organization} />
            <SelectField language={language} label={t(language, "district")} options={districts.map((value) => ({ label: value, value }))} value={form.district} onChange={(district) => setForm({ ...form, district, upazilla: "" })} />
            <SelectField language={language} label={t(language, "upazilla")} options={upazillaOptions} placeholder={t(language, "selectUpazilla")} value={form.upazilla} onChange={(upazilla) => setForm({ ...form, upazilla })} />
            <Field label={t(language, "identity")} onChangeText={(identity) => setForm({ ...form, identity })} value={form.identity} />
          </View>
          <Field label={t(language, "focus")} onChangeText={(focus) => setForm({ ...form, focus })} value={form.focus} />
          <Field label={t(language, "address")} multiline onChangeText={(address) => setForm({ ...form, address })} value={form.address} />
          <PrimaryButton icon={<Save color="#fff" size={20} />} label={t(language, "saveProfile")} onPress={saveProfile} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.profileSettings}>
      <View style={styles.profileSummaryCard}>
        <View style={styles.profileAvatar}>
          {profilePhotoUri ? <Image source={{ uri: profilePhotoUri }} style={styles.profileAvatarImage} /> : <UserRound color="#157747" size={26} />}
        </View>
        <View style={styles.profileSummaryCopy}>
          <Text style={styles.profileSummaryName}>{profile.name || roleLabel(language, profile.role)}</Text>
          <Text style={styles.profileSummaryMeta}>
            {profile.organization || roleLabel(language, profile.role)}
            {profile.phone ? ` · ${profile.phone}` : ""}
          </Text>
          <Text style={styles.profileSummaryMeta}>
            {[profile.district, profile.upazilla].filter(Boolean).join(", ") || t(language, "districtNotAdded")}
          </Text>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>{t(language, "general")}</Text>
        <SettingsItem icon={UserRound} onPress={() => setProfileMode("edit")} subtitle={t(language, "editProfileSubtitle")} title={t(language, "editProfile")} />
        <SettingsItem icon={Lock} onPress={openPasswordReset} subtitle={t(language, "changePasswordSubtitle")} title={t(language, "changePassword")} />
        <SettingsItem icon={ShoppingBag} onPress={() => onNavigate("orders")} subtitle={t(language, "ordersSubtitle")} title={t(language, "orders")} />
        <SettingsItem icon={WalletCards} onPress={openPayments} subtitle={t(language, "paymentsSubtitle")} title={t(language, "payments")} />
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>{t(language, "preferences")}</Text>
        <SettingsItem icon={Bell} onPress={onNotificationsPress} subtitle={t(language, "notificationPreferences")} title={t(language, "notifications")} trailing="toggle" />
        <SettingsItem icon={CheckCircle2} onPress={openFaq} subtitle={t(language, "faqSubtitle")} title={t(language, "faq")} />
        <SettingsItem danger icon={LogOut} onPress={onLogout} subtitle={t(language, "logoutSubtitle")} title={t(language, "logout")} />
      </View>

      <PasswordResetModal defaultPhone={profile.phone} defaultRole={resetRole} language={language} onClose={() => setResetOpen(false)} visible={resetOpen} />
    </View>
  );
}

function SettingsItem({
  danger,
  icon: Icon,
  onPress,
  subtitle,
  title,
  trailing = "chevron",
}: {
  danger?: boolean;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  onPress: () => void;
  subtitle: string;
  title: string;
  trailing?: "chevron" | "toggle";
}) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.settingsItem}>
      <View style={[styles.settingsIconChip, danger && styles.settingsIconChipDanger]}>
        <Icon color={danger ? "#c2415a" : "#157747"} size={18} />
      </View>
      <View style={styles.settingsItemBody}>
        <Text style={[styles.settingsItemTitle, danger && styles.settingsItemDanger]}>{title}</Text>
        <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
      </View>
      {trailing === "toggle" ? (
        <View style={styles.settingsToggle}>
          <View style={styles.settingsToggleThumb} />
        </View>
      ) : (
        <ChevronRight color={danger ? "#c2415a" : "#687a70"} size={20} />
      )}
    </TouchableOpacity>
  );
}

function LotCard({ language, lot }: { language: Language; lot: CropLot }) {
  return (
    <View style={styles.lotCard}>
      <Image source={{ uri: lot.imageUrl || cropImageFallback }} style={styles.lotImage} />
      <View style={styles.lotBody}>
        <View style={styles.between}>
          <Text style={styles.lotTitle}>{lot.crop}</Text>
          <Text style={styles.priceText}>{pricePerKg(lot.pricePerKg, language)}</Text>
        </View>
        <Text style={styles.muted}>{lot.farmer}</Text>
        <InfoLine icon={<MapPin color="#718479" size={18} />} text={`${lot.district}${lot.upazilla ? `, ${lot.upazilla}` : ""}`} />
        <InfoLine icon={<Package color="#718479" size={18} />} text={kgToDisplay(lot.quantityKg, language)} />
        <InfoLine icon={<CheckCircle2 color="#718479" size={18} />} text={`${t(language, "grade")} ${lot.grade}`} />
        <InfoLine icon={<CalendarDays color="#718479" size={18} />} text={formatDate(lot.harvestDate || lot.createdAt, language)} />
        <PrimaryButton icon={<ShoppingBag color="#fff" size={18} />} label={t(language, "requestOrder")} onPress={() => Alert.alert(t(language, "orders"), language === "bn" ? "এই লট অর্ডার করতে ক্রেতা হিসেবে লগইন করুন।" : "Login as buyer to request this lot.")} />
      </View>
    </View>
  );
}

function OrderCard({ language, order }: { language: Language; order: Order }) {
  return (
    <View style={styles.orderCard}>
      <View>
        <Text style={styles.lotTitle}>{order.id}</Text>
        <Text style={styles.muted}>{order.items.map((item) => item.crop).join(", ")}</Text>
        <Text style={styles.muted}>{order.district}{order.upazilla ? `, ${order.upazilla}` : ""}</Text>
        <Text style={styles.muted}>{formatDate(order.targetDate || order.createdAt, language)}</Text>
      </View>
      <View style={styles.rightBlock}>
        <Text style={styles.priceText}>{currency(order.totalValue)}</Text>
        <Text style={styles.statusPill}>{statusLabel(order.status, language)}</Text>
      </View>
    </View>
  );
}

function BottomTabs({
  language,
  role,
  screen,
  setScreen,
}: {
  language: Language;
  role: Role;
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  const tabs: Array<{ fillable?: boolean; icon: React.ComponentType<{ color?: string; fill?: string; size?: number; strokeWidth?: number }>; label: string; screen: Screen }> = [
    { fillable: true, icon: Home, label: t(language, "dashboard"), screen: "dashboard" },
    { icon: ShoppingBag, label: t(language, "marketplace"), screen: "marketplace" },
    { icon: Package, label: t(language, "orders"), screen: "orders" },
    { icon: UserRound, label: t(language, "profile"), screen: "profile" },
  ];

  if (role !== "buyer") {
    tabs.splice(2, 0, { icon: PlusCircle, label: t(language, "postCrop"), screen: "post" });
  }

  return (
    <View style={styles.bottomNavWrap}>
      <View style={styles.bottomTabs}>
        {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = screen === tab.screen;
            const color = active ? "#157747" : "#8b948d";
            return (
              <TouchableOpacity key={tab.screen} onPress={() => setScreen(tab.screen)} style={styles.bottomTab}>
                <Icon color={color} fill={active && tab.fillable ? color : "none"} size={18} strokeWidth={active ? 2.8 : 2.2} />
                <Text adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={1} style={[styles.bottomTabText, active && styles.bottomTabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}

function SearchBox({ language, search, setSearch }: { language: Language; search: string; setSearch: (search: string) => void }) {
  return (
    <View style={styles.searchBox}>
      <Search color="#17382b" size={20} />
      <TextInput onChangeText={setSearch} placeholder={t(language, "search")} placeholderTextColor="#7b8d83" style={styles.searchInput} value={search} />
    </View>
  );
}

function Field({
  label,
  rightIcon,
  style,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  rightIcon?: React.ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, inputProps.multiline && styles.textAreaShell]}>
        <TextInput placeholderTextColor="#777" style={[styles.input, inputProps.multiline && styles.textArea]} {...inputProps} />
        {rightIcon ? <View style={styles.inputIcon}>{rightIcon}</View> : null}
      </View>
    </View>
  );
}

function SelectField<T extends string>({
  language = "en",
  label,
  onChange,
  options,
  placeholder,
  style,
  value,
}: {
  language?: Language;
  label: string;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  placeholder?: string;
  style?: React.ComponentProps<typeof View>["style"];
  value: T;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.selectShell}>
        <Text style={[styles.selectText, !selected && styles.placeholderText]}>{selected?.label || placeholder || t(language, "select")}</Text>
        <ChevronDown color="#17382b" size={20} />
      </Pressable>
      <Modal animationType="fade" transparent visible={open}>
        <Pressable onPress={() => setOpen(false)} style={styles.modalBackdrop}>
          <View style={styles.selectMenu}>
            {options.length ? (
              options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={styles.selectItem}
                >
                  <Text style={styles.selectItemText}>{option.label}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.muted}>{t(language, "noOptions")}</Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function CreateAccountModal({
  language,
  onClose,
  onPick,
  visible,
}: {
  language: Language;
  onClose: () => void;
  onPick: (role: Exclude<Role, "admin">) => void;
  visible: boolean;
}) {
  return (
    <Dialog onClose={onClose} title={t(language, "createAccount")} visible={visible}>
      <TouchableOpacity onPress={() => onPick("buyer")} style={styles.choiceCard}>
        <ShoppingBag color="#157747" size={28} />
        <View>
          <Text style={styles.choiceTitle}>{roleLabel(language, "buyer")}</Text>
          <Text style={styles.muted}>{t(language, "buyCropsDirectly")}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onPick("farmer")} style={styles.choiceCard}>
        <Sprout color="#157747" size={28} />
        <View>
          <Text style={styles.choiceTitle}>{roleLabel(language, "farmer")}</Text>
          <Text style={styles.muted}>{t(language, "postHarvestLots")}</Text>
        </View>
      </TouchableOpacity>
    </Dialog>
  );
}

function NotificationModal({
  language,
  notifications,
  onClose,
  onMarkAll,
  onOpenNotification,
  reviewedIds,
  user,
  visible,
}: {
  language: Language;
  notifications: MobileNotification[];
  onClose: () => void;
  onMarkAll: () => void;
  onOpenNotification: (notification: MobileNotification) => void;
  reviewedIds: string[];
  user: AuthUser | null;
  visible: boolean;
}) {
  return (
    <Dialog onClose={onClose} title={t(language, "notifications")} visible={visible}>
      <View style={styles.notificationHeaderRow}>
        <Text style={styles.muted}>{user ? t(language, "latestUpdates") : t(language, "notificationLoginHint")}</Text>
        {notifications.length ? (
          <TouchableOpacity onPress={onMarkAll} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>{t(language, "markAllReviewed")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {notifications.length ? (
        <View style={styles.notificationList}>
          {notifications.map((notification) => {
            const Icon = notification.icon;
            const reviewed = reviewedIds.includes(notification.id);
            return (
              <TouchableOpacity
                key={notification.id}
                onPress={() => onOpenNotification(notification)}
                style={[styles.notificationItem, reviewed && styles.notificationItemReviewed]}
              >
                <View style={styles.notificationIconChip}>
                  <Icon color="#157747" size={20} />
                </View>
                <View style={styles.notificationBody}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={[styles.notificationStatus, reviewed && styles.notificationStatusReviewed]}>
                      {reviewed ? t(language, "reviewed") : t(language, "needsAttention")}
                    </Text>
                  </View>
                  <Text style={styles.mutedSmall}>{notification.body}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <EmptyState text={user ? t(language, "noNotifications") : t(language, "notificationLoginHint")} />
      )}
    </Dialog>
  );
}

function Dialog({ children, onClose, title, visible }: { children: React.ReactNode; onClose: () => void; title: string; visible: boolean }) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialog}>
          <View style={styles.between}>
            <Text style={styles.panelTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function MetricGrid({ items }: { items: Array<{ detail: string; icon: React.ComponentType<{ color?: string; size?: number }>; label: string; value: string }> }) {
  return (
    <View style={styles.metricGrid}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <View key={item.label} style={styles.metricCard}>
            <View style={styles.metricLabelRow}>
              <Icon color="#157747" size={20} />
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.muted}>{item.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ActionGrid({ actions }: { actions: Array<{ icon: React.ComponentType<{ color?: string; size?: number }>; label: string; onPress: () => void }> }) {
  return (
    <View style={styles.actionGrid}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <TouchableOpacity key={action.label} onPress={action.onPress} style={styles.actionCard}>
            <Icon color="#157747" size={20} />
            <Text numberOfLines={1} style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MobilePanel({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.panelTitleRow}>
        {icon}
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function LotList({ emptyText, language, lots }: { emptyText: string; language: Language; lots: CropLot[] }) {
  if (!lots.length) return <EmptyState text={emptyText} />;
  return (
    <View style={styles.stack}>
      {lots.map((lot) => (
        <View key={lot.id} style={styles.compactRow}>
          <Image source={{ uri: lot.imageUrl || cropImageFallback }} style={styles.compactImage} />
          <View style={styles.compactRowBody}>
            <View style={styles.between}>
              <Text numberOfLines={1} style={styles.compactTitle}>{lot.crop}</Text>
              <Text style={styles.compactPrice}>{pricePerKg(lot.pricePerKg, language)}</Text>
            </View>
            <Text numberOfLines={1} style={styles.mutedSmall}>{lot.farmer}</Text>
            <Text numberOfLines={1} style={styles.mutedSmall}>
              {lot.district}{lot.upazilla ? `, ${lot.upazilla}` : ""} · {kgToDisplay(lot.quantityKg, language)} · {t(language, "grade")} {lot.grade}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function OrderList({ emptyText, language, orders }: { emptyText: string; language: Language; orders: Order[] }) {
  if (!orders.length) return <EmptyState text={emptyText} />;
  return (
    <View style={styles.stack}>
      {orders.map((order) => (
        <View key={order.id} style={styles.compactRow}>
          <View style={styles.compactIconBox}>
            <ShoppingBag color="#157747" size={20} />
          </View>
          <View style={styles.compactRowBody}>
            <View style={styles.between}>
              <Text numberOfLines={1} style={styles.compactTitle}>{order.items.map((item) => item.crop).join(", ") || order.id}</Text>
              <Text style={styles.compactPrice}>{currency(order.totalValue)}</Text>
            </View>
            <Text numberOfLines={1} style={styles.mutedSmall}>
              {order.district}{order.upazilla ? `, ${order.upazilla}` : ""} · {formatDate(order.targetDate || order.createdAt, language)} · {statusLabel(order.status, language)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function InfoPanel({ body, icon, title }: { body: string; icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.infoPanelHeader}>
        {icon}
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      <Text style={styles.muted}>{body}</Text>
    </View>
  );
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.infoLine}>
      {icon}
      <Text style={styles.infoLineText}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ disabled, icon, label, onPress }: { disabled?: boolean; icon?: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabledButton]}>
      {icon}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  actionText: {
    color: "#17382b",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  authCard: {
    alignSelf: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    gap: 10,
    maxWidth: 720,
    padding: 20,
    shadowColor: "#0b2118",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: "100%",
  },
  authCopy: {
    color: "#687a70",
    fontSize: 13,
    lineHeight: 19,
  },
  authLinks: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  authTitle: {
    color: "#14372a",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 36,
  },
  between: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomNavWrap: {
    backgroundColor: "#f4f2ea",
    borderTopColor: "#d8ddd7",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 4 : 6,
    paddingHorizontal: 14,
    paddingTop: 5,
  },
  bottomTab: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 1,
    paddingVertical: 3,
  },
  bottomTabs: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 28,
    borderWidth: 1,
    elevation: 0,
    flexDirection: "row",
    gap: 0,
    maxWidth: 560,
    padding: 8,
    shadowColor: "#0b2118",
    shadowOpacity: 0,
    shadowRadius: 0,
    width: "100%",
  },
  bottomTabText: {
    color: "#8b948d",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 10,
    textAlign: "center",
  },
  bottomTabTextActive: {
    color: "#157747",
  },
  brand: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandSubtitle: {
    color: "#687a70",
    fontSize: 11,
  },
  brandTitle: {
    color: "#14372a",
    fontSize: 17,
    fontWeight: "800",
  },
  brandTitleCompact: {
    fontSize: 17,
  },
  card: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
    padding: 14,
  },
  centerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  choiceCard: {
    alignItems: "center",
    backgroundColor: "#f0f5ef",
    borderRadius: 10,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  choiceTitle: {
    color: "#17382b",
    fontSize: 16,
    fontWeight: "800",
  },
  compactIconBox: {
    alignItems: "center",
    backgroundColor: "#e7f3e9",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  compactImage: {
    backgroundColor: "#e9eee8",
    borderRadius: 12,
    height: 50,
    width: 54,
  },
  compactPrice: {
    color: "#157747",
    fontSize: 13,
    fontWeight: "900",
  },
  compactRow: {
    alignItems: "center",
    backgroundColor: "#fbfdf9",
    borderColor: "#e1e5df",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  compactRowBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  compactTitle: {
    color: "#17382b",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  closeText: {
    color: "#17382b",
    fontSize: 28,
    lineHeight: 30,
  },
  dialog: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    maxWidth: 520,
    padding: 18,
    width: "92%",
  },
  resetDialogContent: {
    alignItems: "stretch",
    gap: 12,
    width: "100%",
  },
  resetDialogField: {
    alignSelf: "stretch",
    flex: 0,
    flexBasis: "auto",
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 76,
    minWidth: "100%",
    width: "100%",
  },
  dialogBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(20, 55, 42, 0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  disabledButton: {
    opacity: 0.65,
  },
  divider: {
    backgroundColor: "#e1e5df",
    height: 1,
    marginVertical: 6,
  },
  emptyState: {
    backgroundColor: "#f0f5ef",
    borderRadius: 10,
    padding: 14,
  },
  errorBox: {
    backgroundColor: "#fae8e1",
    borderRadius: 10,
    color: "#922c1d",
    fontSize: 13,
    fontWeight: "800",
    padding: 12,
  },
  field: {
    flex: 1,
    gap: 7,
    minWidth: 180,
  },
  fieldLabel: {
    color: "#324d40",
    fontSize: 13,
    fontWeight: "800",
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: "#f4f2ea",
    borderBottomColor: "#d8ddd7",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerCompact: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerActions: {
    alignItems: "center",
    flexShrink: 0,
    flexDirection: "row",
    gap: 6,
  },
  headerActionsCompact: {
    gap: 5,
  },
  iconButton: {
    alignItems: "center",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  infoLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 5,
  },
  infoLineText: {
    color: "#718479",
    fontSize: 13,
  },
  infoPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  input: {
    color: "#17382b",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inputIcon: {
    paddingRight: 12,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: "#fbfdf9",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
  },
  kicker: {
    color: "#687a70",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  languageButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  languageButtonActive: {
    backgroundColor: "#157747",
  },
  languageButtonCompact: {
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  languageText: {
    color: "#50685c",
    fontWeight: "800",
  },
  languageTextActive: {
    color: "#fff",
  },
  languageToggle: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    padding: 3,
  },
  link: {
    color: "#226eb8",
    fontSize: 14,
    fontWeight: "800",
  },
  logoBox: {
    alignItems: "center",
    backgroundColor: "#157747",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  logoBoxCompact: {
    borderRadius: 8,
    height: 38,
    width: 38,
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  logoutButtonCompact: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: 40,
  },
  logoutText: {
    color: "#17382b",
    fontSize: 13,
    fontWeight: "800",
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: "#b95333",
    borderColor: "#fff",
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -6,
    top: -7,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  notificationBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  notificationButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: 40,
  },
  notificationButtonCompact: {
    height: 38,
    width: 38,
  },
  notificationHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  notificationIconChip: {
    alignItems: "center",
    backgroundColor: "#e7f3e9",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  notificationItem: {
    alignItems: "flex-start",
    backgroundColor: "#fbfdf9",
    borderColor: "#d8ddd7",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  notificationItemReviewed: {
    opacity: 0.72,
  },
  notificationList: {
    gap: 10,
  },
  notificationStatus: {
    color: "#157747",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  notificationStatusReviewed: {
    color: "#687a70",
  },
  notificationTitle: {
    color: "#17382b",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  notificationTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  lotBody: {
    gap: 5,
    padding: 12,
  },
  lotCard: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  lotImage: {
    backgroundColor: "#e9eee8",
    height: 170,
    width: "100%",
  },
  lotTitle: {
    color: "#17382b",
    fontSize: 16,
    fontWeight: "800",
  },
  metricCard: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minWidth: 138,
    padding: 11,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  metricLabel: {
    color: "#687a70",
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 13,
    textTransform: "uppercase",
  },
  metricLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 20,
  },
  metricValue: {
    color: "#17382b",
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 28,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(20, 55, 42, 0.2)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  muted: {
    color: "#687a70",
    fontSize: 13,
    lineHeight: 19,
  },
  mutedSmall: {
    color: "#687a70",
    fontSize: 12,
    lineHeight: 16,
  },
  orderCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 12,
  },
  page: {
    backgroundColor: "#f4f2ea",
    flexGrow: 1,
    padding: 12,
  },
  pageWithBottomTabs: {
    paddingBottom: 28,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  panelTitle: {
    color: "#17382b",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
  },
  panelTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  placeholderText: {
    color: "#777",
  },
  priceText: {
    color: "#157747",
    fontSize: 15,
    fontWeight: "900",
  },
  editProfileForm: {
    gap: 12,
  },
  profileActionStack: {
    gap: 10,
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: "#e8f5ee",
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    overflow: "hidden",
    width: 58,
  },
  profileAvatarImage: {
    height: "100%",
    width: "100%",
  },
  profileBackButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  profileBackSpacer: {
    width: 44,
  },
  profileCameraBadge: {
    alignItems: "center",
    backgroundColor: "#17382b",
    borderColor: "#fff",
    borderRadius: 15,
    borderWidth: 2,
    bottom: 0,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 30,
  },
  profileEditHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileEditHeaderTitle: {
    color: "#17382b",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  profileEditScreen: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  profilePhoto: {
    borderRadius: 46,
    height: "100%",
    width: "100%",
  },
  profilePhotoHint: {
    color: "#687a70",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  profilePhotoPlaceholder: {
    alignItems: "center",
    backgroundColor: "#e8f5ee",
    borderRadius: 46,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  profilePhotoSection: {
    alignItems: "center",
    gap: 8,
  },
  profilePhotoWrap: {
    borderRadius: 46,
    height: 92,
    position: "relative",
    width: 92,
  },
  profileLogoutButton: {
    alignItems: "center",
    backgroundColor: "#fff6f2",
    borderColor: "#f0c7b9",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileLogoutText: {
    color: "#922c1d",
    fontSize: 15,
    fontWeight: "900",
  },
  profileSettings: {
    gap: 14,
  },
  profileSummaryCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  profileSummaryCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  profileSummaryMeta: {
    color: "#687a70",
    fontSize: 12,
    lineHeight: 16,
  },
  profileSummaryName: {
    color: "#17382b",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#157747",
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  rightBlock: {
    alignItems: "flex-end",
    gap: 6,
  },
  rowGap: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  safeArea: {
    backgroundColor: "#f4f2ea",
    flex: 1,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: "#17382b",
    flex: 1,
    fontSize: 14,
    minHeight: 46,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#17382b",
    fontSize: 15,
    fontWeight: "900",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  selectItem: {
    borderBottomColor: "#e1e5df",
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  selectItemText: {
    color: "#17382b",
    fontSize: 15,
    fontWeight: "800",
  },
  selectMenu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: 420,
    padding: 14,
    width: "90%",
  },
  selectShell: {
    alignItems: "center",
    backgroundColor: "#fbfdf9",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  selectText: {
    color: "#17382b",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  smallButton: {
    backgroundColor: "#e7f3e9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: "#157747",
    fontWeight: "800",
  },
  settingsGroup: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
    padding: 10,
  },
  settingsGroupTitle: {
    color: "#87938a",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  settingsIconChip: {
    alignItems: "center",
    backgroundColor: "#eef7f1",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  settingsIconChipDanger: {
    backgroundColor: "#fff0f4",
  },
  settingsItem: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  settingsItemBody: {
    flex: 1,
    minWidth: 0,
  },
  settingsItemDanger: {
    color: "#c2415a",
  },
  settingsItemSubtitle: {
    color: "#7a877e",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  settingsItemTitle: {
    color: "#17382b",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  settingsToggle: {
    alignItems: "flex-end",
    backgroundColor: "#dcefe5",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 40,
  },
  settingsToggleThumb: {
    backgroundColor: "#157747",
    borderRadius: 999,
    height: 16,
    width: 16,
  },
  statusPill: {
    backgroundColor: "#e7f3e9",
    borderRadius: 999,
    color: "#157747",
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stack: {
    gap: 10,
  },
  tab: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: "#157747",
    borderColor: "#157747",
  },
  tabText: {
    color: "#17382b",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    textAlign: "center",
  },
  tabTextActive: {
    color: "#fff",
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  textAreaShell: {
    alignItems: "flex-start",
  },
  title: {
    color: "#14372a",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
  },
  titleCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  twoColumn: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  uploadBox: {
    alignItems: "center",
    backgroundColor: "#f0f5ef",
    borderColor: "#cfe0d4",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  uploadText: {
    color: "#157747",
    fontSize: 13,
    fontWeight: "800",
  },
});
