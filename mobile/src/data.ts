export const fallbackDistricts = ["Bogura", "Jashore", "Kushtia", "Pabna", "Rangpur"];

export const upazillasByDistrict: Record<string, string[]> = {
  Bogura: ["Bogura Sadar", "Shibganj", "Sherpur", "Gabtali", "Dhunat", "Sariakandi", "Sonatala", "Adamdighi"],
  Jashore: ["Jashore Sadar", "Chaugachha", "Jhikargacha", "Keshabpur", "Manirampur", "Bagharpara", "Abhaynagar", "Sharsha"],
  Kushtia: ["Kushtia Sadar", "Kumarkhali", "Khoksa", "Mirpur", "Bheramara", "Daulatpur"],
  Pabna: ["Pabna Sadar", "Ishwardi", "Bera", "Santhia", "Sujanagar", "Chatmohar", "Bhangura", "Faridpur", "Atgharia"],
  Rangpur: ["Rangpur Sadar", "Mithapukur", "Pirgacha", "Gangachara", "Kaunia", "Badarganj", "Taraganj", "Pirganj"],
};

export const fallbackLots = [
  {
    crop: "Tomato",
    createdAt: "2026-06-07T08:30:00.000Z",
    district: "Jashore",
    farmer: "Mst. Rahima",
    grade: "B",
    harvestDate: "2026-06-12T00:00:00.000Z",
    id: "sample-tomato",
    imageUrl: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=900&q=80",
    notes: "Ready tomorrow",
    pricePerKg: 34,
    quantityKg: 1200,
    status: "ACTIVE",
    upazilla: "Jashore Sadar",
  },
  {
    crop: "Green Chilli",
    createdAt: "2026-06-07T07:20:00.000Z",
    district: "Bogura",
    farmer: "Abdul Karim",
    grade: "A",
    harvestDate: "2026-06-11T00:00:00.000Z",
    id: "sample-chilli",
    imageUrl: "https://www.chandigarhayurvedcentre.com/wp-content/uploads/2021/10/GREEN-CHILLI.jpg",
    notes: "Ready today",
    pricePerKg: 86,
    quantityKg: 420,
    status: "ACTIVE",
    upazilla: "Bogura Sadar",
  },
  {
    crop: "Potato",
    createdAt: "2026-06-06T16:10:00.000Z",
    district: "Rangpur",
    farmer: "Nayan Mondol",
    grade: "A",
    harvestDate: null,
    id: "sample-potato",
    imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
    notes: "Cold stored",
    pricePerKg: 21,
    quantityKg: 3600,
    status: "ACTIVE",
    upazilla: "Rangpur Sadar",
  },
];

export const gradeOptions = ["A", "B", "C"];
