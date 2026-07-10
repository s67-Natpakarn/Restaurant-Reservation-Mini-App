import React, { useState, useEffect, useRef } from "react";
import liff from "@line/liff";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Clock, 
  Users, 
  User, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  Plus, 
  Minus, 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  ArrowRight,
  Utensils,
  X,
  History,
  MapPin,
  Leaf,
  Share2
} from "lucide-react";
import { reservationService, ReservationPayload } from "./api/reservationService";

const menuItems = [
  {
    id: "m1",
    name: "Heirloom Carrots & Wild Herbs",
    description: "Charred heirloom baby carrots with honey-thyme glaze, pumpkin seed butter, and micro-herbs.",
    price: "$24",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m2",
    name: "Organic Green Garden Harvest",
    description: "Crisp local greens, roasted asparagus, watermelon radish, pistachio crumble, and wild ramp vinaigrette.",
    price: "$19",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m3",
    name: "Wild Forest Mushroom Risotto",
    description: "Creamy carnaroli rice with chanterelles, black truffle shavings, aged parmigiano, and fresh thyme.",
    price: "$32",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m4",
    name: "Velvet Chocolate Mousse",
    description: "Whipped Peruvian dark chocolate, organic avocado whip, sea salt flakes, and candied orange zest.",
    price: "$16",
    image: "https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m5",
    name: "Herbal Gin & Botanical Infusion",
    description: "House-distilled botanical gin, cucumber juice, elderflower liqueur, mint oil, and fresh verbena.",
    price: "$18",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80"
  }
];

// Helper to format Date objects
const formatDateToValue = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToFull = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
};

const formatDateToShortDay = (date: Date): string => {
  return date.toLocaleDateString("en-US", { weekday: "short" });
};

const formatDateToShortNum = (date: Date): string => {
  return date.getDate().toString();
};

