# Priority 1 Action Plan - Production Readiness

**Target Timeline:** 3-5 days  
**Current Blockers:** Email OTP limits, Missing database, No API routes  
**Launch Readiness:** 50% → 90%

---

## 🎯 Priority 1 Tasks (Critical Path)

### Task 1: Database Deployment (2 hours)

**Status:** ⚠️ BLOCKED - Supabase not configured  
**Dependency:** None (can do first)  
**Impact:** CRITICAL

#### Steps:

1. **Go to Supabase Dashboard**
   - Open: https://app.supabase.com
   - Select "blackhand" project
   - Click "SQL Editor"

2. **Deploy Schema**
   - Copy content from: `docs/DATABASE_SCHEMA.sql`
   - Paste in SQL Editor
   - Click "Run"
   - Verify all 5 tables created:
     - ✅ users
     - ✅ profiles
     - ✅ sessions
     - ✅ activity_log
     - ✅ devices

3. **Verify RLS Policies**
   - Go to "Authentication" → "Policies"
   - Verify policies are enabled (not custom)
   - Test query one table to confirm access

4. **Create Indexes**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_profiles_user_id ON profiles(user_id);
   CREATE INDEX idx_sessions_user_id ON sessions(user_id);
   CREATE INDEX idx_activity_user_id ON activity_log(user_id);
   ```

**Expected Outcome:**

```
✅ All tables created
✅ RLS policies active
✅ Indexes optimized
✅ Schema ready for data
```

---

### Task 2: Email OTP System Fix (4 hours)

**Status:** 🔴 BROKEN - Supabase email rate limited  
**Dependency:** Task 1 (not really, but good to do after)  
**Impact:** CRITICAL (blocks all email signups)

#### Option A: Upgrade Supabase Plan (Quick)

1. **Go to Supabase Dashboard**
   - Settings → Billing
   - Upgrade to Pro ($25/month)
   - Email rate limit increases: 3/hour → 100/hour

2. **Test Email Flow**
   ```
   App → Enter email → Check inbox → Code should arrive
   ```

#### Option B: Use Resend (Recommended)

1. **Install Resend**

   ```bash
   npm install resend
   ```

2. **Get API Key**
   - Sign up: https://resend.com
   - Copy API key
   - Add to `.env.local`:

   ```
   NEXT_PUBLIC_RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

3. **Create API Route**

   ```typescript
   // app/api/auth/send-otp/route.ts
   import { NextRequest, NextResponse } from "next/server";
   import { Resend } from "resend";

   const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);

   export async function POST(request: NextRequest) {
     const { email, otp } = await request.json();

     try {
       const data = await resend.emails.send({
         from: "Blackhand <onboarding@resend.dev>",
         to: email,
         subject: "Your Blackhand OTP Code",
         html: `
           <h1>Verify Your Email</h1>
           <p>Your OTP code is: <strong>${otp}</strong></p>
           <p>Code expires in 10 minutes</p>
         `,
       });

       return NextResponse.json(data);
     } catch (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
     }
   }
   ```

4. **Update AuthModal**
   ```typescript
   // In handleSendOTP
   const response = await fetch("/api/auth/send-otp", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ email, otp: generateOTP() }),
   });
   ```

**Expected Outcome:**

```
✅ Email sending from custom domain
✅ No rate limits (100+ emails/hour)
✅ Professional email template
✅ Better delivery rate
```

---

### Task 3: Input Validation Layer (4 hours)

**Status:** ❌ MISSING - No validation on inputs  
**Dependency:** None  
**Impact:** HIGH (security vulnerability)

#### Steps:

1. **Install Zod**

   ```bash
   npm install zod
   ```

2. **Create Validators**

   ```typescript
   // lib/validators.ts
   import { z } from "zod";

   export const emailValidator = z
     .string()
     .email("Invalid email format")
     .min(3, "Email too short")
     .max(255, "Email too long");

   export const otpValidator = z
     .string()
     .regex(/^\d{6}$/, "OTP must be exactly 6 digits");

   export const fullNameValidator = z
     .string()
     .min(2, "Name too short")
     .max(100, "Name too long")
     .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters");
   ```

