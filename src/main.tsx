import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Gauge,
  HeartHandshake,
  HandCoins,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  MapPin,
  Menu,
  MessageSquareText,
  PackageCheck,
  Plus,
  Route as RouteIcon,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Store,
  X,
  TrendingDown,
  TrendingUp,
  Truck,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import "./styles.css";

type View = "home" | "market" | "farmer" | "buyer" | "prices" | "admin";
type Language = "en" | "bn";
type Role = "admin" | "buyer" | "farmer";
type RegistrationRole = "buyer" | "farmer";
type AccountStatus = "pending" | "active" | "rejected";

type AuthUser = {
  accountId?: string;
  name: string;
  phone: string;
  role: Role;
  signedInAt: string;
};

type RegisteredAccount = {
  id: string;
  role: RegistrationRole;
  status: AccountStatus;
  name: string;
  phone: string;
  password: string;
  organization: string;
  district: string;
  address: string;
  identity: string;
  focus: string;
  submittedAt: string;
  reviewedAt?: string;
};

type CropLot = {
  id: string;
  crop: string;
  farmer: string;
  district: string;
  quantity: string;
  ask: string;
  grade: string;
  harvest: string;
  image: string;
};

type MarketPrice = {
  crop: string;
  district: string;
  farmerAsk: string;
  wholesale: string;
  retail: string;
  trend: string;
};

type Order = {
  id: string;
  buyer: string;
  crop: string;
  quantity: string;
  destination: string;
  value: string;
  status: "Matching" | "Pickup booked" | "In transit" | "Quality check";
};

type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "steady";
};

type AdminRoute = {
  route: string;
  driver: string;
  lots: string;
  status: string;
  temperature: string;
};

type AdminPriceSignal = {
  crop: string;
  region: string;
  farmerAsk: number;
  wholesale: number;
  market: number;
};

