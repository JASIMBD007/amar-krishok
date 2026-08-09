import type { AppRole, AppUser, ListingSummary, OrderTimelineItem } from "../domain/types";

export const previewUsers: Record<AppRole, AppUser> = {
  FARMER: {
    district: "বগুড়া",
    id: "U1",
    name: "রহিম উদ্দিন",
    phone: "+8801711004442",
    role: "FARMER",
    status: "ACTIVE",
    verified: true,
  },
  BUYER: {
    district: "ঢাকা",
    id: "U2",
    name: "রফিক ট্রেডার্স",
    phone: "+8801712004556",
    role: "BUYER",
    status: "ACTIVE",
    verified: true,
  },
  CARRIER: {
    district: "ঢাকা",
    id: "C1",
    name: "কামাল পরিবহন",
    phone: "+880171182829",
    role: "CARRIER",
    status: "ACTIVE",
    verified: true,
  },
};

export const listings: ListingSummary[] = [
  { cropBn: "আলু", cropEn: "Potato", districtBn: "বগুড়া", farmer: "রহিম উদ্দিন", grade: "A", id: "L2", marketDelta: 3, pickup: "২৪ ঘণ্টায় পিকআপ", pricePoisha: 129000, quantityMon: 120, status: "LIVE", verified: true },
  { cropBn: "পেঁয়াজ", cropEn: "Onion", districtBn: "ফরিদপুর", farmer: "সুলতানা বেগম", grade: "A", id: "L4", marketDelta: -3, pickup: "পরিবহনসহ", pricePoisha: 218000, quantityMon: 80, status: "LIVE", verified: true },
  { cropBn: "টমেটো", cropEn: "Tomato", districtBn: "বগুড়া", farmer: "রহিম উদ্দিন", grade: "B", id: "L6", marketDelta: -6, pickup: "২৪ ঘণ্টায় পিকআপ", pricePoisha: 94000, quantityMon: 40, status: "PAUSED", verified: true },
  { cropBn: "ধান", cropEn: "Boro rice", districtBn: "নওগাঁ", farmer: "নুরুল ইসলাম", grade: "A", id: "L5", marketDelta: 1, pickup: "পরিবহনসহ", pricePoisha: 131000, quantityMon: 240, status: "LIVE", verified: true },
];

export const orderTimeline: OrderTimelineItem[] = [
  { at: "গতকাল ১৬:২০", detail: "টাকা এসক্রোতে", label: "অর্ডার হয়েছে", state: "complete" },
  { at: "গতকাল ১৮:০৫", detail: "কৃষক লট নিশ্চিত করেছেন", label: "কৃষক গ্রহণ করেছেন", state: "complete" },
  { at: "আজ ০৯:৩০", detail: "বগুড়া ছেড়েছে · ওজন ১২০.৪ মণ", label: "পরিবহনে আছে", state: "current" },
  { at: "আগামীকাল ১৪:০০", detail: "আপনার নিশ্চিতকরণের অপেক্ষায়", label: "ডেলিভারি", state: "upcoming" },
  { at: "ডেলিভারির পরে", detail: "এসক্রো থেকে স্বয়ংক্রিয়ভাবে ছাড়া হবে", label: "পেমেন্ট সম্পন্ন", state: "upcoming" },
];

export const notificationItems = [
  { body: "কামাল পরিবহন ১২০ মণ আলু তুলে নিয়েছে। আগামীকাল ১৪:০০ ডেলিভারি।", category: "অর্ডার", id: "N1", read: false, title: "AK-4821 পিকআপ হয়েছে", tone: "blue" },
  { body: "বিকাশ 01711 ••• 442 · রেফারেন্স PB-99231", category: "পেমেন্ট", id: "N4", read: false, title: "৳ 1,48,500 পাঠানো হয়েছে", tone: "green" },
  { body: "আজ ৳ 2,250 /মণ। আপনার লট বাজার দরের ৳ 110 নিচে।", category: "দর", id: "N6", read: true, title: "ফরিদপুরে পেঁয়াজ ৪.৮% বেড়েছে", tone: "green" },
  { body: "আপনার এনআইডি ও জমির দলিল যাচাই হয়েছে।", category: "সিস্টেম", id: "N8", read: true, title: "যাচাই অনুমোদিত", tone: "grey" },
] as const;
