import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { db, verifyPassword } from "./server/db";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "1mb" }));

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// CORS
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.header("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Security headers (helmet-equivalent)
app.use((_req, res, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
  res.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  };
}

// Rate limiting: generous limits to avoid blocking legitimate use
const authRateLimit = rateLimit(30, 60_000);   // 30 requests/min for auth endpoints
const apiRateLimit = rateLimit(60, 60_000);    // 60 requests/min for general API

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "ministral-14b-latest";
// Default Gemini model (alias — Google routes it to the latest Flash-Lite release)
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

function getMistralApiKey(): string | null {
  return process.env.MISTRAL_API_KEY || null;
}

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {}
  }
  return null;
}

function toStringArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function buildAdvisorReply(analysis: any): string {
  const recommendations = toStringArray(analysis?.actionableRecommendations);
  const cutbacks = toStringArray(analysis?.cutbackOpportunities);
  const lines: string[] = [];

  if (analysis?.executiveSummary) lines.push(analysis.executiveSummary);
  if (recommendations.length) {
    lines.push("\n**Key Action Items:**");
    recommendations.forEach((item) => lines.push(`- ${item}`));
  }
  if (cutbacks.length) {
    lines.push("\n**Cutback Opportunities:**");
    cutbacks.forEach((item) => lines.push(`- ${item}`));
  }
  if (analysis?.savingsOpportunity) lines.push(`\n**Savings Opportunity:** ${analysis.savingsOpportunity}`);
  if (analysis?.encouragement) lines.push(`\n${analysis.encouragement}`);

  return lines.join("\n").trim();
}

function normalizeAdvisorResult(raw: any): { analysis: any; reply: string } {
  // Conversational response (e.g. greeting) — pass the reply through, no fake analysis.
  const hasAnalysisShape =
    raw &&
    (typeof raw.analysis === "object" ||
      raw.executiveSummary ||
      raw.healthScore != null ||
      raw.recommendations ||
      raw.actionableRecommendations ||
      raw.savingsOpportunity);
  if (typeof raw?.reply === "string" && raw.reply.trim() && !hasAnalysisShape) {
    return { analysis: null, reply: raw.reply.trim() };
  }
  const source = raw && typeof raw.analysis === "object" && raw.analysis !== null ? raw.analysis : raw || {};
  const executiveSummary =
    source.executiveSummary ||
    (typeof raw?.analysis === "string" ? raw.analysis : "") ||
    source.analysis ||
    "Your financial data was analyzed, but no detailed summary was returned.";

  const analysis = {
    executiveSummary: String(executiveSummary),
    healthScore: Number(source.healthScore ?? raw?.healthScore ?? 70),
    actionableRecommendations: toStringArray(source.actionableRecommendations || raw?.recommendations),
    cutbackOpportunities: toStringArray(source.cutbackOpportunities),
    savingsOpportunity: String(source.savingsOpportunity || source.cutbackOpportunities?.[0] || raw?.savingsOpportunity || ""),
    encouragement: String(source.encouragement || raw?.encouragement || ""),
  };

  if (!analysis.cutbackOpportunities.length && analysis.savingsOpportunity) {
    analysis.cutbackOpportunities = [analysis.savingsOpportunity];
  }

  return {
    analysis,
    reply: typeof raw?.reply === "string" && raw.reply.trim() ? raw.reply : buildAdvisorReply(analysis),
  };
}