const bn: Record<string, string> = {
  Home: "হোম",
  Marketplace: "ফসল বাজার",
  "Post Crop": "ফসল দিন",
  Order: "অর্ডার",
  Prices: "বাজারদর",
  Admin: "অ্যাডমিন",
  "Direct from Farmer, Fair for All": "কৃষকের কাছ থেকে সরাসরি, সবার জন্য ন্যায্য দাম",
  Notifications: "নোটিফিকেশন",
  "Logged in": "লগইন হয়েছে",
  Login: "লগইন",
  "Choose login type": "কোন ভূমিকায় লগইন করবেন",
  "Continue as admin": "অ্যাডমিন হিসেবে লগইন",
  "Continue as buyer": "ক্রেতা হিসেবে লগইন",
  "Continue as farmer": "কৃষক হিসেবে লগইন",
  "Seller / Farmer": "বিক্রেতা / কৃষক",
  "Buyer account": "ক্রেতা অ্যাকাউন্ট",
  "Admin account": "অ্যাডমিন অ্যাকাউন্ট",
  Logout: "লগআউট",
  "Signed in as": "লগইন করেছেন",
  "Secure login": "নিরাপদ লগইন",
  "Login to continue": "চালিয়ে যেতে লগইন করুন",
  "Choose your role and sign in to access protected AmarKrishok tools.": "আমারকৃষকের সুরক্ষিত অংশে যেতে আপনার ভূমিকা বেছে নিয়ে লগইন করুন।",
  Role: "ভূমিকা",
  "Full name": "পুরো নাম",
  "Mobile number": "মোবাইল নম্বর",
  "PIN or password": "পিন বা পাসওয়ার্ড",
  "Use any 4+ character PIN for this prototype.": "এই ডেমোতে ৪ অক্ষর বা তার বেশি পিন ব্যবহার করুন।",
  "Sign in": "লগইন",
  "Signing in": "লগইন হচ্ছে",
  "Please enter your name.": "আপনার নাম লিখুন।",
  "Please enter a valid mobile number.": "সঠিক মোবাইল নম্বর লিখুন।",
  "PIN must be at least 4 characters.": "পিন কমপক্ষে ৪ অক্ষরের হতে হবে।",
  "You need to sign in first.": "আগে লগইন করতে হবে।",
  "Protected area": "সুরক্ষিত এলাকা",
  "This page is protected": "এই পেজ সুরক্ষিত",
  "Your current role cannot open this page.": "আপনার বর্তমান ভূমিকা দিয়ে এই পেজ খোলা যাবে না।",
  "Switch account": "অ্যাকাউন্ট বদলান",
  "Go home": "হোমে যান",
  Register: "নিবন্ধন",
  "Register buyer": "ক্রেতা নিবন্ধন",
  "Register seller": "বিক্রেতা নিবন্ধন",
  "New buyer account": "নতুন ক্রেতা অ্যাকাউন্ট",
  "New seller account": "নতুন বিক্রেতা অ্যাকাউন্ট",
  "Create buyer account": "ক্রেতার অ্যাকাউন্ট খুলুন",
  "Create seller account": "বিক্রেতার অ্যাকাউন্ট খুলুন",
  "Submit your information. Admin will verify it before your account becomes active.": "তথ্য জমা দিন। অ্যাকাউন্ট চালু করার আগে অ্যাডমিন সেগুলো যাচাই করবে।",
  "Business / farm name": "ব্যবসা / খামারের নাম",
  "Shop, restaurant, company, or farm": "দোকান, রেস্তোরাঁ, কোম্পানি বা খামার",
  "Address": "ঠিকানা",
  "NID / trade license": "জাতীয় পরিচয়পত্র / ট্রেড লাইসেন্স",
  "Crop interest / supply focus": "যে ফসল কিনবেন / বিক্রি করবেন",
  "Tomato, potato, chilli...": "টমেটো, আলু, মরিচ...",
  "Submit registration": "নিবন্ধন জমা দিন",
  "Registration submitted": "নিবন্ধন জমা হয়েছে",
  "Admin verification required": "অ্যাডমিন যাচাই লাগবে",
  "Your account is pending admin verification. You can sign in after approval.": "আপনার অ্যাকাউন্ট অ্যাডমিন যাচাইয়ের অপেক্ষায় আছে। অনুমোদনের পর লগইন করতে পারবেন।",
  "Back to login": "লগইনে ফিরুন",
  "Please fill in all registration fields.": "নিবন্ধনের সব তথ্য পূরণ করুন।",
  "An account with this role and phone already exists.": "এই ভূমিকা ও ফোন নম্বর দিয়ে একটি অ্যাকাউন্ট আছে।",
  "Account not found. Please register first.": "অ্যাকাউন্ট পাওয়া যায়নি। আগে নিবন্ধন করুন।",
  "Account is waiting for admin verification.": "অ্যাকাউন্ট অ্যাডমিন যাচাইয়ের অপেক্ষায় আছে।",
  "Registration was not approved. Please contact admin.": "নিবন্ধন অনুমোদন হয়নি। অ্যাডমিনের সঙ্গে যোগাযোগ করুন।",
  "Password does not match.": "পাসওয়ার্ড মিলছে না।",
  "Pending verification": "যাচাইয়ের অপেক্ষায়",
  "New registration": "নতুন নিবন্ধন",
  "Account verification": "অ্যাকাউন্ট যাচাই",
  "Buyer and seller registrations awaiting admin approval.": "ক্রেতা ও বিক্রেতার নিবন্ধন অ্যাডমিন অনুমোদনের অপেক্ষায় আছে।",
  "No pending registrations": "অপেক্ষায় থাকা কোনো নিবন্ধন নেই",
  "Approve": "অনুমোদন করুন",
  "Reject": "বাতিল করুন",
  "Approved accounts": "অনুমোদিত অ্যাকাউন্ট",
  "Rejected accounts": "বাতিল করা অ্যাকাউন্ট",
  "Submitted": "জমা হয়েছে",
  "Sample full name": "আব্দুল করিম",
  "Sample mobile number": "০১৭০০০০০০০০",
  "Sample PIN": "১২৩৪",
  "Sample identity": "জাতীয় পরিচয়পত্র-১২৩৪৫৬",
  "Language switch": "ভাষা বদল",
  "Open menu": "মেনু খুলুন",
  "Close menu": "মেনু বন্ধ করুন",
  "Main navigation": "প্রধান মেনু",
  "Mobile navigation": "মোবাইল মেনু",
  "AmarKrishok home": "আমারকৃষক হোম",
  "Dashboard navigation": "ড্যাশবোর্ড মেনু",
  "Open admin navigation": "অ্যাডমিন মেনু খুলুন",
  "Search dashboard": "ড্যাশবোর্ডে খুঁজুন",
  "Business metrics": "ব্যবসার হিসাব",
  "Platform metrics": "প্ল্যাটফর্মের হিসাব",
  "Verified farmer-to-buyer marketplace": "যাচাই করা কৃষক ও ক্রেতার সরাসরি বাজার",
  "Farmers post crops. Buyers order directly. Admins manage the chain.": "কৃষক ফসলের তথ্য দেবেন। ক্রেতা সরাসরি অর্ডার করবেন। অ্যাডমিন পুরো প্রক্রিয়া সামলাবে।",
  "A direct supply-chain platform for Bangladesh where farmers post harvests, buyers order transparently, logistics partners deliver, and payments stay protected.": "বাংলাদেশের কৃষিপণ্যের জন্য সরাসরি সাপ্লাই-চেইন প্ল্যাটফর্ম: কৃষক ফসল দেন, ক্রেতা স্বচ্ছভাবে অর্ডার করেন, ডেলিভারি পার্টনার পৌঁছে দেয়, আর পেমেন্ট নিরাপদে থাকে।",
  "Browse crops": "ফসল দেখুন",
  "Post a crop": "ফসল পোস্ট করুন",
  "Today's supply": "আজকের ফসল",
  "Live lots from verified farmers": "যাচাই করা কৃষকদের নতুন লট",
  "active verified supply": "যাচাই করা সক্রিয় ফসল",
  "orders confirmed today": "আজ নিশ্চিত হওয়া অর্ডার",
  "average farmer price lift": "কৃষকের গড় বাড়তি দাম",
  "escrow pending release": "ছাড়ের অপেক্ষায় থাকা নিরাপদ পেমেন্ট",
  "Farmer posts crop": "কৃষক ফসল পোস্ট করেন",
  "Crop, district, quantity, grade, harvest date, and asking price.": "ফসলের নাম, জেলা, পরিমাণ, গ্রেড, কাটার সময় আর চাওয়া দাম।",
  "Buyer orders": "ক্রেতা অর্ডার করেন",
  "Retailers and restaurants reserve lots or request bulk supply.": "দোকান, রেস্তোরাঁ বা পাইকারি ক্রেতা সরাসরি লট বুক করতে পারে।",
  "Logistics runs": "ডেলিভারি চলে",
  "Pickup, delivery, and proof stay visible to all parties.": "পিকআপ, ডেলিভারি আর প্রমাণ সব পক্ষ একই জায়গায় দেখতে পারে।",
  "Admin releases payout": "অ্যাডমিন টাকা ছাড়ে",
  "Escrow protects buyers and pays farmers after confirmation.": "নিরাপদ পেমেন্ট ক্রেতার টাকা ধরে রাখে, আর নিশ্চিত হলে কৃষকের কাছে টাকা যায়।",
  "Trust layer": "ভরসার ব্যবস্থা",
  "Quality, payment, and delivery stay visible.": "মান, পেমেন্ট আর ডেলিভারির সব আপডেট এক জায়গায়।",
  "AmarKrishok reduces middleman abuse by keeping lot grading, escrow status, buyer history, and delivery proof in one shared record.": "আমারকৃষক লটের গ্রেড, নিরাপদ পেমেন্টের অবস্থা, ক্রেতার ইতিহাস আর ডেলিভারির প্রমাণ এক জায়গায় রাখে। তাই দালালের ওপর নির্ভরতা কমে।",
  "Digital quality checklist before pickup": "পিকআপের আগে ডিজিটাল মান যাচাই তালিকা",
  "Delivery milestones with buyer confirmation": "ডেলিভারির প্রতিটি ধাপে ক্রেতার নিশ্চিতকরণ",
  "Farmer co-op groups for bulk orders": "বড় অর্ডারের জন্য কৃষক গ্রুপ",
  "Buyer request": "ক্রেতার চাহিদা",
  "price comparison": "দামের তুলনা",
  "Need 2 tons tomato for Dhaka retail chain": "ঢাকার খুচরা বিক্রয় চেইনের জন্য ২ টন টমেটো দরকার",
  "Preferred delivery: next morning. Escrow ready after lot approval.": "ডেলিভারি চাই আগামীকাল সকাল। লট অনুমোদনের পর নিরাপদ পেমেন্ট প্রস্তুত।",
  "Match farmers": "উপযুক্ত কৃষক খুঁজুন",
  "Search crops by location and reserve directly from farmers.": "লোকেশন ধরে ফসল খুঁজুন, কৃষকের কাছ থেকেই বুক করুন।",
  "Search tomato, potato, farmer...": "টমেটো, আলু বা কৃষকের নাম লিখুন...",
  "All districts": "সব জেলা",
  Jashore: "যশোর",
  Bogura: "বগুড়া",
  Rangpur: "রংপুর",
  Pabna: "পাবনা",
  Kushtia: "কুষ্টিয়া",
  Tomato: "টমেটো",
  "Green Chilli": "কাঁচা মরিচ",
  Potato: "আলু",
  Onion: "পেঁয়াজ",
  Chilli: "মরিচ",
  Rice: "ধান",
  Eggplant: "বেগুন",
  Cucumber: "শসা",
  Mango: "আম",
  "Post a crop lot for direct buyer orders.": "ক্রেতার সরাসরি অর্ডারের জন্য ফসলের লট দিন।",
  "Farmer app": "কৃষক প্যানেল",
  "Crop name": "ফসলের নাম",
  District: "জেলা",
  Quantity: "পরিমাণ",
  "Expected price": "চাওয়া দাম",
  "Harvest date": "ফসল তোলার সময়",
  Grade: "গ্রেড",
  A: "এ",
  "B+": "বি+",
  "A-": "এ-",
  C: "সি",
  "A / B+ / C": "এ / বি+ / সি",
  Notes: "অতিরিক্ত তথ্য",
  "Tomorrow morning": "আগামীকাল সকাল",
  "Packaging, pickup point, storage condition...": "প্যাকেজিং, পিকআপ পয়েন্ট, সংরক্ষণের অবস্থা...",
  "Publish crop lot": "লট প্রকাশ করুন",
  "Farmer profile readiness": "কৃষক প্রোফাইল",
  "Phone OTP, NID, farm location, and bank/mobile wallet details should be verified before payout.": "টাকা ছাড়ার আগে ফোন ওটিপি, জাতীয় পরিচয়পত্র, খামারের লোকেশন এবং ব্যাংক/মোবাইল ওয়ালেট যাচাই করে নিতে হবে।",
  "Phone verified": "ফোন যাচাই করা হয়েছে",
  "Farm location added": "খামারের লোকেশন যোগ হয়েছে",
  "Wallet verification pending": "ওয়ালেট যাচাই বাকি",
  "Buyer order": "ক্রেতার অর্ডার",
  "Place a direct order or bulk request.": "সরাসরি অর্ডার দিন বা বড় অর্ডারের অনুরোধ পাঠান।",
  "Buyer name": "ক্রেতার নাম",
  "Restaurant / retailer / family group": "রেস্তোরাঁ / দোকান / পরিবার গ্রুপ",
  "Crop needed": "যে ফসল চাই",
  "Delivery area": "ডেলিভারি এলাকা",
  "Target date": "যে তারিখে চাই",
  "Tomorrow 8 AM": "আগামীকাল সকাল ৮টা",
  "Offer price": "আপনার অফার",
  "Quality requirement": "মান নিয়ে চাহিদা",
  "Grade, packaging, ripeness, delivery notes...": "গ্রেড, প্যাকেজিং, পাকা না কাঁচা, ডেলিভারি নোট...",
  "Submit order request": "অর্ডার পাঠান",
  "Matched supply": "মিল পাওয়া ফসল",
  "Current best match: 3 verified tomato lots from Jashore, total 2.9 tons.": "সেরা মিল: যশোরের যাচাই করা ৩টি টমেটো লট, মোট ২.৯ টন।",
  "View matched lots": "মিল পাওয়া লট দেখুন",
  "Market prices": "বাজারদর",
  "Daily farmer, wholesale, and retail price signals.": "প্রতিদিনের কৃষক, পাইকারি আর খুচরা দামের ধারণা।",
  "Farmer ask": "কৃষকের চাওয়া দাম",
  Wholesale: "পাইকারি",
  Retail: "খুচরা",
  "Admin Control": "অ্যাডমিন কন্ট্রোল",
  "Supply command": "সরবরাহ নিয়ন্ত্রণ",
  Dashboard: "ড্যাশবোর্ড",
  Orders: "অর্ডার",
  "Supply Lots": "ফসলের লট",
  Farmers: "কৃষক",
  Logistics: "লজিস্টিকস",
  Payouts: "টাকা ছাড়",
  Settings: "সেটিংস",
  "Escrow protected": "নিরাপদ পেমেন্ট",
  "৳82,000 ready for farmer release after buyer confirmation.": "ক্রেতা নিশ্চিত করলে কৃষকের জন্য ৳৮২,০০০ ছাড় করা যাবে।",
  "Sunday, May 24": "রবিবার, ২৪ মে",
  "Operations dashboard": "কার্যক্রমের ড্যাশবোর্ড",
  "Search order, farmer, district...": "অর্ডার, কৃষক, জেলা খুঁজুন...",
  "New lot": "নতুন লট",
  "GMV today": "আজকের মোট বিক্রি",
  "18 orders confirmed": "১৮টি অর্ডার নিশ্চিত",
  "Farmer payout": "কৃষকের পাওনা",
  "৳82K pending escrow": "নিরাপদ পেমেন্টে ৳৮২ হাজার অপেক্ষায়",
  "Active supply": "সক্রিয় ফসল",
  "78 verified lots": "৭৮টি যাচাই করা লট",
  "Avg price lift": "গড় বাড়তি দাম",
  "vs local middleman rate": "স্থানীয় দালালের দামের তুলনায়",
  "Order control": "অর্ডার কন্ট্রোল",
  "Buyer demand queue": "ক্রেতাদের চাহিদা",
  "All orders": "সব অর্ডার",
  Buyer: "ক্রেতা",
  Crop: "ফসল",
  Value: "মূল্য",
  Status: "অবস্থা",
  ETA: "সময়",
  "Matching": "মিল খোঁজা হচ্ছে",
  "Pickup booked": "পিকআপ ঠিক হয়েছে",
  "In transit": "পথে আছে",
  "Quality check": "মান যাচাই চলছে",
  "3 farmer groups": "৩টি কৃষক গ্রুপ",
  Today: "আজ",
  "Payout action": "পেমেন্ট অ্যাকশন",
  "Release queue": "টাকা ছাড়ার তালিকা",
  "Ready after QC": "মান যাচাইয়ের পর ছাড়ার জন্য প্রস্তুত",
  "Delivery photo received": "ডেলিভারি ছবি পাওয়া গেছে",
  "Buyer weight confirmed": "ক্রেতা ওজন নিশ্চিত করেছেন",
  "Quality check pending": "মান যাচাই বাকি",
  "Review payouts": "পেমেন্ট দেখুন",
  "Farmer supply": "কৃষকের ফসল",
  "Verified lots": "যাচাই করা লট",
  "Grade lots": "গ্রেড দিন",
  "Price intelligence": "দামের বিশ্লেষণ",
  "Farmer vs market spread": "কৃষকের দাম বনাম বাজারদর",
  "Logistics board": "ডেলিভারি বোর্ড",
  "Routes in motion": "চলমান রুট",
  Alerts: "আপডেট",
  "Field updates": "মাঠের খবর",
  "Tomato lot AKL-882 passed weight check.": "টমেটো লট একে-৮৮২-এর ওজন মিলেছে।",
  "Rangpur potato pickup moved to 8:20 PM.": "রংপুরের আলুর পিকআপ রাত ৮:২০-এ নেওয়া হয়েছে।",
  "4 new farmers awaiting verification.": "৪ জন নতুন কৃষক যাচাইয়ের অপেক্ষায়।",
  lot: "লট",
  supply: "সরবরাহ",
  harvest: "ফসল",
  "Order this lot": "এই লট অর্ডার করুন",
  "Ready tomorrow": "আগামীকাল তোলা যাবে",
  "Ready today": "আজই প্রস্তুত",
  "Cold stored": "কোল্ড স্টোরেজে আছে",
  "Ready in 2 days": "২ দিনের মধ্যে প্রস্তুত",
  "1.2 tons": "১.২ টন",
  "420 kg": "৪২০ কেজি",
  "3.6 tons": "৩.৬ টন",
  "1.8 tons": "১.৮ টন",
  "2.4 tons": "২.৪ টন",
  "680 kg": "৬৮০ কেজি",
  "1.5 tons": "১.৫ টন",
  "950 kg": "৯৫০ কেজি",
  "2.0 tons": "২.০ টন",
  "360 kg": "৩৬০ কেজি",
  "4.5 tons": "৪.৫ টন",
  "1.1 tons": "১.১ টন",
  "Dhaka North": "ঢাকা উত্তর",
  Banani: "বনানী",
  Tejgaon: "তেজগাঁও",
  Mirpur: "মিরপুর",
  "Shwapno Retail": "স্বপ্ন রিটেইল",
  "Hotel Sarina": "হোটেল সারিনা",
  "Agora Warehouse": "আগোরা ওয়্যারহাউস",
  "B2B Kitchen Co.": "বিটুবি কিচেন কো.",
  "Mst. Rahima": "মোছা. রহিমা",
  "Abdul Karim": "আব্দুল করিম",
  "Nayan Mondol": "নয়ন মণ্ডল",
  "Rashed Mia": "রাশেদ মিয়া",
  "Selim Hossain": "সেলিম হোসেন",
  "Fatema Khatun": "ফাতেমা খাতুন",
  "Mizanur Rahman": "মিজানুর রহমান",
  "Hasina Begum": "হাসিনা বেগম",
  "Bogura - Dhaka": "বগুড়া - ঢাকা",
  "Rangpur - Tejgaon": "রংপুর - তেজগাঁও",
  "Jashore - Dhaka": "যশোর - ঢাকা",
  "Kushtia - Dhaka": "কুষ্টিয়া - ঢাকা",
  "Hasan Logistics": "হাসান লজিস্টিকস",
  "North Cold Van": "নর্থ কোল্ড ভ্যান",
  "Padma Cargo": "পদ্মা কার্গো",
  "3 lots / 1.1 tons": "৩ লট / ১.১ টন",
  "2 lots / 4.5 tons": "২ লট / ৪.৫ টন",
  "4 lots / 2.8 tons": "৪ লট / ২.৮ টন",
  "5 lots / 3.4 tons": "৫ লট / ৩.৪ টন",
  "Pickup in 42 min": "৪২ মিনিটে পিকআপ",
  Ambient: "সাধারণ তাপমাত্রা",
  "Awaiting load": "লোডের অপেক্ষায়",
};

