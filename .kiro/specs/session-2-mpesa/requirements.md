# SESSION 2: M-PESA STK PUSH + WALLET

## Overview
Enable users to purchase SMS credits via M-Pesa STK Push (popup payment). On successful payment, SMS credits are atomically credited to their account.

## Requirements

### 1. M-Pesa Integration Secrets
Setup these environment variables in Supabase:
- `MPESA_CONSUMER_KEY` - Daraja OAuth credentials
- `MPESA_CONSUMER_SECRET` - Daraja OAuth credentials  
- `MPESA_SHORTCODE` - Paybill/Till number
- `MPESA_PASSKEY` - Lipa na M-Pesa Online passkey
- `MPESA_ENV` - "sandbox" or "production"
- `MPESA_CALLBACK_URL` - Edge function public URL (set after deploy)

### 2. Frontend User Flows

#### Buy SMS Page (`/buy-sms`)
- Display pricing cards from `packages` table
- User clicks "Pay with M-Pesa" → Opens `<BuySMSDialog />`
  - Phone field pre-filled from profile, editable
  - Confirm button triggers `mpesa-stk-initiate` edge function
  
#### Payment Polling Modal
- After STK initiated, show "Check your phone for payment prompt"
- Poll `mpesa-status-check` every 3 seconds for up to 60 seconds
- OR listen to realtime `transactions` channel filtered by user_id
- On status='completed': show success toast, refresh balance, close modal
- On status='failed': show error toast with reason
- Allow manual retry

#### Transactions Page (`/transactions`)
- New route: `/transactions`
- Table: all user transactions with status pill, amount, receipt, date
- Filters: date range, status
- CSV export

### 3. Database Extensions

#### transactions Table
Already exists; ensure these columns:
```sql
- id UUID (PK)
- user_id UUID (FK profiles)
- package_id UUID (FK packages)  
- status transaction_status (pending|completed|failed|cancelled)
- mpesa_checkout_id TEXT (Daraja CheckoutRequestID)
- mpesa_receipt TEXT (e.g., "LHD121994UA")
- amount_kes NUMERIC
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
- raw_callback JSONB (full Safaricom response)
```

### 4. Edge Functions

#### `mpesa-stk-initiate` (verify_jwt = true)
```
POST /functions/v1/mpesa-stk-initiate
Body: { package_id: string, phone: string }
Returns: { checkout_id: string, message: string }
```

**Logic**:
1. Validate phone matches `^(?:254|0)?7\d{8}$`, normalize to `2547XXXXXXXX`
2. Fetch package from DB (server-side trust, not client)
3. OAuth to Daraja: GET `/oauth/v1/generate?grant_type=client_credentials`
4. POST to Daraja `/mpesa/stkpush/v1/processrequest`:
   - Password = base64(shortcode + passkey + timestamp)
   - TransactionType = "CustomerPayBillOnline"
   - PartyA = phone
   - PartyB = shortcode
   - AccountReference = "ABANCOOL"
   - TransactionDesc = "SMS Credit"
   - Amount = package.total_price
5. Insert row into `transactions` (status='pending', mpesa_checkout_id=CheckoutRequestID)
6. Return `{ checkout_id, message }`

#### `mpesa-callback` (verify_jwt = false)
```
POST /functions/v1/mpesa-callback
Body: Safaricom webhook { Body: { stkCallback: {...} } }
Returns: { ResultCode: 0, ResultDesc: "Accepted" }
```

**Logic**:
1. Parse `Body.stkCallback`
2. If `ResultCode === 0` (success):
   - Get `CheckoutRequestID` from response
   - Find transaction row by mpesa_checkout_id
   - Update: status='completed', mpesa_receipt=receipt, raw_callback=response
   - Call RPC `public.credit_sms(user_id, package.sms_count)` atomically
   - Create notification: "Payment received — X SMS credited"
3. If failed:
   - Update: status='failed'
   - Create notification with failure reason
4. Always respond: `{ ResultCode: 0, ResultDesc: "Accepted" }`

#### `mpesa-status-check` (verify_jwt = true)
```
POST /functions/v1/mpesa-status-check
Body: { transaction_id: string }
Returns: { status: string, message: string, receipt?: string }
```

**Logic**:
1. Fetch transaction by ID, verify ownership (user_id match)
2. If status='pending':
   - Call Daraja STK Query with CheckoutRequestID
   - Update transaction status based on response
3. Return current status

### 5. Frontend Components

#### `BuySMSDialog.tsx`
- Modal with phone input field
- Disabled submit button shows spinner while processing
- On submit: call `mpesa-stk-initiate`, show polling modal
- Error handling with toast

#### `PaymentPollingModal.tsx`
- "Check your phone…" message with countdown timer
- Polls `/functions/v1/mpesa-status-check` every 3s
- Success/error state handling
- Allow manual close or auto-close on success

#### `Transactions.tsx` Page
- Realtime table of user transactions
- Status pills (pending=yellow, completed=green, failed=red)
- Date/time, amount, package name, receipt number
- Filters: date range, status
- CSV export button

### 6. RPC Functions (SQL)

#### `public.credit_sms(user_id uuid, amount int)`
```sql
UPDATE sms_balances
SET paid_sms = paid_sms + amount,
    updated_at = now()
WHERE user_id = $1
RETURNING *;
```

Ensure atomic — used by callback.

### 7. Validation & Error Handling

- Phone validation: Must be valid Kenyan number
- Package validation: Must exist and be active
- M-Pesa errors: Parse Daraja error codes, show friendly messages
- Network errors: Retry logic with exponential backoff
- Timeout: 60s max wait for payment confirmation

## Acceptance Criteria

- [ ] User can navigate to `/buy-sms` and see pricing cards
- [ ] Clicking "Pay with M-Pesa" opens dialog with phone pre-fill
- [ ] Submitting initiates STK push (Daraja sandbox test succeeds)
- [ ] Payment modal shows and polls status every 3 seconds
- [ ] On successful payment, SMS balance is credited atomically
- [ ] Transactions page shows all user transactions with correct status
- [ ] CSV export works from transactions page
- [ ] Error handling shows appropriate toast messages
- [ ] Phone number validation prevents invalid submissions
- [ ] Polling times out after 60 seconds with appropriate message

## Dependencies

- Already installed: `@tanstack/react-query`, `zod`, `sonner`
- May need: `date-fns` for polling timers (check if installed)

## Notes

- Never trust price from client — always look up package server-side
- Use Zod for input validation on all edge function requests
- RLS policies should prevent users seeing other users' transactions
- Callback URL is sensitive — only whitelist Safaricom IPs in production
- Store raw callback for audit trail
