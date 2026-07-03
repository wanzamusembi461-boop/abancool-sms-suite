# Latest Updates - SMS Pricing & Sender ID STK Push

## Changes Made

### 1. SMS Package Pricing Updated
**Changed from:** 5.00, 4.00, 3.50, 3.00 KES per SMS
**Changed to:** 0.50, 0.40, 0.35, 0.30 KES per SMS

**New Package Pricing:**
- **Starter**: 1,000 SMS @ 0.50 KES = 500 KES total (was 5,000 KES)
- **Popular**: 5,000 SMS @ 0.40 KES = 2,000 KES total (was 20,000 KES)
- **Business**: 10,000 SMS @ 0.35 KES = 3,500 KES total (was 35,000 KES)
- **Enterprise**: 50,000 SMS @ 0.30 KES = 15,000 KES total (was 150,000 KES)

**Files Updated:**
- `supabase/migrations/20260702_update_packages.sql` - Database seeding
- `src/pages/BuySMS.tsx` - Custom amount calculation (now 0.5 KES per SMS)
- `src/pages/Landing.tsx` - Public pricing display

### 2. Custom SMS Amount Purchase
- Minimum KES amount: 10 (changed from 50)
- Calculation: ~2 SMS per 1 KES (0.5 KES per SMS)
- Example: KES 100 = ~200 SMS

### 3. Sender ID Marketplace - STK Push Payment Integration
**Added Payment Flow:**
1. User clicks "Pay with M-Pesa" on marketplace sender ID
2. Enters phone number
3. Initiates M-Pesa STK Push payment (same as SMS packages)
4. Polls for payment status
5. On success, creates sender ID record with status "pending"
6. Admin receives notification to approve

**Files Updated/Created:**
- `src/pages/SenderID.tsx` - Complete rewrite with payment integration
- `supabase/functions/mpesa-stk-initiate/index.ts` - Enhanced to handle both SMS and sender_id purchases
- `src/components/buy-sms/PaymentPollingModal.tsx` - Reused for sender ID payments

**Marketplace Pricing (Unchanged):**
- Safaricom Official: 7,500 KES
- Airtel Kenya: 7,500 KES
- Telkom Kenya: 7,500 KES

### 4. Phone Validation (Already Fixed)
- Rejects all landline numbers (01*, 2541*)
- Only accepts mobile: 07XXXXXXXX or 2547XXXXXXXX
- Updated in both frontend and edge function

### 5. Admin Console Enhancements
- Queries from `profiles` table (not auth.admin)
- SMS credit system with reason tracking
- Support tickets management
- Package management (activate/deactivate)
- SMS gateway configuration

## Database Schema Notes

The `transactions` table now includes:
```sql
type: VARCHAR (sms | sender_id)
sender_id_market_id: VARCHAR (for marketplace sender ID purchases)
```

## Sender ID Purchase Flow

**Admin Workflow:**
1. Payment confirmed → Sender ID created with status "pending"
2. Admin receives notification
3. Admin approves in console
4. User gets notification and sender ID becomes "active"

**User Workflow:**
1. Browse marketplace
2. Click "Pay with M-Pesa"
3. Enter phone, receive STK prompt
4. Pay via M-Pesa
5. Seller ID appears in "My IDs" tab with "pending" status
6. Once admin approves → status becomes "active"

## Deployment Checklist

- [ ] Run migration: `supabase migration up`
- [ ] Deploy edge functions: `supabase functions deploy mpesa-stk-initiate`
- [ ] Verify new pricing on Buy SMS page
- [ ] Verify new pricing on Landing page
- [ ] Test sender ID marketplace payment flow
- [ ] Verify admin receives payment notifications
- [ ] Test sender ID approval workflow

## Notes

- Custom sender ID purchases now require M-Pesa payment (STK Push)
- All marketplace sender ID payments go through same M-Pesa flow as SMS packages
- Admin approval required after payment for marketplace purchases
- Phone validation is strict: mobile numbers only
- No landline support for M-Pesa payments