const LanguageContext = React.createContext<Language>("en");
const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function localizeBanglaValue(text: string) {
  return text
    .replace(/\d/g, (digit) => banglaDigits[Number(digit)])
    .replace(/\btons?\b/gi, "টন")
    .replace(/\bkg\b/gi, "কেজি")
    .replace(/°C/g, "°সে")
    .replace(/\bK\b/g, " হাজার")
    .replace(/\bL\b/g, " লাখ")
    .replace(/\bAM\b/g, "সকাল")
    .replace(/\bPM\b/g, "রাত");
}

function translate(language: Language, text: string) {
  return language === "bn" ? bn[text] ?? localizeBanglaValue(text) : text;
}

function useTranslate() {
  const language = React.useContext(LanguageContext);
  return (text: string) => translate(language, text);
}

function useValueText() {
  const language = React.useContext(LanguageContext);
  return (text: string | number) => (language === "bn" ? localizeBanglaValue(String(text)) : String(text));
}

const lots: CropLot[] = [
  {
    id: "LOT-882",
    crop: "Tomato",
    farmer: "Mst. Rahima",
    district: "Jashore",
    quantity: "1.2 tons",
    ask: "৳34/kg",
    grade: "B+",
    harvest: "Ready tomorrow",
    image:
      "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-731",
    crop: "Green Chilli",
    farmer: "Abdul Karim",
    district: "Bogura",
    quantity: "420 kg",
    ask: "৳86/kg",
    grade: "A",
    harvest: "Ready today",
    image:
      "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-640",
    crop: "Potato",
    farmer: "Nayan Mondol",
    district: "Rangpur",
    quantity: "3.6 tons",
    ask: "৳21/kg",
    grade: "A",
    harvest: "Cold stored",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-529",
    crop: "Onion",
    farmer: "Rashed Mia",
    district: "Pabna",
    quantity: "1.8 tons",
    ask: "৳63/kg",
    grade: "A-",
    harvest: "Ready in 2 days",
    image:
      "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-418",
    crop: "Rice",
    farmer: "Selim Hossain",
    district: "Kushtia",
    quantity: "2.4 tons",
    ask: "৳38/kg",
    grade: "A",
    harvest: "Ready tomorrow",
    image: "/assets/crops/rice.jpg",
  },
  {
    id: "LOT-386",
    crop: "Eggplant",
    farmer: "Fatema Khatun",
    district: "Kushtia",
    quantity: "680 kg",
    ask: "৳29/kg",
    grade: "B+",
    harvest: "Ready today",
    image: "/assets/crops/eggplant.jpg",
  },
  {
    id: "LOT-274",
    crop: "Cucumber",
    farmer: "Mizanur Rahman",
    district: "Bogura",
    quantity: "1.5 tons",
    ask: "৳24/kg",
    grade: "A-",
    harvest: "Ready in 2 days",
    image:
      "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-193",
    crop: "Mango",
    farmer: "Hasina Begum",
    district: "Rangpur",
    quantity: "950 kg",
    ask: "৳72/kg",
    grade: "A",
    harvest: "Ready tomorrow",
    image: "/assets/crops/mango.jpg",
  },
];

