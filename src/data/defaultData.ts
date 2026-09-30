import { UserProfile, Transaction, Budget, SavingsGoal, AppNotification, PaymentMethod } from '../types';

export interface ProfileData {
  profile: UserProfile;
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  notifications: AppNotification[];
}

export const PRESET_PROFILES: Record<string, ProfileData> = {};

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Housing & Rent',
  'Household & Living',
  'Utilities & Bills',
  'Transportation',
  'Education',
  'Shopping',
  'Entertainment',
  'Healthcare & Medical',
  'Personal Care',
  'Travel',
  'Other',
];

export const DEFAULT_INCOME_SOURCES = [
  'Salary',
  'Freelancing',
  'Business',
  'Allowances',
  'Investments',
  'Rental Income',
  'Gifts',
  'Side Hustle',
  'Other',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'bKash',
  'Nagad',
  'Rocket',
  'Bank Transfer',
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI / Online',
  'Other',
];

// Pre-configured Monthly Expense Sectors for fast 1-click batch entry (Taka values)
export const MONTHLY_SECTOR_CONFIGS = [
  {
    key: 'house_rent',
    category: 'Housing & Rent',
    label: 'House Rent / Apartment Lease',
    defaultAmount: 18000,
    defaultMethod: 'Bank Transfer' as PaymentMethod,
    icon: 'Home',
    desc: 'Apartment lease, flat rent, or shared hostel mess seat',
  },
  {
    key: 'household_grocery',
    category: 'Household & Living',
    label: 'Monthly Grocery & Bazaar',
    defaultAmount: 12000,
    defaultMethod: 'bKash' as PaymentMethod,
    icon: 'Layers',
    desc: 'Rice, oil, fish, meat, vegetables, eggs & essentials',
  },
  {
    key: 'electricity_bill',
    category: 'Utilities & Bills',
    label: 'Electricity, Gas & Water',
    defaultAmount: 3200,
    defaultMethod: 'bKash' as PaymentMethod,
    icon: 'Zap',
    desc: 'Prepaid electricity meter token, gas bill & WASA water bill',
  },
  {
    key: 'wifi_internet',
    category: 'Utilities & Bills',
    label: 'High-Speed Broadband WiFi',
    defaultAmount: 1000,
    defaultMethod: 'bKash' as PaymentMethod,
    icon: 'Zap',
    desc: 'Monthly optical fiber WiFi broadband line recharge',
  },
  {
    key: 'maid_cook',
    category: 'Household & Living',
    label: 'Home Maid / Cook Salary',
    defaultAmount: 3500,
    defaultMethod: 'Cash' as PaymentMethod,
    icon: 'Layers',
    desc: 'House cleaning, cooking, and helper monthly salary',
  },
  {
    key: 'mobile_recharge',
    category: 'Utilities & Bills',
    label: 'Mobile Phone & 4G/5G Pack',
    defaultAmount: 600,
    defaultMethod: 'bKash' as PaymentMethod,
    icon: 'Zap',
    desc: 'GP, Robi, Banglalink or Teletalk monthly voice & internet minutes',
  },
  {
    key: 'tuition_study',
    category: 'Education',
    label: 'Tuition, Courses & Study Materials',
    defaultAmount: 3000,
    defaultMethod: 'bKash' as PaymentMethod,
    icon: 'GraduationCap',
    desc: 'Semester fees, coaching, books, exam forms & coursework',
  },
  {
    key: 'monthly_transport',
    category: 'Transportation',
    label: 'Monthly Commute & Metro Pass',
    defaultAmount: 2500,
    defaultMethod: 'Nagad' as PaymentMethod,
    icon: 'TrendingDown',
    desc: 'MRT Rapid Pass, daily rickshaw, CNG auto & bus commute',
  },
  {
    key: 'health_medicine',
    category: 'Healthcare & Medical',
    label: 'Pharmacy & Regular Medicine',
    defaultAmount: 1800,
    defaultMethod: 'Cash' as PaymentMethod,
    icon: 'HeartPulse',
    desc: 'Prescription medicines, vitamins, first aid & doctor consultations',
  },
  {
    key: 'subscriptions_fun',
    category: 'Entertainment',
    label: 'Streaming & Digital Tools',
    defaultAmount: 1200,
    defaultMethod: 'Credit Card' as PaymentMethod,
    icon: 'Film',
    desc: 'Chorki, Hoichoi, Netflix, Spotify & online services',
  },
];

// Quick Daily Expense Presets in Bangladeshi Taka (Tk BDT)
export const BANGLADESH_DAILY_PRESETS = [
  { label: ' Tea & Biscuit', amount: 40, category: 'Food & Dining', desc: 'Street Tea Stall & Biscuit' },
  { label: ' Daily Lunch', amount: 150, category: 'Food & Dining', desc: 'Mess / Office / Cafeteria Meal' },
  { label: ' Commute', amount: 50, category: 'Transportation', desc: 'Rickshaw, Metro MRT & Bus' },
  { label: ' Bazaar', amount: 350, category: 'Household & Living', desc: 'Vegetables, Milk & Eggs' },
  { label: ' Snack', amount: 60, category: 'Food & Dining', desc: 'Singara, Samucha & Snack' },
  { label: ' Water', amount: 30, category: 'Utilities & Bills', desc: 'Mineral Water & Refreshment' },
];