3. **Update Components**

   ```typescript
   // In AuthModal.tsx - handleSendOTP
   const handleSendOTP = async (e: React.FormEvent) => {
     e.preventDefault();

     try {
       const validatedEmail = emailValidator.parse(email);
       // Proceed with validated email
       setStep("otp");
     } catch (error) {
       if (error instanceof z.ZodError) {
         alert(error.errors[0].message);
       }
     }
   };
   ```

4. **Add to API Routes** (when created)
   ```typescript
   // Validate all requests before processing
   export async function POST(request: NextRequest) {
     const body = await request.json();
     const validated = emailValidator.parse(body.email);
     // Continue with validated data
   }
   ```

**Expected Outcome:**

```
✅ No invalid emails accepted
✅ No malformed OTP codes accepted
✅ Client + server validation
✅ Better error messages
```

---

### Task 4: API Routes & Authentication (8 hours)

**Status:** ❌ MISSING - No protected API routes  
**Dependency:** Task 1 (database) + Task 3 (validation)  
**Impact:** CRITICAL (needed for scalability)

#### Routes to Create:

1. **`app/api/auth/verify-otp/route.ts`**

   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { supabase } from "@/app/lib/supabaseClient";
   import { otpValidator, emailValidator } from "@/app/lib/validators";

   export async function POST(request: NextRequest) {
     try {
       const { email, otp } = await request.json();

       // Validate inputs
       const validatedEmail = emailValidator.parse(email);
       const validatedOtp = otpValidator.parse(otp);

       // Verify with Supabase
       const { data, error } = await supabase.auth.verifyOtp({
         email: validatedEmail,
         token: validatedOtp,
         type: "email",
       });

       if (error) {
         return NextResponse.json({ error: error.message }, { status: 401 });
       }

       // Log activity
       if (data.user) {
         await supabase.from("activity_log").insert({
           user_id: data.user.id,
           action: "email_verified",
           timestamp: new Date().toISOString(),
         });
       }

       return NextResponse.json(data);
     } catch (error: any) {
       return NextResponse.json({ error: error.message }, { status: 400 });
     }
   }
   ```

2. **`app/api/auth/logout/route.ts`**

   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { supabase } from "@/app/lib/supabaseClient";

   export async function POST(request: NextRequest) {
     try {
       const { error } = await supabase.auth.signOut();

       if (error) {
         return NextResponse.json({ error: error.message }, { status: 400 });
       }

       return NextResponse.json({ success: true });
     } catch (error: any) {
       return NextResponse.json({ error: error.message }, { status: 500 });
     }
   }
   ```

3. **`app/api/user/profile/route.ts`** (Protected)

   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { supabase } from "@/app/lib/supabaseClient";

   // Middleware to check auth
   async function getAuthUser(request: NextRequest) {
     const token = request.headers.get("authorization")?.split(" ")[1];

     if (!token) {
       return null;
     }

     const { data, error } = await supabase.auth.getUser(token);
     return data?.user || null;
   }

   export async function GET(request: NextRequest) {
     const user = await getAuthUser(request);

     if (!user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }

     const { data, error } = await supabase
       .from("profiles")
       .select("*")
       .eq("user_id", user.id)
       .single();

     if (error) {
       return NextResponse.json({ error: error.message }, { status: 400 });
     }

     return NextResponse.json(data);
   }

   export async function PUT(request: NextRequest) {
     const user = await getAuthUser(request);

     if (!user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }

     const body = await request.json();

     const { data, error } = await supabase
       .from("profiles")
       .update(body)
       .eq("user_id", user.id)
       .select()
       .single();

     if (error) {
       return NextResponse.json({ error: error.message }, { status: 400 });
     }

     return NextResponse.json(data);
   }
   ```

**Expected Outcome:**

```
✅ Secure API endpoints
✅ Input validation on server
✅ Rate limiting ready
✅ Activity logging
✅ Protected routes
```

---

### Task 5: Security Headers & Middleware (2 hours)

**Status:** ❌ MISSING - No security headers  
**Dependency:** None (can do in parallel)  
**Impact:** HIGH (prevents common attacks)

#### Step 1: Update `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/http/:path*",
        destination: "/https/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