const prices: MarketPrice[] = [
  { crop: "Tomato", district: "Jashore", farmerAsk: "৳34", wholesale: "৳42", retail: "৳48", trend: "+8%" },
  { crop: "Potato", district: "Rangpur", farmerAsk: "৳21", wholesale: "৳27", retail: "৳32", trend: "+6%" },
  { crop: "Onion", district: "Pabna", farmerAsk: "৳63", wholesale: "৳74", retail: "৳82", trend: "+11%" },
  { crop: "Chilli", district: "Bogura", farmerAsk: "৳86", wholesale: "৳98", retail: "৳116", trend: "+18%" },
  { crop: "Rice", district: "Kushtia", farmerAsk: "৳38", wholesale: "৳44", retail: "৳51", trend: "+9%" },
  { crop: "Eggplant", district: "Kushtia", farmerAsk: "৳29", wholesale: "৳36", retail: "৳44", trend: "+12%" },
  { crop: "Cucumber", district: "Bogura", farmerAsk: "৳24", wholesale: "৳31", retail: "৳38", trend: "+10%" },
  { crop: "Mango", district: "Rangpur", farmerAsk: "৳72", wholesale: "৳86", retail: "৳105", trend: "+15%" },
];

const orders: Order[] = [
  { id: "AK-2048", buyer: "Shwapno Retail", crop: "Tomato", quantity: "2.0 tons", destination: "Dhaka North", value: "৳84,000", status: "Matching" },
  { id: "AK-2047", buyer: "Hotel Sarina", crop: "Green Chilli", quantity: "360 kg", destination: "Banani", value: "৳34,920", status: "Pickup booked" },
  { id: "AK-2046", buyer: "Agora Warehouse", crop: "Potato", quantity: "4.5 tons", destination: "Tejgaon", value: "৳1,21,500", status: "In transit" },
  { id: "AK-2045", buyer: "B2B Kitchen Co.", crop: "Onion", quantity: "1.1 tons", destination: "Mirpur", value: "৳81,400", status: "Quality check" },
];

const views: Array<{ id: View; label: string; path: string }> = [
  { id: "home", label: "Home", path: "/" },
  { id: "market", label: "Marketplace", path: "/marketplace" },
  { id: "farmer", label: "Post Crop", path: "/farmer" },
  { id: "buyer", label: "Order", path: "/buyer" },
  { id: "prices", label: "Prices", path: "/prices" },
  { id: "admin", label: "Admin", path: "/admin" },
];

const routeByView = views.reduce<Record<View, string>>((routes, item) => {
  routes[item.id] = item.path;
  return routes;
}, {} as Record<View, string>);

const roleOptions: Array<{ role: Role; label: string; detail: string; view: View; icon: typeof LayoutDashboard }> = [
  { role: "admin", label: "Admin", detail: "Admin account", view: "admin", icon: LayoutDashboard },
  { role: "buyer", label: "Buyer", detail: "Buyer account", view: "buyer", icon: ShoppingBag },
  { role: "farmer", label: "Seller / Farmer", detail: "Farmer app", view: "farmer", icon: Sprout },
];

const AUTH_STORAGE_KEY = "amarKrishokAuth";
const REGISTRATION_STORAGE_KEY = "amarKrishokRegistrations";

const roleHomePath: Record<Role, string> = {
  admin: "/admin",
  buyer: "/buyer",
  farmer: "/farmer",
};

function readStoredUser() {
  try {
    const savedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!savedUser) {
      return null;
    }

    const user = JSON.parse(savedUser) as AuthUser;
    return roleOptions.some((option) => option.role === user.role) ? user : null;
  } catch {
    return null;
  }
}

function readStoredRegistrations() {
  try {
    const savedRegistrations = window.localStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!savedRegistrations) {
      return [];
    }

    const registrations = JSON.parse(savedRegistrations) as RegisteredAccount[];
    return registrations.filter((account) => account.role === "buyer" || account.role === "farmer");
  } catch {
    return [];
  }
}

