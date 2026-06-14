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
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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

const roleOptions: Array<SelectOption<Role>> = [
  { label: "Admin", value: "admin" },
  { label: "Buyer", value: "buyer" },
  { label: "Seller / Farmer", value: "farmer" },
];

const cropImageFallback = "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=900&q=80";

function currency(value: number) {
  return `৳${Math.round(value).toLocaleString("en-US")}`;
}

function kgToDisplay(value: number) {
  return value >= 1000 ? `${Number((value / 1000).toFixed(1))} tons` : `${value} kg`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function matchesQuery(values: Array<string | number | null | undefined>, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(term));
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

  function handleLogout() {
    setUser(null);
    setProfile(null);
    setMyLots([]);
    setOrders([]);
    setScreen("marketplace");
  }

  const visibleLots = useMemo(
    () => lots.filter((lot) => matchesQuery([lot.crop, lot.farmer, lot.district, lot.upazilla, lot.grade, lot.pricePerKg], search)),
    [lots, search],
  );

  const protectedTitle = user?.role === "buyer" ? t(language, "buyerDashboard") : user?.role === "farmer" ? t(language, "farmerDashboard") : t(language, "adminSummary");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Header
          language={language}
          onLanguageChange={setLanguage}
          onLogout={handleLogout}
          onNavigate={setScreen}
          compact={compact}
          user={user}
        />
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
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
                Alert.alert("Registration submitted", "Admin will verify the account before activation.");
                setAuthMode("login");
              }}
              role={registerRole}
            />
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.kicker}>{protectedTitle}</Text>
                <Text style={[styles.title, compact && styles.titleCompact]}>{screen === "marketplace" ? t(language, "marketplace") : protectedTitle}</Text>
              </View>
              <SearchBox language={language} search={search} setSearch={setSearch} />
              <Tabs language={language} role={user?.role ?? "buyer"} screen={screen} setScreen={setScreen} />
              {screen === "marketplace" ? (
                <MarketplaceScreen language={language} lots={visibleLots} onRefresh={loadMarketplace} />
              ) : screen === "dashboard" ? (
                <DashboardScreen language={language} lots={myLots} orders={orders} profile={profile} role={user?.role ?? "buyer"} />
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
                      Alert.alert("Crop lot submitted", "Admin approval is required before it appears in marketplace.");
                      await refreshProtectedData();
                      await loadMarketplace();
                    } catch (error) {
                      Alert.alert("Could not submit lot", error instanceof Error ? error.message : "Please try again.");
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
                      Alert.alert("Order request submitted", "The AmarKrishok team will review it.");
                      await refreshProtectedData();
                    } catch (error) {
                      Alert.alert("Could not create order", error instanceof Error ? error.message : "Please try again.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  orders={orders}
                  role={user?.role ?? "buyer"}
                />
              ) : (
                <ProfileScreen
                  districts={districts}
                  language={language}
                  onSave={async (payload) => {
                    if (!user) return;
                    setLoading(true);
                    try {
                      const updated = await updateMyProfile(user.accessToken, payload);
                      setProfile(updated);
                      Alert.alert("Profile updated", "Your account information was saved.");
                    } catch (error) {
                      Alert.alert("Could not update profile", error instanceof Error ? error.message : "Please try again.");
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({
  compact,
  language,
  onLanguageChange,
  onLogout,
  onNavigate,
  user,
}: {
  compact: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onLogout: () => void;
  onNavigate: (screen: Screen) => void;
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
      <View style={styles.headerActions}>
        <View style={styles.languageToggle}>
          <Pressable onPress={() => onLanguageChange("en")} style={[styles.languageButton, language === "en" && styles.languageButtonActive]}>
            <Text style={[styles.languageText, language === "en" && styles.languageTextActive]}>EN</Text>
          </Pressable>
          <Pressable onPress={() => onLanguageChange("bn")} style={[styles.languageButton, language === "bn" && styles.languageButtonActive]}>
            <Text style={[styles.languageText, language === "bn" && styles.languageTextActive]}>বাংলা</Text>
          </Pressable>
        </View>
        {user ? (
          <Pressable onPress={onLogout} style={[styles.logoutButton, compact && styles.logoutButtonCompact]}>
            <LogOut color="#17382b" size={18} />
            {!compact ? <Text numberOfLines={1} style={styles.logoutText}>{roleLabel(language, user.role)}</Text> : null}
          </Pressable>
        ) : (
          <Bell color="#17382b" size={22} />
        )}
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
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.authCard}>
      <Text style={styles.authTitle}>Login to AmarKrishok</Text>
      <Text style={styles.authCopy}>To use AmarKrishok, please log in with your account details.</Text>
      <SelectField label={`${t(language, "selectAccountType")} *`} options={roleOptions.map((option) => ({ ...option, label: roleLabel(language, option.value) }))} value={role} onChange={setRole} />
      <Field
        autoCapitalize="none"
        keyboardType={role === "admin" ? "default" : "phone-pad"}
        label={role === "admin" ? "Username *" : `${t(language, "mobile")} *`}
        onChangeText={setIdentifier}
        placeholder={role === "admin" ? "Admin username" : "01700000000"}
        value={identifier}
      />
      <Field
        label={`${t(language, "password")} *`}
        onChangeText={setPassword}
        placeholder="Your password"
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
        <Text style={styles.muted}>Forgot password? </Text>
        <Pressable onPress={() => setResetOpen(true)}>
          <Text style={styles.link}>Reset</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.centerRow}>
        <Text style={styles.muted}>Don't have an account? </Text>
        <Pressable onPress={onCreateAccount}>
          <Text style={styles.link}>Create account</Text>
        </Pressable>
      </View>
      <PasswordResetModal language={language} onClose={() => setResetOpen(false)} visible={resetOpen} />
    </View>
  );
}

function PasswordResetModal({ language, onClose, visible }: { language: Language; onClose: () => void; visible: boolean }) {
  const [role, setRole] = useState<Exclude<Role, "admin">>("buyer");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password !== confirm) {
      Alert.alert("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(role, phone.trim(), password);
      Alert.alert("Reset request sent", "Admin approval is required before the new password works.");
      onClose();
    } catch (error) {
      Alert.alert("Could not request reset", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog onClose={onClose} title="Password reset" visible={visible}>
      <SelectField
        label={`${t(language, "selectAccountType")} *`}
        options={[
          { label: roleLabel(language, "buyer"), value: "buyer" },
          { label: roleLabel(language, "farmer"), value: "farmer" },
        ]}
        value={role}
        onChange={setRole}
      />
      <Field keyboardType="phone-pad" label={`${t(language, "mobile")} *`} onChangeText={setPhone} placeholder="01700000000" value={phone} />
      <Field label="New password *" onChangeText={setPassword} placeholder="New password" secureTextEntry value={password} />
      <Field label="Confirm password *" onChangeText={setConfirm} placeholder="Confirm password" secureTextEntry value={confirm} />
      <PrimaryButton disabled={busy} icon={<Send color="#fff" size={18} />} label={busy ? "..." : t(language, "submit")} onPress={submit} />
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
      Alert.alert("Registration failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <View style={styles.authCard}>
      <Text style={styles.kicker}>New registration</Text>
      <Text style={styles.authTitle}>{role === "buyer" ? "Create buyer account" : "Create seller account"}</Text>
      <View style={styles.twoColumn}>
        <Field label={t(language, "name")} onChangeText={(name) => setForm({ ...form, name })} placeholder="Full name" value={form.name} />
        <Field keyboardType="phone-pad" label={t(language, "mobile")} onChangeText={(phone) => setForm({ ...form, phone })} placeholder="01700000000" value={form.phone} />
        <Field
          label={t(language, "password")}
          onChangeText={(password) => setForm({ ...form, password })}
          placeholder="Password"
          rightIcon={
            <Pressable onPress={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff color="#50685c" size={22} /> : <Eye color="#50685c" size={22} />}
            </Pressable>
          }
          secureTextEntry={!showPassword}
          value={form.password}
        />
        <Field label={t(language, "organization")} onChangeText={(organization) => setForm({ ...form, organization })} placeholder="Shop, restaurant, company, or farm" value={form.organization} />
        <Field label={t(language, "identity")} onChangeText={(identity) => setForm({ ...form, identity })} placeholder="NID or trade license number" value={form.identity} />
        <Field label={t(language, "focus")} onChangeText={(focus) => setForm({ ...form, focus })} placeholder="Tomato, potato, chilli" value={form.focus} />
        <SelectField
          label={t(language, "district")}
          options={districts.map((value) => ({ label: value, value }))}
          value={form.district}
          onChange={(district) => setForm({ ...form, district, upazilla: "" })}
        />
        <SelectField
          label={t(language, "upazilla")}
          options={upazillaOptions}
          placeholder={form.district ? t(language, "selectUpazilla") : t(language, "selectDistrict")}
          value={form.upazilla}
          onChange={(upazilla) => setForm({ ...form, upazilla })}
        />
      </View>
      <Field label={t(language, "address")} onChangeText={(address) => setForm({ ...form, address })} placeholder="Address" value={form.address} />
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
          <Text style={styles.smallButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {lots.map((lot) => (
        <LotCard key={lot.id} language={language} lot={lot} />
      ))}
    </View>
  );
}

function DashboardScreen({
  language,
  lots,
  orders,
  profile,
  role,
}: {
  language: Language;
  lots: CropLot[];
  orders: Order[];
  profile: AccountProfile | null;
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
            { icon: Package, label: t(language, "lots"), value: String(lots.length), detail: "Submitted farmer lots" },
            { icon: ShoppingBag, label: t(language, "orders"), value: String(orders.length), detail: "Buyer order records" },
            { icon: WalletCards, label: "GMV", value: currency(orderValue), detail: "From backend orders" },
          ]}
        />
        <InfoPanel title="Mobile admin view" body="Use the web dashboard for account approval, lot review, payouts, and detailed operations. This mobile view keeps the core status handy." icon={<Bell color="#157747" size={24} />} />
      </View>
    );
  }

  return (
    <View>
      <MetricGrid
        items={
          role === "farmer"
            ? [
                { icon: Package, label: t(language, "activeLots"), value: String(lots.length), detail: "Ready for buyer requests" },
                { icon: Sprout, label: "Listed quantity", value: kgToDisplay(totalQuantity), detail: "From your lots" },
                { icon: WalletCards, label: "Estimated payout", value: currency(totalQuantity * averageAsk), detail: "After buyer confirmation" },
              ]
            : [
                { icon: ShoppingBag, label: t(language, "orders"), value: String(orders.length), detail: "Your order requests" },
                { icon: WalletCards, label: "Order value", value: currency(orderValue), detail: "Requested supply" },
                { icon: Truck, label: "Pickup", value: "Team managed", detail: "After order approval" },
              ]
        }
      />
      <InfoPanel
        title={profile?.name || "Profile pending"}
        body={`${profile?.organization || "Organization not added"} · ${profile?.district || "District not added"} ${profile?.upazilla ? `· ${profile.upazilla}` : ""}`}
        icon={<UserRound color="#157747" size={24} />}
      />
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
      Alert.alert("Permission needed", "Please allow photo access to choose a crop image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
    if (!result.canceled) setImageUri(result.assets[0]?.uri);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Crop listing</Text>
      <Text style={styles.panelTitle}>{t(language, "postCrop")}</Text>
      <View style={styles.twoColumn}>
        <Field label={t(language, "crop")} onChangeText={(crop) => setForm({ ...form, crop })} placeholder="Tomato" value={form.crop} />
        <SelectField label={t(language, "district")} options={districts.map((value) => ({ label: value, value }))} value={form.district} onChange={(district) => setForm({ ...form, district, upazilla: "" })} />
        <SelectField label={t(language, "upazilla")} options={upazillaOptions} placeholder={t(language, "selectUpazilla")} value={form.upazilla} onChange={(upazilla) => setForm({ ...form, upazilla })} />
        <Field keyboardType="numeric" label={`${t(language, "quantity")} (kg)`} onChangeText={(quantityKg) => setForm({ ...form, quantityKg })} placeholder="1200" value={form.quantityKg} />
        <Field keyboardType="numeric" label={`${t(language, "price")} / kg`} onChangeText={(pricePerKg) => setForm({ ...form, pricePerKg })} placeholder="34" value={form.pricePerKg} />
        <Field label={t(language, "harvestDate")} onChangeText={(harvestDate) => setForm({ ...form, harvestDate })} placeholder="2026-06-12" value={form.harvestDate} />
        <SelectField label={t(language, "grade")} options={gradeOptions.map((value) => ({ label: value, value }))} value={form.grade} onChange={(grade) => setForm({ ...form, grade })} />
      </View>
      <TouchableOpacity onPress={pickImage} style={styles.uploadBox}>
        <PlusCircle color="#157747" size={20} />
        <Text style={styles.uploadText}>{imageUri ? "Crop image selected" : t(language, "cropImage")}</Text>
      </TouchableOpacity>
      <Field label={t(language, "notes")} multiline onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Packaging, pickup point, storage condition" value={form.notes} />
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
          <Text style={styles.kicker}>Buyer order</Text>
          <Text style={styles.panelTitle}>{t(language, "requestOrder")}</Text>
          <View style={styles.twoColumn}>
            <Field label={t(language, "crop")} onChangeText={(crop) => setForm({ ...form, crop })} placeholder="Tomato" value={form.crop} />
            <Field keyboardType="numeric" label={`${t(language, "quantity")} (kg)`} onChangeText={(quantityKg) => setForm({ ...form, quantityKg })} placeholder="500" value={form.quantityKg} />
            <Field keyboardType="numeric" label={`${t(language, "price")} / kg`} onChangeText={(offeredPricePerKg) => setForm({ ...form, offeredPricePerKg })} placeholder="34" value={form.offeredPricePerKg} />
            <SelectField label={t(language, "district")} options={districts.map((value) => ({ label: value, value }))} value={form.district} onChange={(district) => setForm({ ...form, district, upazilla: "" })} />
            <SelectField label={t(language, "upazilla")} options={upazillaOptions} placeholder={t(language, "selectUpazilla")} value={form.upazilla} onChange={(upazilla) => setForm({ ...form, upazilla })} />
            <Field label="Target date" onChangeText={(targetDate) => setForm({ ...form, targetDate })} placeholder="2026-06-12" value={form.targetDate} />
          </View>
          <Field label={t(language, "address")} onChangeText={(deliveryAddress) => setForm({ ...form, deliveryAddress })} placeholder="Delivery address" value={form.deliveryAddress} />
          <Field label={t(language, "notes")} multiline onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Packaging, timing, contact notes" value={form.notes} />
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
      {orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} />) : <EmptyState text="No order records yet." />}
    </View>
  );
}

function ProfileScreen({
  districts,
  language,
  onSave,
  profile,
}: {
  districts: string[];
  language: Language;
  onSave: (payload: Omit<AccountProfile, "id" | "phone" | "role" | "status" | "username">) => Promise<void>;
  profile: AccountProfile | null;
}) {
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

  if (!profile) return <EmptyState text="Profile data is loading." />;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t(language, "profile")}</Text>
      <Text style={styles.panelTitle}>{profile.name}</Text>
      <Text style={styles.muted}>{profile.phone}</Text>
      <View style={styles.twoColumn}>
        <Field label={t(language, "name")} onChangeText={(name) => setForm({ ...form, name })} value={form.name} />
        <Field label={t(language, "organization")} onChangeText={(organization) => setForm({ ...form, organization })} value={form.organization} />
        <SelectField label={t(language, "district")} options={districts.map((value) => ({ label: value, value }))} value={form.district} onChange={(district) => setForm({ ...form, district, upazilla: "" })} />
        <SelectField label={t(language, "upazilla")} options={upazillaOptions} placeholder={t(language, "selectUpazilla")} value={form.upazilla} onChange={(upazilla) => setForm({ ...form, upazilla })} />
        <Field label={t(language, "identity")} onChangeText={(identity) => setForm({ ...form, identity })} value={form.identity} />
        <Field label={t(language, "focus")} onChangeText={(focus) => setForm({ ...form, focus })} value={form.focus} />
      </View>
      <Field label={t(language, "address")} onChangeText={(address) => setForm({ ...form, address })} value={form.address} />
      <PrimaryButton icon={<Save color="#fff" size={20} />} label="Save profile" onPress={() => onSave(form)} />
    </View>
  );
}

function LotCard({ language, lot }: { language: Language; lot: CropLot }) {
  return (
    <View style={styles.lotCard}>
      <Image source={{ uri: lot.imageUrl || cropImageFallback }} style={styles.lotImage} />
      <View style={styles.lotBody}>
        <View style={styles.between}>
          <Text style={styles.lotTitle}>{lot.crop}</Text>
          <Text style={styles.priceText}>৳{lot.pricePerKg}/kg</Text>
        </View>
        <Text style={styles.muted}>{lot.farmer}</Text>
        <InfoLine icon={<MapPin color="#718479" size={18} />} text={`${lot.district}${lot.upazilla ? `, ${lot.upazilla}` : ""}`} />
        <InfoLine icon={<Package color="#718479" size={18} />} text={kgToDisplay(lot.quantityKg)} />
        <InfoLine icon={<CheckCircle2 color="#718479" size={18} />} text={`Grade ${lot.grade}`} />
        <InfoLine icon={<CalendarDays color="#718479" size={18} />} text={formatDate(lot.harvestDate || lot.createdAt)} />
        <PrimaryButton icon={<ShoppingBag color="#fff" size={18} />} label={t(language, "requestOrder")} onPress={() => Alert.alert("Order", "Login as buyer to request this lot.")} />
      </View>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <View style={styles.orderCard}>
      <View>
        <Text style={styles.lotTitle}>{order.id}</Text>
        <Text style={styles.muted}>{order.items.map((item) => item.crop).join(", ")}</Text>
        <Text style={styles.muted}>{order.district}{order.upazilla ? `, ${order.upazilla}` : ""}</Text>
      </View>
      <View style={styles.rightBlock}>
        <Text style={styles.priceText}>{currency(order.totalValue)}</Text>
        <Text style={styles.statusPill}>{order.status}</Text>
      </View>
    </View>
  );
}

function Tabs({
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
  const tabs: Array<{ icon: React.ComponentType<{ color?: string; size?: number }>; label: string; screen: Screen }> = [
    { icon: Home, label: t(language, "dashboard"), screen: "dashboard" },
    { icon: ShoppingBag, label: t(language, "marketplace"), screen: "marketplace" },
    ...(role !== "buyer" ? [{ icon: PlusCircle, label: t(language, "postCrop"), screen: "post" as Screen }] : []),
    { icon: Package, label: t(language, "orders"), screen: "orders" },
    { icon: UserRound, label: t(language, "profile"), screen: "profile" },
  ];

  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = screen === tab.screen;
        return (
          <TouchableOpacity key={tab.screen} onPress={() => setScreen(tab.screen)} style={[styles.tab, active && styles.tabActive]}>
            <Icon color={active ? "#fff" : "#17382b"} size={18} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
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
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  placeholder?: string;
  value: T;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.selectShell}>
        <Text style={[styles.selectText, !selected && styles.placeholderText]}>{selected?.label || placeholder || "Select"}</Text>
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
              <Text style={styles.muted}>No options</Text>
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
    <Dialog onClose={onClose} title="Create account" visible={visible}>
      <TouchableOpacity onPress={() => onPick("buyer")} style={styles.choiceCard}>
        <ShoppingBag color="#157747" size={28} />
        <View>
          <Text style={styles.choiceTitle}>{roleLabel(language, "buyer")}</Text>
          <Text style={styles.muted}>Order crops directly</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onPick("farmer")} style={styles.choiceCard}>
        <Sprout color="#157747" size={28} />
        <View>
          <Text style={styles.choiceTitle}>{roleLabel(language, "farmer")}</Text>
          <Text style={styles.muted}>Post harvest lots</Text>
        </View>
      </TouchableOpacity>
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
  authCard: {
    alignSelf: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    gap: 12,
    maxWidth: 720,
    padding: 22,
    shadowColor: "#0b2118",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: "100%",
  },
  authCopy: {
    color: "#687a70",
    fontSize: 16,
    lineHeight: 23,
  },
  authLinks: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  authTitle: {
    color: "#14372a",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 44,
  },
  between: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
    fontSize: 12,
  },
  brandTitle: {
    color: "#14372a",
    fontSize: 18,
    fontWeight: "800",
  },
  brandTitleCompact: {
    fontSize: 21,
  },
  card: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    gap: 14,
    marginBottom: 14,
    padding: 18,
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
    fontSize: 20,
    fontWeight: "800",
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
    padding: 20,
    width: "92%",
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
    padding: 18,
  },
  errorBox: {
    backgroundColor: "#fae8e1",
    borderRadius: 10,
    color: "#922c1d",
    fontSize: 16,
    fontWeight: "800",
    padding: 14,
  },
  field: {
    flex: 1,
    gap: 8,
    minWidth: 180,
  },
  fieldLabel: {
    color: "#324d40",
    fontSize: 16,
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
    fontSize: 16,
  },
  infoPanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  input: {
    color: "#17382b",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 48,
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
    fontSize: 13,
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
    fontSize: 17,
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
    fontSize: 14,
    fontWeight: "800",
  },
  lotBody: {
    gap: 5,
    padding: 16,
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
    height: 190,
    width: "100%",
  },
  lotTitle: {
    color: "#17382b",
    fontSize: 20,
    fontWeight: "800",
  },
  metricCard: {
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minWidth: 150,
    padding: 14,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  metricLabel: {
    color: "#687a70",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metricLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metricValue: {
    color: "#17382b",
    fontSize: 28,
    fontWeight: "800",
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
    fontSize: 16,
    lineHeight: 23,
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
    padding: 14,
  },
  page: {
    backgroundColor: "#f4f2ea",
    flexGrow: 1,
    padding: 14,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  panelTitle: {
    color: "#17382b",
    fontSize: 22,
    fontWeight: "800",
  },
  placeholderText: {
    color: "#777",
  },
  priceText: {
    color: "#157747",
    fontSize: 18,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#157747",
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
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
    fontSize: 15,
    minHeight: 46,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#17382b",
    fontSize: 18,
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
    fontSize: 17,
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
    minHeight: 52,
    paddingHorizontal: 12,
  },
  selectText: {
    color: "#17382b",
    fontSize: 17,
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
  statusPill: {
    backgroundColor: "#e7f3e9",
    borderRadius: 999,
    color: "#157747",
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tab: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d8ddd7",
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  tabActive: {
    backgroundColor: "#157747",
    borderColor: "#157747",
  },
  tabText: {
    color: "#17382b",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
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
    minHeight: 110,
    textAlignVertical: "top",
  },
  textAreaShell: {
    alignItems: "flex-start",
  },
  title: {
    color: "#14372a",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 35,
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
    padding: 14,
  },
  uploadText: {
    color: "#157747",
    fontSize: 16,
    fontWeight: "800",
  },
});
