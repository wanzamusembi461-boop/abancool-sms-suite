# SESSION 2: M-PESA INTEGRATION — QUICK START

## What's Been Implemented

Session 2 (M-Pesa STK Push + Wallet) is **100% complete** and ready for deployment.

### ✅ Features Built
- **Buy SMS Page** (`/buy-sms`) - Pricing cards with M-Pesa payment button
- **Payment Dialog** - Phone input with validation and package summary
- **Payment Polling** - Real-time STK status checking with 60-second countdown
- **Transactions Page** (`/transactions`) - Full transaction history with filters & CSV export
- **Edge Functions** - 3 Deno functions for M-Pesa orchestration
- **Database** - RPC functions for atomic SMS credits + RLS policies

### 📁 Key Files
```
supabase/
  functions/
    mpesa-stk-initiate/        → Initiates payment
    mpesa-callback/            → Receives payment webhook
    mpesa-status-check/        → Polls payment status
  migrations/
    20260701_session2_mpesa.sql → Database setup

src/
  lib/
    mpesa.ts                   → Utilities (phone validation, etc)
  components/buy-sms/
    BuySMSDialog.tsx          → Payment form
    PaymentPollingModal.tsx    → Status polling UI
  pages/
    Transactions.tsx           → History & export
    BuySMS.tsx                → Updated with components
```

---

## 🚀 DEPLOYMENT STEPS

### 1️⃣ Add M-Pesa Secrets to Supabase

Go to Supabase Dashboard → Project → Settings → Database → Secrets:

```
MPESA_CONSUMER_KEY          = (from Daraja)
MPESA_CONSUMER_SECRET       = (from Daraja)
MPESA_SHORTCODE             = (Paybill/Till number)
MPESA_PASSKEY               = (Lipa na M-Pesa Online passkey)
MPESA_ENV                   = sandbox  (or production)
MPESA_CALLBACK_URL          = (will fill after edge functions deployed)
```

**Get These From:**
- **Daraja Console**: https://developer.safaricom.co.ke
  - Create app, get consumer key/secret
  - Shortcode = your paybill/till number
  - Passkey = from Lipa na M-Pesa Online settings
- **Choose Environment**: sandbox for testing, production for live

### 2️⃣ Deploy Database Changes

```bash
cd supabase
supabase migration up
```

This creates:
- `credit_sms()` RPC function
- `deduct_sms()` RPC function
- Updated transaction policies
- Duplicate prevention index

### 3️⃣ Deploy Edge Functions

```bash
supabase functions deploy mpesa-stk-initiate
supabase functions deploy mpesa-callback
supabase functions deploy mpesa-status-check
```

After deployment, copy the **mpesa-callback** function URL and update the secret:

```
MPESA_CALLBACK_URL = https://your-project.supabase.co/functions/v1/mpesa-callback
```

### 4️⃣ Build & Test

```bash
npm install    # First time only
npm run build
npm run preview
```

Navigate to http://localhost:4173 (or your preview URL)

### 5️⃣ Test the Payment Flow

1. Go to `/buy-sms`
2. Click "Pay with M-Pesa" on any package
3. Enter phone: `0712345678` (or your test number)
4. Click "Pay with M-Pesa"
5. STK popup should appear on your phone (or in console if sandbox)
6. Enter M-Pesa PIN
7. Wait for success message
8. Check `/transactions` — should show "Completed"
9. Check dashboard — SMS balance should increase

---

## ✅ Verification Checklist

- [ ] Secrets set in Supabase
- [ ] Migration deployed successfully
- [ ] 3 edge functions deployed and accessible
- [ ] Build completes without errors
- [ ] `/buy-sms` page loads
- [ ] Phone validation works (try invalid number, should error)
- [ ] Dialog opens on "Pay with M-Pesa" click
- [ ] Polling modal appears and counts down
- [ ] `/transactions` page loads and shows transaction
- [ ] CSV export button works
- [ ] Filters (date range, status) work
- [ ] Payment completes and SMS credited

---

## 🔧 Troubleshooting

### STK Not Initiating
- Check: MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are correct
- Check: MPESA_ENV matches your app (sandbox vs production)
- Check: Phone number is valid Kenyan format

### Transaction Not Updating After Payment
- Check: MPESA_CALLBACK_URL is set correctly
- Check: Edge function logs for errors (Supabase Dashboard → Functions)
- Verify: RLS policies allow service_role to UPDATE transactions

### SMS Not Credited
- Check: credit_sms() RPC exists and works
- Check: Transaction has sms_credited > 0
- Verify: sms_balances table has entry for user

### Build Errors
- Run: `npm install` to ensure all dependencies installed
- Check: TypeScript errors in `/src`
- Verify: All imports resolved (especially new components)

---

## 📚 What Happens Behind the Scenes

### Payment Flow
```
User clicks "Pay with M-Pesa"
    ↓
BuySMSDialog validates phone
    ↓
Calls mpesa-stk-initiate edge function
    ↓
Edge function:
  1. Fetches package (server-side, prevents price tampering)
  2. Authenticates with Daraja API
  3. Sends STK Push to Safaricom
  4. Inserts transaction with status='pending'
  5. Returns checkout_id to frontend
    ↓
PaymentPollingModal opens
    ↓
Polls mpesa-status-check every 3 seconds
    ↓
User enters M-Pesa PIN on phone
    ↓
Safaricom calls mpesa-callback webhook
    ↓
Edge function:
  1. Updates transaction status='completed'
  2. Calls credit_sms() RPC (atomic, no race conditions)
  3. Creates success notification
    ↓
Frontend polling detects status='completed'
    ↓
Shows success message & closes modal
    ↓
User's SMS balance updated ✅
```

---

## 🎓 Key Design Decisions

1. **Server-Side Package Lookup**: Price fetched from DB, never trusted from client
2. **Atomic SMS Credits**: RPC function ensures no partial credits on error
3. **Unique Index on Pending**: Prevents duplicate STK pushes for same checkout
4. **No JWT on Callback**: Safaricom hits callback directly; validated via CheckoutRequestID
5. **3-Second Polling**: Balances responsiveness with API rate limits
6. **60-Second Timeout**: Enough time for user to enter PIN, not too long
7. **Always Accept Callback**: Even if processing fails, Safaricom gets 200 OK (prevents retries)

---

## 🔐 Security Implemented

- ✅ Phone validation prevents injection
- ✅ JWT required on user-facing endpoints
- ✅ RLS policies prevent cross-user data access
- ✅ Callback validates CheckoutRequestID against DB
- ✅ Package price enforced server-side
- ✅ Duplicate checkout prevention via unique index
- ✅ Atomic transactions prevent race conditions

---

## 📞 Support

If stuck:
1. Check `.kiro/specs/session-2-mpesa/IMPLEMENTATION_STATUS.md` for detailed info
2. Review edge function logs in Supabase Dashboard
3. Verify all environment secrets set
4. Test STK initiation with curl:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/mpesa-stk-initiate \
     -H "Authorization: Bearer YOUR_JWT" \
     -d '{"package_id": "...", "phone": "0712345678"}'
   ```

---

## 🎯 Next: Session 3

After Session 2 is deployed and tested:
- **Contacts**: CSV import, tagging, grouping
- **Campaigns**: Multi-step wizard, personalization
- **SMS Engine**: Delivery tracking, provider integration

Ready? Check the Session 2 spec files in `.kiro/specs/session-2-mpesa/` for technical details.