function makeRegistrationId(role: RegistrationRole) {
  return `${role.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

function roleCanOpenPath(role: Role, path: string) {
  if (path.startsWith("/admin")) {
    return role === "admin";
  }

  if (path.startsWith("/buyer")) {
    return role === "buyer" || role === "admin";
  }

  if (path.startsWith("/farmer")) {
    return role === "farmer" || role === "admin";
  }

  return true;
}

const dashboardStats: DashboardStat[] = [
  { label: "GMV today", value: "৳4.82L", detail: "18 orders confirmed", trend: "up" },
  { label: "Farmer payout", value: "৳3.96L", detail: "৳82K pending escrow", trend: "up" },
  { label: "Active supply", value: "34.1 tons", detail: "78 verified lots", trend: "steady" },
  { label: "Avg price lift", value: "16.8%", detail: "vs local middleman rate", trend: "up" },
];

const adminRoutes: AdminRoute[] = [
  { route: "Bogura - Dhaka", driver: "Hasan Logistics", lots: "3 lots / 1.1 tons", status: "Pickup in 42 min", temperature: "Ambient" },
  { route: "Rangpur - Tejgaon", driver: "North Cold Van", lots: "2 lots / 4.5 tons", status: "In transit", temperature: "8°C" },
  { route: "Jashore - Dhaka", driver: "Padma Cargo", lots: "4 lots / 2.8 tons", status: "Awaiting load", temperature: "Ambient" },
  { route: "Kushtia - Dhaka", driver: "Padma Cargo", lots: "5 lots / 3.4 tons", status: "Awaiting load", temperature: "Ambient" },
];

const adminPriceSignals: AdminPriceSignal[] = [
  { crop: "Tomato", region: "Jashore", farmerAsk: 34, wholesale: 42, market: 48 },
  { crop: "Potato", region: "Rangpur", farmerAsk: 21, wholesale: 27, market: 32 },
  { crop: "Onion", region: "Pabna", farmerAsk: 63, wholesale: 74, market: 82 },
  { crop: "Chilli", region: "Bogura", farmerAsk: 86, wholesale: 98, market: 116 },
  { crop: "Rice", region: "Kushtia", farmerAsk: 38, wholesale: 44, market: 51 },
  { crop: "Eggplant", region: "Kushtia", farmerAsk: 29, wholesale: 36, market: 44 },
  { crop: "Cucumber", region: "Bogura", farmerAsk: 24, wholesale: 31, market: 38 },
  { crop: "Mango", region: "Rangpur", farmerAsk: 72, wholesale: 86, market: 105 },
];

const adminNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Orders", icon: ShoppingBag },
  { label: "Supply Lots", icon: Sprout },
  { label: "Farmers", icon: UsersRound },
  { label: "Logistics", icon: Truck },
  { label: "Payouts", icon: WalletCards },
  { label: "Settings", icon: Settings },
];

function TrendIcon({ trend }: { trend: DashboardStat["trend"] }) {
  if (trend === "down") {
    return <TrendingDown size={17} />;
  }

  if (trend === "up") {
    return <TrendingUp size={17} />;
  }

  return <Gauge size={17} />;
}

function statusClass(status: Order["status"]) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("All districts");
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [registrations, setRegistrations] = useState<RegisteredAccount[]>(() => readStoredRegistrations());
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const t = (text: string) => translate(language, text);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    if (!user || user.role === "admin") {
      return;
    }

    const account = registrations.find((item) => item.id === user.accountId);
    if (!account || account.status !== "active") {
      setUser(null);
    }
  }, [registrations, user]);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const haystack = `${lot.crop} ${lot.farmer} ${lot.district} ${t(lot.crop)} ${t(lot.farmer)} ${t(lot.district)}`;
      const textMatch = haystack.toLowerCase().includes(query.toLowerCase());
      const districtMatch = district === "All districts" || lot.district === district;
      return textMatch && districtMatch;
    });
  }, [query, district, language]);

  const selectView = (nextView: View) => {
    navigate(routeByView[nextView]);
    setMenuOpen(false);
    setLoginOpen(false);
  };

  const chooseRole = (role: Role, targetView: View) => {
    navigate(`/login?role=${role}&next=${encodeURIComponent(routeByView[targetView])}`);
    setMenuOpen(false);
    setLoginOpen(false);
  };

  const handleLogin = (nextUser: AuthUser, nextPath: string) => {
    setUser(nextUser);
    navigate(nextPath);
    setMenuOpen(false);
    setLoginOpen(false);
  };

  const handleRegister = (account: RegisteredAccount) => {
    setRegistrations((currentRegistrations) => [account, ...currentRegistrations]);
  };

  const updateRegistrationStatus = (id: string, status: AccountStatus) => {
    setRegistrations((currentRegistrations) =>
      currentRegistrations.map((account) =>
        account.id === id ? { ...account, status, reviewedAt: new Date().toISOString() } : account,
      ),
    );
  };

  const handleLogout = () => {
    setUser(null);
    setLoginOpen(false);
    if (location.pathname === "/admin" || location.pathname === "/buyer" || location.pathname === "/farmer") {
      navigate("/");
    }
  };

  const roleLabel = user ? roleOptions.find((item) => item.role === user.role)?.label : null;

  const closeHeaderMenus = () => {
    setMenuOpen(false);
    setLoginOpen(false);
  };

  return (
    <LanguageContext.Provider value={language}>
    <main className="app-shell" lang={language === "bn" ? "bn" : "en"}>
      <header className="site-header">
        <button
          className="icon-button mobile-only"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t("Close menu") : t("Open menu")}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <NavLink className="brand" to="/" onClick={closeHeaderMenus} aria-label={t("AmarKrishok home")} end>
          <span className="brand-mark">
            <Sprout size={22} strokeWidth={2.6} />
          </span>
          <span>
            <strong>AmarKrishok</strong>
            <small>{t("Direct from Farmer, Fair for All")}</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label={t("Main navigation")}>
          {views.map((item) => (
            <NavLink end={item.path === "/"} key={item.id} to={item.path} onClick={closeHeaderMenus}>
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <div className="language-switch" aria-label={t("Language switch")}>
            <button className={language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>
              EN
            </button>
            <button className={language === "bn" ? "active" : ""} type="button" onClick={() => setLanguage("bn")}>
              বাংলা
            </button>
          </div>
          <button className="icon-button" type="button" aria-label={t("Notifications")}>
            <Bell size={18} />
          </button>
          <div className="login-shell">
            <button
              className="secondary-button"
              type="button"
              aria-expanded={loginOpen}
              aria-haspopup="menu"
              onClick={() => setLoginOpen((value) => !value)}
            >
              <LockKeyhole size={17} />
              {roleLabel ? t(roleLabel) : t("Login")}
              <ChevronDown size={15} />
            </button>
            {loginOpen && (
              <div className="login-menu" role="menu">
                {user ? (
                  <div className="signed-in-note">
                    <span>{t("Signed in as")}</span>
                    <strong>{user.name}</strong>
                  </div>
                ) : (
                  <span>{t("Choose login type")}</span>
                )}
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button className="role-option" key={option.role} type="button" role="menuitem" onClick={() => chooseRole(option.role, option.view)}>
                      <Icon size={18} />
                      <span>
                        <strong>{t(option.label)}</strong>
                        <small>{t(option.detail)}</small>
                      </span>
                    </button>
                  );
                })}
                {!user && (
                  <>
                    <NavLink className="role-option" to="/register/buyer" onClick={closeHeaderMenus}>
                      <ShoppingBag size={18} />
                      <span>
                        <strong>{t("Register buyer")}</strong>
                        <small>{t("New buyer account")}</small>
                      </span>
                    </NavLink>
                    <NavLink className="role-option" to="/register/farmer" onClick={closeHeaderMenus}>
                      <Sprout size={18} />
                      <span>
                        <strong>{t("Register seller")}</strong>
                        <small>{t("New seller account")}</small>
                      </span>
                    </NavLink>
                  </>
                )}
                {user && (
                  <button className="role-option danger" type="button" role="menuitem" onClick={handleLogout}>
                    <X size={18} />
                    <span>
                      <strong>{t("Logout")}</strong>
                      <small>{t("Switch account")}</small>
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {menuOpen && (
          <nav className="mobile-menu-panel" aria-label={t("Mobile navigation")}>
            {views.map((item) => (
              <NavLink end={item.path === "/"} key={item.id} to={item.path} onClick={closeHeaderMenus}>
                {t(item.label)}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <Routes location={location}>
        <Route path="/" element={<HomeView setView={selectView} />} />
        <Route
          path="/marketplace"
          element={
            <MarketplaceView
              district={district}
              filteredLots={filteredLots}
              query={query}
              setDistrict={setDistrict}
              setQuery={setQuery}
              setView={selectView}
            />
          }
        />
        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user}>
              <FarmerView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer"
          element={
            <ProtectedRoute allowedRoles={["buyer", "admin"]} user={user}>
              <BuyerView />
            </ProtectedRoute>
          }
        />
        <Route path="/prices" element={<PricesView />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]} user={user}>
              <AdminView registrations={registrations} onUpdateRegistration={updateRegistrationStatus} />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginView onLogin={handleLogin} registrations={registrations} user={user} />} />
        <Route path="/register" element={<Navigate to="/register/buyer" replace />} />
        <Route path="/register/buyer" element={<RegisterView registrations={registrations} role="buyer" onRegister={handleRegister} />} />
        <Route path="/register/farmer" element={<RegisterView registrations={registrations} role="farmer" onRegister={handleRegister} />} />
        <Route path="/market" element={<Navigate to="/marketplace" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    </LanguageContext.Provider>
  );
}

function ProtectedRoute({
  allowedRoles,
  children,
  user,
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
  user: AuthUser | null;
}) {
  const location = useLocation();
  const t = useTranslate();

  if (!user) {
    const fallbackRole = allowedRoles[0];
    return <Navigate to={`/login?role=${fallbackRole}&next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <section className="page-wrap auth-layout">
        <div className="panel auth-panel">
          <ShieldCheck size={28} />
          <span>{t("Protected area")}</span>
          <h1>{t("This page is protected")}</h1>
          <p>{t("Your current role cannot open this page.")}</p>
          <div className="auth-actions">
            <NavLink className="secondary-button" to={`/login?role=${allowedRoles[0]}&next=${encodeURIComponent(location.pathname)}`}>
              {t("Switch account")}
            </NavLink>
            <NavLink className="primary-button" to="/">
              {t("Go home")}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return children;
}