export default function App() {
  const [menuIndex, setMenuIndex] = useState<number>(0);
  // Guest counter: default 2, min 1, max 10
  const [guests, setGuests] = useState<number>(2);

  // Generate next 14 days starting from today
  const dateList = useRef<Date[]>(
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    })
  ).current;

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(dateList[0]);

  // Preferred times
  const lunchTimes = ["11:30", "12:00", "12:30", "13:00", "13:30", "14:00"];
  const dinnerTimes = ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];
  
  const [selectedTime, setSelectedTime] = useState<string>("");

  // LINE LIFF state
  const [isLiffInit, setIsLiffInit] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [profile, setProfile] = useState<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  } | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [liffContext, setLiffContext] = useState<any>(null);
  const [isShareAvailable, setIsShareAvailable] = useState<boolean>(false);

  // Contact Info
  const [fullName, setFullName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [specialRequest, setSpecialRequest] = useState<string>("");

  // API Status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReservation, setSuccessReservation] = useState<any | null>(null);

  // All Bookings (fetched on mount and refresh)
  const [bookings, setBookings] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Fetch all bookings for verification
  const loadBookings = async () => {
    const res = await reservationService.fetchReservations();
    if (res.success && res.reservations) {
      setBookings(res.reservations);
    }
  };

  useEffect(() => {
    const liffId = (import.meta as any).env.VITE_LIFF_ID;
    if (!liffId) {
      console.warn("VITE_LIFF_ID is not defined in the environment variables.");
      setLiffError("LIFF ID is missing. Please check your environment variables.");
      return;
    }

    liff
      .init({ liffId, withLoginOnExternalBrowser: true })
      .then(() => {
        setIsLiffInit(true);
        const loggedIn = liff.isLoggedIn();
        setIsLoggedIn(loggedIn);
        setLiffContext(liff.getContext());
        setIsShareAvailable(liff.isApiAvailable("shareTargetPicker"));

        if (loggedIn) {
          liff
            .getProfile()
            .then((p) => {
              setProfile(p);
              setFullName(p.displayName);
            })
            .catch((err: any) => {
              console.error("Error getting LINE profile:", err);
              setLiffError("Failed to fetch profile: " + err.message);
            });
        }
      })
      .catch((err: any) => {
        console.error("LIFF initialization failed:", err);
        setLiffError("LIFF Initialization failed: " + err.message);
      });
  }, []);

  const handleLogin = () => {
    if (isLiffInit && !liff.isLoggedIn()) {
      liff.login();
    }
  };

  const handleLogout = () => {
    if (isLiffInit && liff.isLoggedIn()) {
      liff.logout();
      setIsLoggedIn(false);
      setProfile(null);
      setFullName("");
    }
  };

  const handleInviteFriends = async () => {
    if (!isLiffInit) return;
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    if (liff.isApiAvailable("shareTargetPicker")) {
      const liffId = liff.getContext()?.liffId || (import.meta as any).env.VITE_LIFF_ID || "2010663880-QqBFRfDu";
      const liffUrl = `https://liff.line.me/${liffId}`;

      try {
        const res = await liff.shareTargetPicker([
          {
            type: "flex" as const,
            altText: "มาจองโต๊ะด้วยกันที่ The Green Table",
            contents: {
              type: "bubble" as const,
              hero: {
                type: "image" as const,
                url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
                size: "full" as const,
                aspectRatio: "20:13" as const,
                aspectMode: "cover" as const
              },
              body: {
                type: "box" as const,
                layout: "vertical" as const,
                contents: [
                  {
                    type: "text" as const,
                    text: "The Green Table",
                    weight: "bold" as const,
                    size: "xl" as const,
                    color: "#1A1A1A"
                  },
                  {
                    type: "text" as const,
                    text: "มาจองโต๊ะด้วยกันที่ The Green Table",
                    margin: "md" as const,
                    size: "sm" as const,
                    color: "#4B5563",
                    wrap: true
                  }
                ]
              },
              footer: {
                type: "box" as const,
                layout: "vertical" as const,
                spacing: "sm" as const,
                contents: [
                  {
                    type: "button" as const,
                    style: "primary" as const,
                    height: "sm" as const,
                    color: "#00C853",
                    action: {
                      type: "uri" as const,
                      label: "จองโต๊ะเลย",
                      uri: liffUrl
                    }
                  }
                ]
              }
            }
          }
        ]);
        if (res) {
          console.log("Invitation shared successfully!");
        } else {
          console.log("Invitation sharing cancelled.");
        }
      } catch (err: any) {
        console.error("Error sharing invitation:", err);
      }
    } else {
      console.warn("Share Target Picker is not available in this environment.");
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Handle Increments / Decrements
  const incrementGuests = () => setGuests(prev => Math.min(10, prev + 1));
  const decrementGuests = () => setGuests(prev => Math.max(1, prev - 1));

  // Validation: Button disabled until form is completely filled
  const isFormValid = 
    fullName.trim() !== "" && 
    phoneNumber.trim() !== "" && 
    selectedTime !== "" && 
    guests >= 1 && 
    guests <= 10;

  // Handle Reservation Submission
  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMsg(null);

    const payload: ReservationPayload = {
      guests,
      date: formatDateToValue(selectedDate),
      time: selectedTime,
      customerName: fullName,
      customerPhone: phoneNumber,
      specialRequest: specialRequest || undefined
    };

    const res = await reservationService.submitReservation(payload);
    setIsLoading(false);

    if (res.success && res.reservation) {
      setSuccessReservation(res.reservation);
      // Reset form fields
      setFullName("");
      setPhoneNumber("");
      setSpecialRequest("");
      setSelectedTime("");
      setGuests(2);
      setSelectedDate(dateList[0]);
      // Reload bookings to show the user the backend updated live state
      loadBookings();
    } else {
      setErrorMsg(res.error || "Something went wrong. Please check your reservation details.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-[#1A1A1A] selection:bg-[#00C853] selection:text-white flex items-center justify-center py-6 px-4">
      {/* Container holding the single column elegant form - phone mockup feel */}
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col justify-between min-h-[780px] relative">
        
        {/* Header Section */}
        <div>
          {/* Beautiful Hero Image */}
          <div className="relative h-48 w-full overflow-hidden bg-gray-100">
            <img 
              src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80" 
              alt="The Green Table Dining Room" 
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-102"
              referrerPolicy="no-referrer"
            />
            {/* Elegant overlay to maintain top bar green accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#00C853]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-[#00C853] shadow-xs">
                <Leaf className="w-2.5 h-2.5 mr-1 fill-[#00C853]/15" /> Sustainably Sourced
              </span>
              <span className="text-white text-[9px] font-medium bg-black/40 px-2 py-0.5 rounded-md">
                Est. 2018
              </span>
            </div>
          </div>

          {/* LINE Mini App Auth Bar */}
          <div className="bg-[#F4F9F5] border-b border-[#E8F5E9] px-6 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isLiffInit ? "bg-[#06C755] shadow-[0_0_8px_rgba(6,199,85,0.5)] animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[11px] text-gray-600 font-medium tracking-wide">
                {!isLiffInit ? (
                  "Initializing LINE..."
                ) : liff.isInClient() ? (
                  <span className="flex items-center text-[#06C755] font-semibold">
                    LINE In-App Browser
                  </span>
                ) : (
                  "LINE External Web App"
                )}
              </span>
            </div>
            
            <div>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer text-[11px] uppercase tracking-wider"
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={!isLiffInit}
                  className="bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-full transition-colors flex items-center space-x-1 cursor-pointer text-[11px] uppercase tracking-wider shadow-xs"
                >
                  <span>Login with LINE</span>
                </button>
              )}
            </div>
          </div>

          <header className="px-6 pt-5 pb-4 border-b border-gray-50 text-center bg-white">
            <h1 className="font-sans text-2xl font-bold text-[#1A1A1A] mb-1 tracking-tight">
              The Green Table
            </h1>
            <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">
              Sustainable Fine Dining
            </p>

            <div className="mt-3 flex items-center justify-center space-x-3 text-[11px] text-[#888]">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1 text-[#00C853]" /> 
                120 Garden Lane, SF
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-[#00C853] font-semibold">★ 4.9 Rating</span>
            </div>
          </header>

          {/* Sample Menu Carousel Section */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-50 bg-gray-50/25">
            <h2 className="text-[11px] font-bold text-[#AAA] uppercase tracking-wider mb-3 flex justify-between items-center">
              <span>EXPLORE THE MENU</span>
              <span className="text-xs text-[#00C853] font-sans font-semibold">Seasonal</span>
            </h2>

            {/* Menu Card */}
            <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs flex flex-col">
              {/* Card Image */}
              <div className="relative h-40 w-full bg-gray-50 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={menuItems[menuIndex].id}
                    src={menuItems[menuIndex].image}
                    alt={menuItems[menuIndex].name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>
                {/* Price tag */}
                <div className="absolute top-3 right-3 bg-[#00C853] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  {menuItems[menuIndex].price}
                </div>
              </div>

              {/* Card details */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="font-sans text-sm font-bold text-[#1A1A1A] leading-tight">
                    {menuItems[menuIndex].name}
                  </h3>
                  <p className="text-[11px] text-gray-500 leading-normal min-h-[32px]">
                    {menuItems[menuIndex].description}
                  </p>
                </div>

                {/* Controls and Indicator Dots */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                  {/* Indicator Dots */}
                  <div className="flex space-x-1">
                    {menuItems.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setMenuIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          i === menuIndex ? "bg-[#00C853] w-3" : "bg-gray-200"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Nav Buttons */}
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setMenuIndex(prev => (prev === 0 ? menuItems.length - 1 : prev - 1))}
                      className="w-7 h-7 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition active:scale-95 cursor-pointer"
                      aria-label="Previous dish"
                    >
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuIndex(prev => (prev === menuItems.length - 1 ? 0 : prev + 1))}
                      className="w-7 h-7 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition active:scale-95 cursor-pointer"
                      aria-label="Next dish"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleReserve} className="p-5 space-y-5">
            
            {/* LINE User Profile Card */}
            {isLoggedIn && profile && (
              <div className="space-y-3">
                <div className="bg-[#E8F5E9]/80 border border-[#C8E6C9] rounded-2xl p-4 flex items-start space-x-3.5 shadow-xs">
                  {profile.pictureUrl ? (
                    <img
                      src={profile.pictureUrl}
                      alt={profile.displayName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#06C755]/10 border-2 border-white text-[#06C755] font-bold text-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      {profile.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 truncate block">
                        {profile.displayName}
                      </span>
                      <span className="inline-flex items-center text-[9px] bg-[#06C755] text-white px-2 py-0.5 rounded-full font-semibold font-mono tracking-wide">
                        LINE USER
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 break-all" title={profile.userId}>
                      <span className="text-gray-400 font-semibold select-none">LINE ID: </span>{profile.userId}
                    </p>
                    {profile.statusMessage && (
                      <p className="text-[10px] text-gray-600 italic bg-white/60 rounded-lg px-2.5 py-1.5 mt-2 border border-emerald-50/50 leading-relaxed break-words">
                        "{profile.statusMessage}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Invite Friends Button */}
                {isShareAvailable && (
                  <button
                    type="button"
                    onClick={handleInviteFriends}
                    className="w-full h-11 bg-white border border-[#06C755] hover:bg-[#F4F9F5] active:scale-[0.99] text-[#06C755] font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider shadow-xs cursor-pointer"
                    id="btn-invite-friends"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Invite Friends</span>
                  </button>
                )}
              </div>
            )}

            {/* 1. Guest Selector Section */}
            <div className="space-y-2">
              <h2 className="text-[11px] font-bold text-[#AAA] uppercase tracking-wider flex justify-between items-baseline">
                <span>GUESTS</span>
                <span className="text-[#00C853] text-xs font-semibold normal-case">
                  {guests} {guests === 1 ? "person" : "persons"}
                </span>
              </h2>
              
              <div className="flex items-center justify-center gap-8 bg-[#F9FAFB] p-3 rounded-2xl border border-gray-100">
                <button
                  type="button"
                  onClick={decrementGuests}
                  disabled={guests <= 1}
                  className="w-12 h-12 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center text-xl text-[#1A1A1A] transition active:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none shadow-sm cursor-pointer"
                  aria-label="Decrease guests"
                  id="btn-decrement-guests"
                >
                  <Minus className="w-4 h-4" />
                </button>
                
                <span className="text-xl font-semibold w-8 text-center text-[#1A1A1A]">
                  {guests}
                </span>

                <button
                  type="button"
                  onClick={incrementGuests}
                  disabled={guests >= 10}
                  className="w-12 h-12 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center text-xl text-[#1A1A1A] transition active:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none shadow-sm cursor-pointer"
                  aria-label="Increase guests"
                  id="btn-increment-guests"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Dining Date Picker Section */}
            <div className="space-y-2">
              <h2 className="text-[11px] font-bold text-[#AAA] uppercase tracking-wider flex justify-between items-baseline">
                <span>DATE</span>
                <span className="text-[#00C853] text-xs font-semibold normal-case">
                  {formatDateToFull(selectedDate)}
                </span>
              </h2>

              {/* Horizontal Scroll Date Selector */}
              <div className="relative">
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none snap-x">
                  {dateList.map((date, index) => {
                    const isSelected = formatDateToValue(date) === formatDateToValue(selectedDate);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 w-[64px] h-[76px] rounded-[14px] flex flex-col justify-center items-center transition-all duration-200 snap-start border ${
                          isSelected
                            ? "bg-[#00C853] border-[#00C853] text-white shadow-sm"
                            : "bg-[#F9FAFB] border-[#F1F3F5] text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                        id={`date-btn-${index}`}
                      >
                        <span className={`text-[10px] uppercase font-semibold tracking-wide ${isSelected ? "text-green-50 opacity-90" : "text-gray-400"}`}>
                          {formatDateToShortDay(date)}
                        </span>
                        <span className="text-lg font-bold mt-0.5">
                          {formatDateToShortNum(date)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Preferred Time Split Slots Section */}
            <div className="space-y-3">
              <h2 className="text-[11px] font-bold text-[#AAA] uppercase tracking-wider flex justify-between items-baseline">
                <span>PREFERRED TIME</span>
                {selectedTime && (
                  <span className="text-[#00C853] text-xs font-semibold">
                    {selectedTime}
                  </span>
                )}
              </h2>

              {/* Lunch Category */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Lunch Slots</span>
                <div className="grid grid-cols-3 gap-2">
                  {lunchTimes.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`h-12 rounded-xl transition-all duration-150 border text-sm font-medium flex items-center justify-center ${
                          isSelected
                            ? "bg-[#00C853] border-[#00C853] text-white font-semibold"
                            : "bg-[#F9FAFB] border-[#F1F3F5] hover:bg-gray-50 hover:border-gray-300 text-[#4B5563]"
                        }`}
                        id={`time-lunch-${time.replace(":", "")}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dinner Category */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Dinner Slots</span>
                <div className="grid grid-cols-3 gap-2">
                  {dinnerTimes.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`h-12 rounded-xl transition-all duration-150 border text-sm font-medium flex items-center justify-center ${
                          isSelected
                            ? "bg-[#00C853] border-[#00C853] text-white font-semibold"
                            : "bg-[#F9FAFB] border-[#F1F3F5] hover:bg-gray-50 hover:border-gray-300 text-[#4B5563]"
                        }`}
                        id={`time-dinner-${time.replace(":", "")}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Contact Details Form */}
            <div className="space-y-3 pt-1">
              <h2 className="text-[11px] font-bold text-[#AAA] uppercase tracking-wider">Contact Details</h2>
              
              <div className="space-y-2.5">
                {/* Full Name */}
                <div>
                  <input
                    type="text"
                    id="customer-name"
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full h-[52px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 text-[15px] text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C853] focus:border-transparent transition"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <input
                    type="tel"
                    id="customer-phone"
                    required
                    placeholder="Mobile Number"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full h-[52px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 text-[15px] text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C853] focus:border-transparent transition"
                  />
                </div>

                {/* Special Request */}
                <div>
                  <textarea
                    id="special-requests"
                    rows={2}
                    placeholder="Special Request (Optional)"
                    value={specialRequest}
                    onChange={e => setSpecialRequest(e.target.value)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3 text-[15px] text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00C853] focus:border-transparent resize-none h-16 transition"
                  />
                </div>
              </div>
            </div>

            {/* Error Message banner */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-start space-x-2"
                  id="error-banner"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">Error:</span> {errorMsg}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`w-full h-14 text-white font-bold rounded-2xl shadow-md transition-all duration-200 flex items-center justify-center space-x-2 text-base ${
                  isFormValid && !isLoading
                    ? "bg-[#00C853] hover:bg-[#00b04a] cursor-pointer shadow-[0_10px_15px_-3px_rgba(0,200,83,0.3)] hover:shadow-lg active:scale-[0.99]"
                    : "bg-gray-300 cursor-not-allowed opacity-60 shadow-none"
                }`}
                id="btn-submit-reservation"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Reserving...</span>
                  </>
                ) : (
                  <span>Reserve Now</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Reservation History section to verify full-stack connection */}
        <div className="bg-gray-50 p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-gray-500 hover:text-gray-900 transition font-medium text-xs py-1"
            id="btn-toggle-history"
          >
            <span className="flex items-center space-x-2">
              <History className="w-3.5 h-3.5 text-[#00C853]" />
              <span>Live Database Store ({bookings.length})</span>
            </span>
            <span className="text-[10px] text-gray-400">
              {showHistory ? "Hide Bookings" : "View Live State"}
            </span>
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 space-y-2"
              >
                {bookings.length === 0 ? (
                  <div className="text-center py-5 text-gray-400 text-[11px] border border-dashed border-gray-200 rounded-xl bg-white">
                    No active bookings found in memory database.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {bookings.map((b) => (
                      <div 
                        key={b.id} 
                        className="p-2.5 bg-white border border-gray-100 rounded-xl flex justify-between items-center text-[11px] shadow-xs"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{b.customerName}</p>
                          <div className="text-gray-500 flex flex-wrap gap-x-2 mt-0.5">
                            <span>📅 {b.date}</span>
                            <span>⏰ {b.time}</span>
                            <span>👥 {b.guests}p</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-green-50 text-green-700 border border-green-100">
                            pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 5. Premium "Reservation Confirmed!" Modal Backdrop */}
      <AnimatePresence>
        {successReservation && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100"
              id="success-modal"
            >
              {/* Banner / Success Icon Header */}
              <div className="bg-[#00C853]/5 px-6 py-8 text-center relative border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setSuccessReservation(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="mx-auto w-14 h-14 bg-[#00C853] rounded-full flex items-center justify-center shadow-lg shadow-[#00C853]/20 mb-3">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="font-sans text-2xl font-bold text-gray-900">
                  Reservation Confirmed!
                </h2>
                <p className="text-[#888] text-[10px] mt-1 uppercase tracking-wider font-bold">
                  Sustainably Sourced Dining Awaits
                </p>
              </div>

              {/* Booking Details Card */}
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Confirmation ID</span>
                    <span className="font-mono font-semibold text-gray-800">{successReservation.id}</span>
                  </div>
                  
                  <hr className="border-gray-100" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-medium">Guest Count</span>
                      <span className="font-sans font-bold text-gray-900 text-lg">
                        {successReservation.guests} {successReservation.guests === 1 ? "Person" : "People"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-medium">Dining Slot</span>
                      <span className="font-sans font-bold text-gray-900 text-lg">
                        {successReservation.time}
                      </span>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <div>
                    <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-medium">Selected Date</span>
                    <span className="font-sans font-semibold text-gray-800">
                      {successReservation.date}
                    </span>
                  </div>

                  <hr className="border-gray-100" />

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block">Reserved For</span>
                      <span className="font-semibold text-gray-800">{successReservation.customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Contact Mobile</span>
                      <span className="font-semibold text-gray-800">{successReservation.customerPhone}</span>
                    </div>
                  </div>

                  {successReservation.specialRequest && (
                    <>
                      <hr className="border-gray-100" />
                      <div>
                        <span className="text-[11px] text-gray-400 block">Your Special Request</span>
                        <p className="text-xs text-gray-600 italic bg-white p-2.5 rounded-lg border border-gray-100 mt-1">
                          "{successReservation.specialRequest}"
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Primary CTA button to dismiss */}
                <button
                  type="button"
                  onClick={() => setSuccessReservation(null)}
                  className="w-full bg-[#00C853] hover:bg-[#00b04a] text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition duration-150 flex items-center justify-center space-x-2 text-sm cursor-pointer"
                  id="btn-close-modal"
                >
                  <span>Excellent, thank you</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