#### Step 2: Create Middleware

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Protect dashboard & settings routes
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/settings")) {
    const session = request.cookies.get("sb-session-token");

    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

**Expected Outcome:**

```
✅ XSS protection enabled
✅ Clickjacking prevention
✅ MIME type sniffing blocked
✅ Protected routes enforced
```

---

## 📊 Implementation Checklist

### Phase 1A: Foundation (Day 1)

- [ ] Deploy database schema
- [ ] Fix email OTP (choose Option A or B)
- [ ] Create validators with Zod
- [ ] Document setup steps

### Phase 1B: APIs (Day 2)

- [ ] Create auth API routes
- [ ] Create user API routes
- [ ] Add rate limiting stubs
- [ ] Test endpoints manually

### Phase 1C: Security (Day 2-3)

- [ ] Add security headers
- [ ] Create middleware
- [ ] Update next.config.ts
- [ ] Test in production mode

### Phase 1D: Testing & QA (Day 3)

- [ ] Run all 34 existing tests
- [ ] Test email flow end-to-end
- [ ] Test protected routes
- [ ] Test error cases
- [ ] Manual browser testing

### Phase 1E: Documentation (Day 4)

- [ ] Update README with setup
- [ ] Document API endpoints
- [ ] Create environment variables guide
- [ ] Create deployment checklist

---

## 🚀 Deployment Prep

### Before Going Live:

```bash
# 1. Build production bundle
npm run build

# 2. Run tests
npm test

# 3. Check for type errors
npx tsc --noEmit

# 4. Lint code
npx eslint .

# 5. Check bundle size
npm run build
# Review .next/static folder

# 6. Security audit
npm audit

# 7. Environment variables
# Verify .env.production has all required vars
```

### Staging Environment Checklist:

```
[ ] Deploy to staging URL
[ ] Test all auth flows
[ ] Test email sending (resend or supabase)
[ ] Test protected routes
[ ] Test error handling
[ ] Test mobile responsiveness
[ ] Test with real email address
[ ] Load testing (simulated 100 concurrent users)
[ ] Security scan (OWASP ZAP or Burp)
[ ] Lighthouse audit
```

---

## 📈 Success Criteria

### After Priority 1 Completion:

| Metric            | Target        | Status |
| ----------------- | ------------- | ------ |
| Tests Passing     | 34/34         | ✅     |
| Email OTP Working | 100% delivery | ⏳     |
| API Routes        | All created   | ⏳     |
| Security Headers  | All added     | ⏳     |
| Input Validation  | 100% coverage | ⏳     |
| Error Handling    | Comprehensive | ⏳     |
| Documentation     | Complete      | ⏳     |
| Production Ready  | YES           | ⏳     |

---

## 💰 Estimated Costs After P1

| Item                  | Cost               | Duration   |
| --------------------- | ------------------ | ---------- |
| Development           | ~40 hours @ $50/hr | $2,000     |
| Supabase Pro          | $25/month          | Ongoing    |
| Resend (if chosen)    | $10/month          | Ongoing    |
| Vercel Pro            | $20/month          | Ongoing    |
| **Total First Month** |                    | **$2,055** |
| **Monthly Recurring** |                    | **$55**    |

---

## ⏱️ Timeline

```
Day 1: Database + Email Fix + Validators
Day 2: API Routes + Security Headers
Day 3: Middleware + Testing
Day 4: Documentation + Final QA
Day 5: Staging Deployment + Security Review

Total: 5 days (40 hours) → Production Ready ✅
```

---

**Next Step:** Choose to start with Task 1 (Database) or Task 2 (Email Fix) based on your preference. Both are critical and non-blocking each other.

**Questions?** Refer to [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) for detailed context.