function LoginView({
  onLogin,
  registrations,
  user,
}: {
  onLogin: (nextUser: AuthUser, nextPath: string) => void;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const params = new URLSearchParams(location.search);
  const queryRole = params.get("role");
  const safeQueryRole = roleOptions.some((option) => option.role === queryRole) ? (queryRole as Role) : "buyer";
  const queryNext = params.get("next") ?? roleHomePath[safeQueryRole];
  const safeNext = queryNext.startsWith("/") && !queryNext.startsWith("//") ? queryNext : roleHomePath[safeQueryRole];
  const [role, setRole] = useState<Role>(safeQueryRole);
  const [name, setName] = useState(user?.role === safeQueryRole ? user.name : "");
  const [phone, setPhone] = useState(user?.role === safeQueryRole ? user.phone : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const roleOption = roleOptions.find((option) => option.role === role) ?? roleOptions[1];
  const RoleIcon = roleOption.icon;

  const submitLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError(t("Please enter your name."));
      return;
    }

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (password.length < 4) {
      setError(t("PIN must be at least 4 characters."));
      return;
    }

    if (role !== "admin") {
      const account = registrations.find((item) => item.role === role && item.phone === cleanPhone);

      if (!account) {
        setError(t("Account not found. Please register first."));
        return;
      }

      if (account.status === "pending") {
        setError(t("Account is waiting for admin verification."));
        return;
      }

      if (account.status === "rejected") {
        setError(t("Registration was not approved. Please contact admin."));
        return;
      }

      if (account.password !== password) {
        setError(t("Password does not match."));
        return;
      }

      const nextPath = roleCanOpenPath(role, safeNext) ? safeNext : roleHomePath[role];
      onLogin({ accountId: account.id, name: account.name, phone: account.phone, role, signedInAt: new Date().toISOString() }, nextPath);
      return;
    }

    const nextPath = roleCanOpenPath(role, safeNext) ? safeNext : roleHomePath[role];
    onLogin({ name: cleanName, phone: cleanPhone, role, signedInAt: new Date().toISOString() }, nextPath);
  };

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel" onSubmit={submitLogin}>
        <div className="auth-icon">
          <RoleIcon size={28} />
        </div>
        <span>{t("Secure login")}</span>
        <h1>{t("Login to continue")}</h1>
        <p>{t("Choose your role and sign in to access protected AmarKrishok tools.")}</p>

        <label className="input-field">
          <span>{t("Role")}</span>
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {roleOptions.map((option) => (
              <option key={option.role} value={option.role}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </label>

        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
        </label>
        <label className="input-field">
          <span>{t("PIN or password")}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={v("1234")} />
          <small>{t("Use any 4+ character PIN for this prototype.")}</small>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          {role !== "admin" && (
            <NavLink className="secondary-button" to={`/register/${role}`}>
              {t("Register")}
            </NavLink>
          )}
          <button className="primary-button" type="submit">
            <LockKeyhole size={17} />
            {t("Sign in")}
          </button>
        </div>
      </form>
    </section>
  );
}

function RegisterView({
  onRegister,
  registrations,
  role,
}: {
  onRegister: (account: RegisteredAccount) => void;
  registrations: RegisteredAccount[];
  role: RegistrationRole;
}) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const roleOption = roleOptions.find((option) => option.role === role) ?? roleOptions[1];
  const RoleIcon = roleOption.icon;
  const [submittedAccount, setSubmittedAccount] = useState<RegisteredAccount | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [identity, setIdentity] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const title = role === "buyer" ? "Create buyer account" : "Create seller account";

  const submitRegistration = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanOrganization = organization.trim();
    const cleanDistrict = district.trim();
    const cleanAddress = address.trim();
    const cleanIdentity = identity.trim();
    const cleanFocus = focus.trim();

    if (!cleanName || !cleanPhone || !cleanPassword || !cleanOrganization || !cleanDistrict || !cleanAddress || !cleanIdentity || !cleanFocus) {
      setError(t("Please fill in all registration fields."));
      return;
    }

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (cleanPassword.length < 4) {
      setError(t("PIN must be at least 4 characters."));
      return;
    }

    const existingAccount = registrations.find((account) => account.role === role && account.phone === cleanPhone && account.status !== "rejected");
    if (existingAccount) {
      setError(t("An account with this role and phone already exists."));
      return;
    }

    const nextAccount: RegisteredAccount = {
      id: makeRegistrationId(role),
      role,
      status: "pending",
      name: cleanName,
      phone: cleanPhone,
      password: cleanPassword,
      organization: cleanOrganization,
      district: cleanDistrict,
      address: cleanAddress,
      identity: cleanIdentity,
      focus: cleanFocus,
      submittedAt: new Date().toISOString(),
    };

    onRegister(nextAccount);
    setSubmittedAccount(nextAccount);
    setError("");
  };

  if (submittedAccount) {
    return (
      <section className="page-wrap auth-layout">
        <div className="panel auth-panel">
          <div className="auth-icon">
            <CheckCircle2 size={28} />
          </div>
          <span>{t("Registration submitted")}</span>
          <h1>{t("Registration submitted")}</h1>
          <div className="auth-notice pending">
            <Clock3 size={20} />
            <div>
              <strong>{t("Pending verification")}</strong>
              <p>{t("Your account is pending admin verification. You can sign in after approval.")}</p>
            </div>
          </div>
          <div className="registration-summary">
            <span>{t(roleOption.label)}</span>
            <strong>{submittedAccount.name}</strong>
            <small>{submittedAccount.phone}</small>
          </div>
          <div className="auth-actions">
            <NavLink className="secondary-button" to="/">
              {t("Go home")}
            </NavLink>
            <NavLink className="primary-button" to={`/login?role=${role}&next=${encodeURIComponent(roleHomePath[role])}`}>
              {t("Back to login")}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel" onSubmit={submitRegistration}>
        <div className="auth-icon">
          <RoleIcon size={28} />
        </div>
        <span>{t("New registration")}</span>
        <h1>{t(title)}</h1>
        <p>{t("Submit your information. Admin will verify it before your account becomes active.")}</p>

        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
        </label>
        <label className="input-field">
          <span>{t("PIN or password")}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={v("1234")} />
        </label>
        <label className="input-field">
          <span>{t("Business / farm name")}</span>
          <input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder={t("Shop, restaurant, company, or farm")} />
        </label>
        <label className="input-field">
          <span>{t("District")}</span>
          <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder={t("Jashore")} />
        </label>
        <label className="input-field">
          <span>{t("Address")}</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={t("Dhaka North")} />
        </label>
        <label className="input-field">
          <span>{t("NID / trade license")}</span>
          <input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder={t("Sample identity")} />
        </label>
        <label className="input-field">
          <span>{t("Crop interest / supply focus")}</span>
          <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder={t("Tomato, potato, chilli...")} />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          <button className="primary-button" type="submit">
            <ClipboardCheck size={17} />
            {t("Submit registration")}
          </button>
        </div>
      </form>
    </section>
  );
}

function HomeView({ setView }: { setView: (view: View) => void }) {
  const t = useTranslate();
  const v = useValueText();
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="status-pill">
            <ShieldCheck size={16} />
            {t("Verified farmer-to-buyer marketplace")}
          </div>
          <h1>{t("Farmers post crops. Buyers order directly. Admins manage the chain.")}</h1>
          <p>
            {t("A direct supply-chain platform for Bangladesh where farmers post harvests, buyers order transparently, logistics partners deliver, and payments stay protected.")}
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setView("market")}>
              {t("Browse crops")}
            </button>
            <button className="secondary-button large" type="button" onClick={() => setView("farmer")}>
              {t("Post a crop")}
            </button>
          </div>
        </div>

        <div className="market-console">
          <div className="console-header">
            <div>
              <span>{t("Today's supply")}</span>
              <strong>{t("Live lots from verified farmers")}</strong>
            </div>
            <ListFilter size={20} />
          </div>
          <div className="listing-grid compact">
            {lots.slice(0, 3).map((lot) => (
              <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} />
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-band" aria-label={t("Platform metrics")}>
        <div>
          <strong>{v("27.4 tons")}</strong>
          <span>{t("active verified supply")}</span>
        </div>
        <div>
          <strong>{v("18")}</strong>
          <span>{t("orders confirmed today")}</span>
        </div>
        <div>
          <strong>{v("16.8%")}</strong>
          <span>{t("average farmer price lift")}</span>
        </div>
        <div>
          <strong>{v("৳82K")}</strong>
          <span>{t("escrow pending release")}</span>
        </div>
      </section>

      <section className="workflow-section">
        {[
          { icon: Sprout, title: "Farmer posts crop", text: "Crop, district, quantity, grade, harvest date, and asking price." },
          { icon: ShoppingBag, title: "Buyer orders", text: "Retailers and restaurants reserve lots or request bulk supply." },
          { icon: Truck, title: "Logistics runs", text: "Pickup, delivery, and proof stay visible to all parties." },
          { icon: WalletCards, title: "Admin releases payout", text: "Escrow protects buyers and pays farmers after confirmation." },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <article className="workflow-card" key={step.title}>
              <Icon size={24} />
              <h3>{t(step.title)}</h3>
              <p>{t(step.text)}</p>
            </article>
          );
        })}
      </section>

      <section className="trust-section" id="trust">
        <div className="trust-panel">
          <div className="section-title trust-title">
            <span>{t("Trust layer")}</span>
            <h1>{t("Quality, payment, and delivery stay visible.")}</h1>
            <p>
              {t("AmarKrishok reduces middleman abuse by keeping lot grading, escrow status, buyer history, and delivery proof in one shared record.")}
            </p>
          </div>

          <div className="trust-list">
            <div>
              <ClipboardCheck size={20} />
              <span>{t("Digital quality checklist before pickup")}</span>
            </div>
            <div>
              <Clock3 size={20} />
              <span>{t("Delivery milestones with buyer confirmation")}</span>
            </div>
            <div>
              <HeartHandshake size={20} />
              <span>{t("Farmer co-op groups for bulk orders")}</span>
            </div>
          </div>
        </div>

        <aside className="buyer-card" aria-label={t("Buyer request")}>
          <div className="buyer-card-header">
            <ShoppingBag size={22} />
            <span>{t("Buyer request")}</span>
          </div>
          <h3>{t("Need 2 tons tomato for Dhaka retail chain")}</h3>
          <p>{t("Preferred delivery: next morning. Escrow ready after lot approval.")}</p>
          <button className="primary-button full" type="button" onClick={() => setView("buyer")}>
            {t("Match farmers")}
          </button>
        </aside>
      </section>
    </>
  );
}

