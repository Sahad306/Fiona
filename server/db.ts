import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UserProfile, Transaction, Budget, SavingsGoal, AppNotification, UserRole } from '../src/types';

export interface DBUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  currency: string;
  currencySymbol: string;
  monthlyIncomeTarget: number;
  monthlyExpenseBudget: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface DBSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserDataStore {
  profile: UserProfile;
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  notifications: AppNotification[];
  updatedAt: string;
}

export interface DatabaseSchema {
  version: number;
  users: DBUser[];
  sessions: DBSession[];
  userData: { [userId: string]: UserDataStore };
  lastBackup: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'finora_db.json');

// Helper to hash password with salt
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculatedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return calculatedHash === hash;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

class Database {
  private data: DatabaseSchema = {
    version: 1,
    users: [],
    sessions: [],
    userData: {},
    lastBackup: new Date().toISOString(),
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[Database] Loaded ${this.data.users.length} users and ${Object.keys(this.data.userData).length} user datasets.`);
      } else {
        console.log('[Database] Creating new empty database. Register an account to get started.');
        this.save();
      }
    } catch (error) {
      console.error('[Database] Initialization error:', error);
    }
  }

  public save() {
    try {
      this.data.lastBackup = new Date().toISOString();
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      try {
        fs.renameSync(tmpFile, DB_FILE);
      } catch {
        // Windows fallback: rename can fail under file locks/antivirus; copy then clean up.
        fs.copyFileSync(tmpFile, DB_FILE);
        try { fs.unlinkSync(tmpFile); } catch { /* temp cleanup is best-effort */ }
      }
    } catch (error) {
      console.error('[Database] Failed to write database to disk:', error);
    }
  }

  // User Operations
  public findUserByEmail(email: string): DBUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public findUserById(id: string): DBUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(params: {
    email: string;
    name: string;
    password: string;
    role: UserRole;
    currency?: string;
    currencySymbol?: string;
    monthlyIncomeTarget?: number;
    monthlyExpenseBudget?: number;
  }): { user: DBUser; userData: UserDataStore } {
    const existing = this.findUserByEmail(params.email);
    if (existing) {
      throw new Error('A user with this email address already exists.');
    }

    const { hash, salt } = hashPassword(params.password);
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();
    const currency = params.currency || 'USD';
    const currencySymbol =
      params.currencySymbol ||
      (currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$');

    const newUser: DBUser = {
      id: userId,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      passwordHash: hash,
      salt,
      role: params.role || 'Individual',
      currency,
      currencySymbol,
      monthlyIncomeTarget: params.monthlyIncomeTarget || 4000,
      monthlyExpenseBudget: params.monthlyExpenseBudget || 2500,
      createdAt: now,
      lastLoginAt: now,
    };

    const initialUserData: UserDataStore = {
      profile: {
        id: userId,
        name: params.name.trim(),
        email: params.email.trim().toLowerCase(),
        role: params.role,
        avatarUrl: '',
        currency,
        currencySymbol,
        monthlyIncomeTarget: params.monthlyIncomeTarget || 4000,
        monthlyExpenseBudget: params.monthlyExpenseBudget || 2500,
        joinedDate: now.split('T')[0],
      },
      transactions: [],
      budgets: [],
      savingsGoals: [],
      notifications: [
        {
          id: `notif_${Date.now()}`,
          type: 'system',
          title: 'Welcome to FINORA!',
          message: 'Your real account is ready. Start by adding your first income, expense, budget, or savings goal.',
          timestamp: now,
          read: false,
          severity: 'success',
        },
      ],
      updatedAt: now,
    };

    this.data.users.push(newUser);
    this.data.userData[userId] = initialUserData;
    this.save();

    return { user: newUser, userData: initialUserData };
  }

  // Session Operations
  public createSession(userId: string): DBSession {
    const token = generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session: DBSession = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Prune expired sessions only; keep valid ones so multi-device logins survive.
    this.data.sessions = this.data.sessions.filter(
      (s) => new Date(s.expiresAt) > new Date()
    );
    this.data.sessions.push(session);

    // Update user last login
    const user = this.findUserById(userId);
    if (user) {
      user.lastLoginAt = now.toISOString();
    }

    this.save();
    return session;
  }

  public getSession(token: string): DBSession | undefined {
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  public deleteSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  public deleteUser(userId: string): boolean {
    const index = this.data.users.findIndex((u) => u.id === userId);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    delete this.data.userData[userId];
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    this.save();
    return true;
  }

  // Data Store Operations
  public getUserData(userId: string): UserDataStore | undefined {
    return this.data.userData[userId];
  }

  public updateUserData(userId: string, data: Partial<UserDataStore>): UserDataStore {
    const existing = this.data.userData[userId] || {
      profile: {
        id: userId,
        name: 'User',
        email: '',
        role: 'Individual',
        avatarUrl: '',
        currency: 'USD',
        currencySymbol: '$',
        joinedDate: new Date().toISOString().split('T')[0],
      },
      transactions: [],
      budgets: [],
      savingsGoals: [],
      notifications: [],
      updatedAt: new Date().toISOString(),
    };

    const updated: UserDataStore = {
      profile: data.profile ? { ...existing.profile, ...data.profile } : existing.profile,
      transactions: data.transactions !== undefined ? data.transactions : existing.transactions,
      budgets: data.budgets !== undefined ? data.budgets : existing.budgets,
      savingsGoals: data.savingsGoals !== undefined ? data.savingsGoals : existing.savingsGoals,
      notifications: data.notifications !== undefined ? data.notifications : existing.notifications,
      updatedAt: new Date().toISOString(),
    };

    this.data.userData[userId] = updated;

    // Update DBUser record if profile fields changed
    const user = this.findUserById(userId);
    if (user && data.profile) {
      if (data.profile.name) user.name = data.profile.name;
      if (data.profile.role) user.role = data.profile.role;
      if (data.profile.currency) user.currency = data.profile.currency;
      if (data.profile.currencySymbol) user.currencySymbol = data.profile.currencySymbol;
      if (data.profile.monthlyIncomeTarget !== undefined) user.monthlyIncomeTarget = data.profile.monthlyIncomeTarget;
      if (data.profile.monthlyExpenseBudget !== undefined) user.monthlyExpenseBudget = data.profile.monthlyExpenseBudget;
    }

    this.save();
    return updated;
  }

  public getStats() {
    return {
      totalUsers: this.data.users.length,
      activeSessions: this.data.sessions.length,
      totalDatasets: Object.keys(this.data.userData).length,
      lastBackup: this.data.lastBackup,
    };
  }
}

export const db = new Database();