async function generateWithMistral(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = getMistralApiKey();
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured");

  const fetchFn: any = (globalThis as any).fetch;
  if (!fetchFn) throw new Error("fetch is not available in this Node runtime");

  const response = await fetchFn(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API ${response.status}: ${String(errorText).slice(0, 300)}`);
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = extractJson(content);
  if (parsed) return parsed;

  return {
    analysis: {
      executiveSummary: content,
      actionableRecommendations: [],
      cutbackOpportunities: [],
    },
  };
}

// Authentication Middleware Helper
function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const session = db.getSession(token);
  if (!session) return null;
  const user = db.findUserById(session.userId);
  if (!user) return null;
  return { user, session };
}

// Health & Database Status
app.get("/api/health", (_req, res) => {
  const stats = db.getStats();
  res.json({
    status: "ok",
    app: "FINORA - Personal Finance Management System",
    database: "active",
    databaseStats: stats,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/db/status", (_req, res) => {
  res.json({
    status: "healthy",
    storage: "Disk JSON Database with Atomic Writes",
    stats: db.getStats(),
  });
});

// ==========================================
// AUTHENTICATION & REGISTRATION ENDPOINTS
// ==========================================

// Register New User
app.post("/api/auth/register", authRateLimit, (req, res) => {
  try {
    const { email, password, name, role, currency, monthlyIncomeTarget, monthlyExpenseBudget, university, program, degree, year, semester, studentId, bio, location, financialGoal, phone, occupation, avatarUrl } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
    }

    const { user, userData } = db.createUser({
      email,
      name,
      password,
      role: role || "Salaried Employee",
      currency: currency || "USD",
      monthlyIncomeTarget: parseFloat(monthlyIncomeTarget) || 4000,
      monthlyExpenseBudget: parseFloat(monthlyExpenseBudget) || 2500,
      university,
      program,
      degree,
      year,
      semester,
      studentId,
      bio,
      location,
      financialGoal,
      phone,
      occupation,
      avatarUrl,
    });

    const session = db.createSession(user.id);

    // Strip sensitive fields
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      currency: user.currency,
      currencySymbol: user.currencySymbol,
      monthlyIncomeTarget: user.monthlyIncomeTarget,
      monthlyExpenseBudget: user.monthlyExpenseBudget,
      createdAt: user.createdAt,
    };

    return res.status(201).json({
      message: "Registration successful! Welcome to FINORA.",
      token: session.token,
      user: safeUser,
      userData,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: error.message || "Failed to create account" });
  }
});

// Login User
app.post("/api/auth/login", authRateLimit, (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password. Please verify your credentials." });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password. Please verify your credentials." });
    }

    const session = db.createSession(user.id);
    const userData = db.getUserData(user.id);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      currency: user.currency,
      currencySymbol: user.currencySymbol,
      monthlyIncomeTarget: user.monthlyIncomeTarget,
      monthlyExpenseBudget: user.monthlyExpenseBudget,
      createdAt: user.createdAt,
    };

    return res.json({
      message: `Welcome back, ${user.name}!`,
      token: session.token,
      user: safeUser,
      userData,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: error.message || "Failed to authenticate" });
  }
});

// Get Current Authenticated User & Database Data
app.get("/api/auth/me", (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized or session expired" });
  }

  const { user } = auth;
  const userData = db.getUserData(user.id);

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    currency: user.currency,
    currencySymbol: user.currencySymbol,
    monthlyIncomeTarget: user.monthlyIncomeTarget,
    monthlyExpenseBudget: user.monthlyExpenseBudget,
    createdAt: user.createdAt,
  };

  return res.json({
    user: safeUser,
    userData,
  });
});

// Verify current password (gate for profile editing)
app.post("/api/auth/verify-password", (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized or session expired" });
  }
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }
  const valid = verifyPassword(password, auth.user.passwordHash, auth.user.salt);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect password. Profile editing remains locked." });
  }
  return res.json({ valid: true });
});

// Update profile fields (session required; password gate enforced via verify-password)
app.put("/api/auth/profile", (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized or session expired" });
  }
  const {
    name, role, currency, currencySymbol, monthlyIncomeTarget, monthlyExpenseBudget,
    phone, location, occupation, bio, financialGoal, riskTolerance, avatarUrl,
    university, program, degree, year, semester, studentId,
  } = req.body;

  const profilePatch: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) profilePatch.name = name.trim();
  if (role) profilePatch.role = role;
  if (currency) profilePatch.currency = currency;
  if (currencySymbol) profilePatch.currencySymbol = currencySymbol;
  if (typeof monthlyIncomeTarget === "number") profilePatch.monthlyIncomeTarget = monthlyIncomeTarget;
  if (typeof monthlyExpenseBudget === "number") profilePatch.monthlyExpenseBudget = monthlyExpenseBudget;
  if (typeof phone === "string") profilePatch.phone = phone;
  if (typeof location === "string") profilePatch.location = location;
  if (typeof occupation === "string") profilePatch.occupation = occupation;
  if (typeof bio === "string") profilePatch.bio = bio;
  if (typeof financialGoal === "string") profilePatch.financialGoal = financialGoal;
  if (riskTolerance) profilePatch.riskTolerance = riskTolerance;
  if (typeof avatarUrl === "string" && avatarUrl.length < 700_000) profilePatch.avatarUrl = avatarUrl;
  if (typeof university === "string") profilePatch.university = university;
  if (typeof program === "string") profilePatch.program = program;
  if (typeof degree === "string") profilePatch.degree = degree;
  if (typeof year === "string") profilePatch.year = year;
  if (typeof semester === "string") profilePatch.semester = semester;
  if (typeof studentId === "string") profilePatch.studentId = studentId;

  if (Object.keys(profilePatch).length === 0) {
    return res.status(400).json({ error: "No valid profile fields provided." });
  }

  const userData = db.updateUserData(auth.user.id, { profile: profilePatch as any });
  const user = db.findUserById(auth.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    currency: user.currency,
    currencySymbol: user.currencySymbol,
    monthlyIncomeTarget: user.monthlyIncomeTarget,
    monthlyExpenseBudget: user.monthlyExpenseBudget,
    createdAt: user.createdAt,
  };

  return res.json({ user: safeUser, userData });
});

// Forgot password: generate a 6-digit reset code (valid 15 minutes).
// ponytail: no SMTP creds configured yet, so the code is returned to the client (dev mode).
// Upgrade path: swap sendResetCode() for a nodemailer call once SMTP_* env vars exist.
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Please enter your email address." });
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    // Don't leak whether the email exists; still report success.
    return res.json({ ok: true, message: "If that email is registered, a reset code has been sent." });
  }
  const code = db.createResetCode(user.email);
  console.log(`[Auth] Password reset code generated for ${user.email}`);
  // Development mode: return the code in the response. With SMTP configured this would be emailed instead.
  return res.json({
    ok: true,
    message: "If that email is registered, a reset code has been sent.",
    devMode: true,
    devCode: code,
  });
});

// Reset password using the emailed code
app.post("/api/auth/reset-password", (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) {
    return res.status(400).json({ error: "Email, reset code and new password are required." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }
  if (!db.consumeResetCode(user.email, String(code))) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }
  db.updateUserPassword(user.id, String(password));
  return res.json({ ok: true, message: "Password updated. Please sign in with your new password." });
});

// Change password (authenticated, from profile)
app.put("/api/auth/change-password", (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized or session expired" });
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required." });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  if (!verifyPassword(String(currentPassword), auth.user.passwordHash, auth.user.salt)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  // Preserve this session so the user stays signed in; all other sessions are invalidated.
  db.updateUserPassword(auth.user.id, String(newPassword), auth.session.token);
  return res.json({ ok: true, message: "Password changed successfully." });
});

// Change email (authenticated, password-gated, from profile)
app.put("/api/auth/change-email", (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized or session expired" });
  }
  const { password, newEmail } = req.body;
  if (!password || !newEmail) {
    return res.status(400).json({ error: "Password and new email are required." });
  }
  if (!verifyPassword(String(password), auth.user.passwordHash, auth.user.salt)) {
    return res.status(401).json({ error: "Password is incorrect." });
  }
  const result = db.updateUserEmail(auth.user.id, String(newEmail));
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  const updated = db.findUserById(auth.user.id)!;
  const userData = db.getUserData(auth.user.id);
  return res.json({
    ok: true,
    message: "Email updated successfully.",
    user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, createdAt: updated.createdAt },
    userData,
  });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    db.deleteSession(token);
  }
  return res.json({ success: true, message: "Logged out successfully" });
});

// Delete Account
app.delete("/api/auth/delete-account", (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized or session expired" });
    }

    db.deleteUser(auth.user.id);
    // Also invalidate the current session
    const token = req.headers.authorization?.substring(7).trim();
    if (token) db.deleteSession(token);

    return res.json({ success: true, message: "Account and all associated data have been permanently deleted." });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete account" });
  }
});

// Sync User Financial Data to Database
app.post("/api/db/sync", (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized. Please log in to sync database." });
    }

    const { profile, transactions, budgets, savingsGoals, notifications } = req.body;
    const updated = db.updateUserData(auth.user.id, {
      profile,
      transactions,
      budgets,
      savingsGoals,
      notifications,
    });

    return res.json({
      success: true,
      message: "Financial records successfully synchronized to database.",
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return res.status(500).json({ error: "Failed to sync data to database" });
  }
});

// Reset User Data to default archetype
app.post("/api/db/reset", (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = auth.user;
    const { profile, transactions, budgets, savingsGoals } = req.body;

    const resetData = db.updateUserData(user.id, {
      profile,
      transactions,
      budgets,
      savingsGoals,
      notifications: [
        {
          id: `notif_${Date.now()}`,
          type: 'system',
          title: 'Database Reset Completed',
          message: 'Your financial ledger was reset to clean archetype baseline.',
          timestamp: new Date().toISOString(),
          read: false,
          severity: 'info',
        }
      ]
    });

    return res.json({
      success: true,
      userData: resetData,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to reset data" });
  }
});

// AI Financial Advisor Endpoint
app.post("/api/ai/advisor", async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized. Please log in to use the AI advisor." });
    }

    const {
      financialSummary,
      summary,
      userQuery,
      query,
      targetProfile,
      profile,
      transactions,
      budgets,
      savingsGoals,
      aiProvider,
      month,
      conversationHistory,
    } = req.body;

    const finance = financialSummary || summary || {};
    const question =
      userQuery ||
      query ||
      "Provide an overall financial health checkup and 3 actionable tips to improve savings.";
    const requestedProvider = typeof aiProvider === "string" ? aiProvider.toLowerCase() : "mistral";
    const mistralKey = getMistralApiKey();
    const ai = getGeminiClient();

    if (!mistralKey && !ai) {
      // Return high-quality rule-based financial advice when key is unavailable
      const fallbackTips = [
        "Based on your 50/30/20 budget framework, prioritize setting aside 20% into your savings goal first.",
        "Your top spending category is taking the largest share of your budget; consider setting a category alert at 80% threshold.",
        "Track weekly variable expenses like Dining and Entertainment to avoid month-end budget surprises.",
      ];
      return res.json({
        analysis: "Your finances look healthy. Keep an eye on recurring subscriptions and maintain your positive cash flow buffer.",
        healthScore: 75,
        recommendations: fallbackTips,
        savingsOpportunity: "Allocating an extra 5% of monthly income can accelerate your primary savings goal by 2 months.",
        encouragement: "You're already tracking — that alone puts you ahead of most people. Keep it up!",
        isFallback: true,
      });
    }

    const allTransactions = Array.isArray(transactions)
      ? transactions.map((tx: any) => ({
          date: tx.date,
          type: tx.type,
          category: tx.category,
          description: tx.description || tx.merchant || tx.note,
          amount: tx.amount,
          paymentMethod: tx.paymentMethod,
          savingsTransfer: tx.savingsTransfer,
        }))
      : [];

    const recentTransactions = allTransactions.slice(0, 25);

    // ── Spending Trend Analysis (MoM comparison) ──
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const [curY, curM] = currentMonth.split("-").map(Number);
    const prevMonthDate = new Date(curY, curM - 2, 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const monthlyAgg: Record<string, { income: number; expenses: number; byCategory: Record<string, number> }> = {};
    for (const tx of allTransactions) {
      if (!tx.date || tx.savingsTransfer) continue;
      const m = tx.date.slice(0, 7);
      if (!monthlyAgg[m]) monthlyAgg[m] = { income: 0, expenses: 0, byCategory: {} };
      if (tx.type === "income") monthlyAgg[m].income += tx.amount;
      else {
        monthlyAgg[m].expenses += tx.amount;
        monthlyAgg[m].byCategory[tx.category] = (monthlyAgg[m].byCategory[tx.category] || 0) + tx.amount;
      }
    }

    const curData = monthlyAgg[currentMonth] || { income: 0, expenses: 0, byCategory: {} };
    const prevData = monthlyAgg[prevMonth] || { income: 0, expenses: 0, byCategory: {} };

    const spendingTrends = {
      currentMonth,
      previousMonth: prevMonth,
      expenseChangePercent: prevData.expenses > 0 ? Math.round(((curData.expenses - prevData.expenses) / prevData.expenses) * 100) : null,
      incomeChangePercent: prevData.income > 0 ? Math.round(((curData.income - prevData.income) / prevData.income) * 100) : null,
      categoryChanges: Object.entries(curData.byCategory)
        .map(([cat, amount]) => {
          const prevAmount = prevData.byCategory[cat] || 0;
          const changePct = prevAmount > 0 ? Math.round(((amount - prevAmount) / prevAmount) * 100) : null;
          return { category: cat, current: amount, previous: prevAmount, changePercent: changePct };
        })
        .filter((c) => c.changePercent !== null && Math.abs(c.changePercent) >= 15)
        .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!))
        .slice(0, 5),
      weekendVsWeekday: (() => {
        let weekendSpend = 0, weekdaySpend = 0, weekendCount = 0, weekdayCount = 0;
        for (const tx of allTransactions) {
          if (!tx.date.startsWith(currentMonth) || tx.type !== "expense" || tx.savingsTransfer) continue;
          const day = new Date(tx.date).getDay();
          if (day === 0 || day === 6) { weekendSpend += tx.amount; weekendCount++; }
          else { weekdaySpend += tx.amount; weekdayCount++; }
        }
        const weekendAvg = weekendCount > 0 ? Math.round(weekendSpend / weekendCount) : 0;
        const weekdayAvg = weekdayCount > 0 ? Math.round(weekdaySpend / weekdayCount) : 0;
        return { weekendAvg, weekdayAvg, differencePercent: weekdayAvg > 0 ? Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100) : null };
      })(),
    };

    // ── Goal Projections ──
    const goalProjections = Array.isArray(savingsGoals)
      ? savingsGoals.map((goal: any) => {
          const target = goal.targetAmount ?? goal.target ?? 0;
          const saved = goal.savedAmount ?? goal.saved ?? goal.current ?? 0;
          const remaining = Math.max(0, target - saved);
          const monthlyContrib = curData.income > 0 ? (finance.monthlySavings ?? 0) / (savingsGoals.length || 1) : 0;
          const monthsToGoal = monthlyContrib > 0 ? +(remaining / monthlyContrib).toFixed(1) : null;
          return {
            name: goal.name,
            target,
            saved,
            remaining,
            percentComplete: target > 0 ? Math.round((saved / target) * 100) : 0,
            estimatedMonthsLeft: monthsToGoal,
            onTrack: goal.deadline ? monthsToGoal !== null && monthsToGoal <= 6 : null,
          };
        })
      : [];

    const budgetContext = Array.isArray(budgets)
      ? budgets.map((budget: any) => ({
          category: budget.category,
          limit: budget.amount ?? budget.limit ?? budget.budget,
          spent: budget.spent ?? budget.current ?? 0,
        }))
      : [];

    const financialContext = {
      month: currentMonth,
      userProfile: profile || targetProfile || "Standard User",
      financialSummary: {
        totalIncome: finance.totalIncome ?? finance.monthlyIncome ?? 0,
        totalExpenses: finance.totalExpenses ?? finance.monthlyExpenses ?? 0,
        remainingBalance: finance.remainingBalance ?? finance.currentBalance ?? 0,
        savingsRate: finance.savingsRate ?? 0,
        financialHealthScore: finance.financialHealthScore ?? null,
        topExpenseCategories: finance.topExpenseCategories || [],
        incomeSourcesBreakdown: finance.incomeSourcesBreakdown || [],
        budgetUtilization: finance.budgetUtilization || {},
      },
      spendingTrends,
      goalProjections,
      recentTransactions,
      budgets: budgetContext,
      savingsGoals: goalProjections,
    };

    const systemPrompt = [
      'You are FINORA\'s intelligent personal finance assistant with advanced analytical capabilities.',
      'You have access to the user\'s financial data including SPENDING TRENDS (month-over-month comparisons,',
      'weekend vs weekday patterns, category-level changes) and GOAL PROJECTIONS (estimated completion',
      'timelines, on-track status). This data is PRIVATE REFERENCE MATERIAL \u2014 not content to display.',
      '',
      'STRICT RULES:',
      '1. FIRST classify the user\'s request:',
      '   - CONVERSATIONAL: greetings, small talk, questions about you/capabilities. Reply briefly (1-3 sentences).',
      '     NEVER dump financial data, scores, or recommendations.',
      '   - FINANCIAL ANALYSIS: advice, audit, health check, savings tips, budget review, spending analysis.',
      '     Only then produce the structured analysis.',
      '2. ALWAYS use spendingTrends data when giving financial advice \u2014 compare current vs previous month,',
      '   highlight significant category changes (>15%), reference weekend vs weekday patterns when relevant.',
      '3. ALWAYS use goalProjections data when discussing savings \u2014 cite estimated months to completion,',
      '   whether goals are on track, suggest specific monthly contribution adjustments.',
      '4. Never echo or restate raw financial context unless the user specifically asks.',
      '5. Reference data only to ground your answer \u2014 cite specific numbers, never entire tables.',
      '6. Be SPECIFIC and ACTIONABLE: instead of "reduce dining", say "Food spending increased 32% MoM',
      '   (Tk X \u2192 Tk Y). A weekly limit of Tk Z would bring it back in line."',
      '7. Return ONLY valid JSON. No markdown, no comments, no text outside the JSON object.',
      '',
      'Response format \u2014 exactly ONE of these two shapes:',
      '- CONVERSATIONAL: { "reply": "your short chat response" }',
      '- FINANCIAL ANALYSIS: { "analysis": { "executiveSummary": "2-4 sentence overview with trends",',
      '  "healthScore": 85, "trendInsights": ["MoM insight", "category spike", "weekend pattern"],',
      '  "actionableRecommendations": ["specific tip with numbers"], "goalProjections": ["Goal X: Y months left"],',
      '  "cutbackOpportunities": ["adjustment with amount"], "savingsOpportunity": "adjustment with impact",',
      '  "encouragement": "brief uplifting close" } }',
    ].join('\n');

    const historyBlock = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? `\nConversation History (last ${conversationHistory.length} messages for context):\n${conversationHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n')}\n`
      : '';

    const userPrompt = `Financial Context (private reference data — do not dump):
${JSON.stringify(financialContext, null, 2)}
${historyBlock}
User Request:
${question}

Classify the request first (CONVERSATIONAL vs FINANCIAL ANALYSIS), then respond with the matching JSON shape only.`;

    let rawResult: any = null;
    let modelUsed = "";

    if ((requestedProvider === "gemini" || requestedProvider === "gemini-flash-lite-latest") && ai) {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: {
          responseMimeType: "application/json",
        },
      });
      rawResult = extractJson(response.text || "{}") || {};
      modelUsed = GEMINI_MODEL;
    } else if (mistralKey) {
      rawResult = await generateWithMistral(systemPrompt, userPrompt);
      modelUsed = MISTRAL_MODEL;
    } else if (ai) {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: {
          responseMimeType: "application/json",
        },
      });
      rawResult = extractJson(response.text || "{}") || {};
      modelUsed = GEMINI_MODEL;
    } else {
      return res.status(503).json({ error: "No AI provider is configured." });
    }

    const normalized = normalizeAdvisorResult(rawResult);
    return res.json({ ...normalized, modelUsed });
  } catch (error) {
    console.error("AI Advisor error:", error);
    return res.status(500).json({
      error: "Failed to generate AI insights",
      analysis: "Keep tracking your daily transactions regularly to maintain steady financial progress.",
      healthScore: 60,
      recommendations: [
        "Review your recurring subscriptions monthly.",
        "Set strict category budgets for non-essential spending.",
        "Maintain an emergency fund covering 3-6 months of essential expenses."
      ],
      savingsOpportunity: "Consolidate dining out into meal prep to save significantly each week.",
      encouragement: "Every step you take toward financial awareness is a step toward freedom.",
    });
  }
});