function MarketplaceView({
  district,
  filteredLots,
  query,
  setDistrict,
  setQuery,
  setView,
}: {
  district: string;
  filteredLots: CropLot[];
  query: string;
  setDistrict: (value: string) => void;
  setQuery: (value: string) => void;
  setView: (view: View) => void;
}) {
  const t = useTranslate();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Marketplace" title="Search crops by location and reserve directly from farmers." />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search tomato, potato, farmer...")} />
        </label>
        <label className="select-field">
          <MapPin size={18} />
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="All districts">{t("All districts")}</option>
            <option value="Jashore">{t("Jashore")}</option>
            <option value="Bogura">{t("Bogura")}</option>
            <option value="Rangpur">{t("Rangpur")}</option>
            <option value="Pabna">{t("Pabna")}</option>
            <option value="Kushtia">{t("Kushtia")}</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      <div className="listing-grid market-grid">
        {filteredLots.map((lot) => (
          <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} />
        ))}
      </div>
    </section>
  );
}

function FarmerView() {
  const t = useTranslate();
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Farmer app" title="Post a crop lot for direct buyer orders." />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Crop name" placeholder="Tomato" />
          <Input label="District" placeholder="Jashore" />
          <Input label="Quantity" placeholder="1.2 tons" />
          <Input label="Expected price" placeholder="৳34/kg" />
          <Input label="Harvest date" placeholder="Tomorrow morning" />
          <Input label="Grade" placeholder="A / B+ / C" />
        </FormGrid>
        <label className="full-field">
          <span>{t("Notes")}</span>
          <textarea placeholder={t("Packaging, pickup point, storage condition...")} />
        </label>
        <button className="primary-button full" type="button">
          <Plus size={18} />
          {t("Publish crop lot")}
        </button>
      </form>
      <aside className="panel side-panel">
        <UserRoundCheck size={24} />
        <h3>{t("Farmer profile readiness")}</h3>
        <p>{t("Phone OTP, NID, farm location, and bank/mobile wallet details should be verified before payout.")}</p>
        <div className="checklist">
          <span><CheckCircle2 size={18} /> {t("Phone verified")}</span>
          <span><CheckCircle2 size={18} /> {t("Farm location added")}</span>
          <span><Clock3 size={18} /> {t("Wallet verification pending")}</span>
        </div>
      </aside>
    </section>
  );
}

function BuyerView() {
  const t = useTranslate();
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Buyer order" title="Place a direct order or bulk request." />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Buyer name" placeholder="Restaurant / retailer / family group" />
          <Input label="Crop needed" placeholder="Tomato" />
          <Input label="Quantity" placeholder="2 tons" />
          <Input label="Delivery area" placeholder="Dhaka North" />
          <Input label="Target date" placeholder="Tomorrow 8 AM" />
          <Input label="Offer price" placeholder="৳42/kg" />
        </FormGrid>
        <label className="full-field">
          <span>{t("Quality requirement")}</span>
          <textarea placeholder={t("Grade, packaging, ripeness, delivery notes...")} />
        </label>
        <button className="primary-button full" type="button">
          <ShoppingBag size={18} />
          {t("Submit order request")}
        </button>
      </form>
      <aside className="panel side-panel">
        <Store size={24} />
        <h3>{t("Matched supply")}</h3>
        <p>{t("Current best match: 3 verified tomato lots from Jashore, total 2.9 tons.")}</p>
        <button className="secondary-button full" type="button">{t("View matched lots")}</button>
      </aside>
    </section>
  );
}

function PricesView() {
  const t = useTranslate();
  const v = useValueText();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Market prices" title="Daily farmer, wholesale, and retail price signals." />
      <div className="price-table panel">
        {prices.map((price) => (
          <div className="price-row" key={`${price.crop}-${price.district}`}>
            <div>
              <strong>{t(price.crop)}</strong>
              <span>{t(price.district)}</span>
            </div>
            <div>
              <span>{t("Farmer ask")}</span>
              <strong>{v(`${price.farmerAsk}/kg`)}</strong>
            </div>
            <div>
              <span>{t("Wholesale")}</span>
              <strong>{v(`${price.wholesale}/kg`)}</strong>
            </div>
            <div>
              <span>{t("Retail")}</span>
              <strong>{v(`${price.retail}/kg`)}</strong>
            </div>
            <em>{v(price.trend)}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminView({
  onUpdateRegistration,
  registrations,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
}) {
  const t = useTranslate();
  const v = useValueText();
  const pendingRegistrations = registrations.filter((account) => account.status === "pending");
  const activeRegistrations = registrations.filter((account) => account.status === "active");
  const rejectedRegistrations = registrations.filter((account) => account.status === "rejected");
  return (
    <section className="dashboard-shell restored-dashboard">
      <aside className="sidebar" aria-label={t("Dashboard navigation")}>
        <div className="admin-brand">
          <LayoutDashboard size={22} />
          <div>
            <strong>{t("Admin Control")}</strong>
            <small>{t("Supply command")}</small>
          </div>
        </div>

        <nav className="side-nav">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={item.active ? "active" : ""} type="button" key={item.label}>
                <Icon size={19} />
                {t(item.label)}
              </button>
            );
          })}
        </nav>

        <div className="trust-summary">
          <ShieldCheck size={22} />
          <strong>{t("Escrow protected")}</strong>
          <span>{t("৳82,000 ready for farmer release after buyer confirmation.")}</span>
        </div>
      </aside>

      <div className="workspace dashboard-workspace">
        <header className="dashboard-topbar">
          <button className="mobile-menu" type="button" aria-label={t("Open admin navigation")}>
            <Menu size={22} />
          </button>

          <div className="page-title">
            <span>{t("Sunday, May 24")}</span>
            <h1>{t("Operations dashboard")}</h1>
          </div>

          <div className="topbar-actions">
            <label className="global-search">
              <Search size={18} />
              <input value={t("Search order, farmer, district...")} readOnly aria-label={t("Search dashboard")} />
            </label>
            <button className="icon-button" type="button" aria-label={t("Notifications")}>
              <Bell size={19} />
            </button>
            <button className="primary-button" type="button">
              <Plus size={18} />
              {t("New lot")}
            </button>
          </div>
        </header>

        <section className="stats-grid" aria-label={t("Business metrics")}>
          {dashboardStats.map((stat) => (
            <article className="stat-card dashboard-stat" key={stat.label}>
              <div className={`trend ${stat.trend}`}>
                <TrendIcon trend={stat.trend} />
              </div>
              <span>{t(stat.label)}</span>
              <strong>{v(stat.value)}</strong>
              <p>{t(stat.detail)}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <section className="panel orders-panel" aria-labelledby="orders-heading">
            <div className="panel-header">
              <div>
                <span>{t("Order control")}</span>
                <h2 id="orders-heading">{t("Buyer demand queue")}</h2>
              </div>
              <button className="secondary-button" type="button">
                {t("All orders")}
                <ChevronDown size={17} />
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("Order")}</th>
                    <th>{t("Buyer")}</th>
                    <th>{t("Crop")}</th>
                    <th>{t("Quantity")}</th>
                    <th>{t("Value")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("ETA")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.id}</strong>
                        <span>{t(order.destination)}</span>
                      </td>
                      <td>{t(order.buyer)}</td>
                      <td>{t(order.crop)}</td>
                      <td>{t(order.quantity)}</td>
                      <td>{v(order.value)}</td>
                      <td>
                        <em className={`status ${statusClass(order.status)}`}>{t(order.status)}</em>
                      </td>
                      <td>{order.status === "Matching" ? t("3 farmer groups") : t("Today")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel action-panel" aria-labelledby="release-heading">
            <div className="panel-header">
              <div>
                <span>{t("Payout action")}</span>
                <h2 id="release-heading">{t("Release queue")}</h2>
              </div>
              <HandCoins size={22} />
            </div>
            <div className="release-amount">
              <span>{t("Ready after QC")}</span>
              <strong>{v("৳82,000")}</strong>
            </div>
            <div className="checklist">
              <span>
                <CheckCircle2 size={18} />
                {t("Delivery photo received")}
              </span>
              <span>
                <CheckCircle2 size={18} />
                {t("Buyer weight confirmed")}
              </span>
              <span>
                <Clock3 size={18} />
                {t("Quality check pending")}
              </span>
            </div>
            <button className="primary-button full" type="button">
              {t("Review payouts")}
            </button>
          </aside>

          <section className="panel verification-panel" aria-labelledby="verification-heading">
            <div className="panel-header">
              <div>
                <span>{t("Account verification")}</span>
                <h2 id="verification-heading">{t("Pending verification")}</h2>
              </div>
              <UserRoundCheck size={22} />
            </div>
            <p className="panel-copy">{t("Buyer and seller registrations awaiting admin approval.")}</p>
            <div className="verification-stats">
              <span>
                <strong>{v(pendingRegistrations.length)}</strong>
                {t("Pending verification")}
              </span>
              <span>
                <strong>{v(activeRegistrations.length)}</strong>
                {t("Approved accounts")}
              </span>
              <span>
                <strong>{v(rejectedRegistrations.length)}</strong>
                {t("Rejected accounts")}
              </span>
            </div>
            <div className="verification-list">
              {pendingRegistrations.length === 0 && <em>{t("No pending registrations")}</em>}
              {pendingRegistrations.map((account) => (
                <article className="verification-item" key={account.id}>
                  <div>
                    <strong>{account.name}</strong>
                    <span>{t(account.role === "buyer" ? "Buyer" : "Seller / Farmer")}</span>
                  </div>
                  <div>
                    <span>{account.organization}</span>
                    <small>{account.phone}</small>
                  </div>
                  <p>
                    <MapPin size={14} />
                    {account.district} · {account.focus}
                  </p>
                  <div className="verification-actions">
                    <button className="secondary-button" type="button" onClick={() => onUpdateRegistration(account.id, "rejected")}>
                      {t("Reject")}
                    </button>
                    <button className="primary-button" type="button" onClick={() => onUpdateRegistration(account.id, "active")}>
                      <BadgeCheck size={17} />
                      {t("Approve")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel supply-panel" aria-labelledby="supply-heading">
            <div className="panel-header">
              <div>
                <span>{t("Farmer supply")}</span>
                <h2 id="supply-heading">{t("Verified lots")}</h2>
              </div>
              <button className="secondary-button" type="button">
                <ClipboardCheck size={17} />
                {t("Grade lots")}
              </button>
            </div>

            <div className="supply-list">
              {lots.slice(0, 3).map((lot) => (
                <article className="supply-item" key={lot.id}>
                  <img src={lot.image} alt={`${t(lot.crop)} ${t("supply")}`} />
                  <div>
                    <h3>{t(lot.crop)}</h3>
                    <span>{t(lot.farmer)}</span>
                    <p>
                      <MapPin size={15} />
                      {t(lot.district)}
                    </p>
                  </div>
                  <div>
                    <strong>{t(lot.quantity)}</strong>
                    <span>{v(lot.ask)}</span>
                  </div>
                  <div>
                    <strong>{t("Grade")} {t(lot.grade)}</strong>
                    <span>{t(lot.harvest)}</span>
                  </div>
                  <button className="icon-button" type="button" aria-label={`${t("Approve")} ${t(lot.crop)} ${t("lot")}`}>
                    <BadgeCheck size={19} />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel price-panel" aria-labelledby="price-heading">
            <div className="panel-header">
              <div>
                <span>{t("Price intelligence")}</span>
                <h2 id="price-heading">{t("Farmer vs market spread")}</h2>
              </div>
              <Banknote size={22} />
            </div>

            <div className="price-bars">
              {adminPriceSignals.map((price) => (
                <div className="price-row" key={price.crop}>
                  <div className="price-label">
                    <strong>{t(price.crop)}</strong>
                    <span>{t(price.region)}</span>
                  </div>
                  <div className="bar-stack" aria-label={`${t(price.crop)} ${t("price comparison")}`}>
                    <span style={{ width: `${(price.farmerAsk / price.market) * 100}%` }} />
                    <span style={{ width: `${(price.wholesale / price.market) * 100}%` }} />
                  </div>
                  <strong>{v(`৳${price.market}/kg`)}</strong>
                </div>
              ))}
            </div>
            <div className="legend">
              <span>
                <i className="farmer" />
                {t("Farmer ask")}
              </span>
              <span>
                <i className="wholesale" />
                {t("Wholesale")}
              </span>
            </div>
          </section>

          <section className="panel logistics-panel" aria-labelledby="logistics-heading">
            <div className="panel-header">
              <div>
                <span>{t("Logistics board")}</span>
                <h2 id="logistics-heading">{t("Routes in motion")}</h2>
              </div>
              <RouteIcon size={22} />
            </div>

            <div className="route-list">
              {adminRoutes.map((route) => (
                <article className="route-item" key={route.route}>
                  <div className="route-icon">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h3>{t(route.route)}</h3>
                    <span>{t(route.driver)}</span>
                  </div>
                  <div>
                    <strong>{t(route.lots)}</strong>
                    <span>{t(route.temperature)}</span>
                  </div>
                  <em>{t(route.status)}</em>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel messages-panel" aria-labelledby="messages-heading">
            <div className="panel-header">
              <div>
                <span>{t("Alerts")}</span>
                <h2 id="messages-heading">{t("Field updates")}</h2>
              </div>
              <MessageSquareText size={22} />
            </div>
            <div className="message-list">
              <span>
                <PackageCheck size={18} />
                {t("Tomato lot AKL-882 passed weight check.")}
              </span>
              <span>
                <CalendarDays size={18} />
                {t("Rangpur potato pickup moved to 8:20 PM.")}
              </span>
              <span>
                <UsersRound size={18} />
                {t("4 new farmers awaiting verification.")}
              </span>
            </div>
          </aside>
        </section>
      </div>
    </section>
  );
}

function CropCard({ lot, onOrder }: { lot: CropLot; onOrder: () => void }) {
  const t = useTranslate();
  const v = useValueText();
  return (
    <article className="crop-card">
      <img src={lot.image} alt={`${t(lot.crop)} ${t("harvest")}`} />
      <div className="crop-card-body">
        <div className="crop-title-row">
          <div>
            <h2>{t(lot.crop)}</h2>
            <p>{t(lot.farmer)}</p>
          </div>
          <span>{v(lot.ask)}</span>
        </div>
        <div className="crop-meta">
          <span><MapPin size={15} /> {t(lot.district)}</span>
          <span><PackageCheck size={15} /> {t(lot.quantity)}</span>
          <span><BadgeCheck size={15} /> {t("Grade")} {t(lot.grade)}</span>
          <span><CalendarDays size={15} /> {t(lot.harvest)}</span>
        </div>
        <button className="order-button" type="button" onClick={onOrder}>{t("Order this lot")}</button>
      </div>
    </article>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  const t = useTranslate();
  return (
    <div className="section-title">
      <span>{t(eyebrow)}</span>
      <h1>{t(title)}</h1>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  const t = useTranslate();
  return (
    <label className="input-field">
      <span>{t(label)}</span>
      <input placeholder={t(placeholder)} />
    </label>
  );
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Banknote; label: string; value: string; detail: string }) {
  const t = useTranslate();
  const v = useValueText();
  return (
    <article className="stat-card">
      <Icon size={21} />
      <span>{t(label)}</span>
      <strong>{v(value)}</strong>
      <p>{t(detail)}</p>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