// Automated Expense Categorizer API
app.post("/api/ai/categorize", async (req, res) => {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized. Please log in to use auto-categorization." });
    }

    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const ai = getGeminiClient();
    const categories = [
      "Food & Dining",
      "Transportation",
      "Housing & Rent",
      "Utilities & Bills",
      "Shopping",
      "Education",
      "Entertainment",
      "Healthcare & Medical",
      "Personal Care",
      "Travel",
      "Other"
    ];

    if (!ai) {
      // Local heuristic matcher
      const descLower = description.toLowerCase();
      let category = "Other";
      if (descLower.includes("grocery") || descLower.includes("restaurant") || descLower.includes("coffee") || descLower.includes("starbucks") || descLower.includes("pizza") || descLower.includes("food") || descLower.includes("burger") || descLower.includes("cafe")) category = "Food & Dining";
      else if (descLower.includes("uber") || descLower.includes("gas") || descLower.includes("fuel") || descLower.includes("subway") || descLower.includes("metro") || descLower.includes("bus") || descLower.includes("parking") || descLower.includes("flight")) category = "Transportation";
      else if (descLower.includes("rent") || descLower.includes("mortgage") || descLower.includes("apartment")) category = "Housing & Rent";
      else if (descLower.includes("wifi") || descLower.includes("internet") || descLower.includes("electric") || descLower.includes("water") || descLower.includes("phone") || descLower.includes("bill")) category = "Utilities & Bills";
      else if (descLower.includes("amazon") || descLower.includes("clothes") || descLower.includes("shoes") || descLower.includes("walmart") || descLower.includes("target") || descLower.includes("shop")) category = "Shopping";
      else if (descLower.includes("book") || descLower.includes("tuition") || descLower.includes("course") || descLower.includes("udemy") || descLower.includes("school") || descLower.includes("college")) category = "Education";
      else if (descLower.includes("netflix") || descLower.includes("spotify") || descLower.includes("cinema") || descLower.includes("movie") || descLower.includes("game") || descLower.includes("concert")) category = "Entertainment";
      else if (descLower.includes("doctor") || descLower.includes("pharmacy") || descLower.includes("medicine") || descLower.includes("dental") || descLower.includes("hospital")) category = "Healthcare & Medical";

      return res.json({ category, confidence: 0.85 });
    }

    const prompt = `Given the transaction merchant/description "${description}", classify it into one of these exact categories:
${categories.join(", ")}.
Respond in JSON format: {"category": "Exact Category Name", "suggestedType": "expense"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Categorize error:", error);
    return res.json({ category: "Other", confidence: 0.5 });
  }
});

// Vite dev middleware or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FINORA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
