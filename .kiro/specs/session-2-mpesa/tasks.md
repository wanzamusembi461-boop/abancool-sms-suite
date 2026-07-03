# SESSION 2: TASKS

## Task 1: Database Setup & RLS Policies ✓ READY
**Status**: not_started  
**Dependencies**: None  
**Effort**: Low (30 min)

### Subtasks
1. [ ] Verify `transactions` table has all required columns
   - id, user_id, package_id, status, mpesa_checkout_id, mpesa_receipt, amount_kes, created_at, updated_at, raw_callback
2. [ ] Enable RLS on `transactions` table
3. [ ] Create RLS policies for transactions:
   - Users can SELECT/INSERT their own transactions
   - Service role (edge functions) can UPDATE transactions
4. [ ] Create migration to add indexes:
   - `idx_transactions_checkout_id` (unique on pending)
   - `idx_transactions_user_id` (for queries)
5. [ ] Create SQL function: `public.credit_sms(user_id uuid, amount int)` 
   - Updates `sms_balances.paid_sms` atomically
   - Returns success boolean

### Acceptance
- [ ] Migration file exists in `supabase/migrations/`
- [ ] RLS policies are in place
- [ ] `credit_sms()` function callable from edge functions

---

## Task 2: M-Pesa Client Utilities ✓ READY
**Status**: not_started  
**Dependencies**: Task 1  
**Effort**: Low (30 min)

### Subtasks
1. [ ] Create `src/lib/mpesa.ts`:
   - `normalizePhoneNumber(phone: string): string` - converts 0712... to 2547...
   - `validatePhoneNumber(phone: string): boolean` - regex check
   - `calculateTimestamp(): string` - for M-Pesa password
   - `generateMpesaPassword(shortcode, passkey, timestamp): string` - base64 encode

2. [ ] Export from file for use in components & edge functions

### Acceptance
- [ ] File exists and exports all utilities
- [ ] Unit test examples work (manual verification)
- [ ] Phone normalization handles 0712..., 254712..., 2547...

---

## Task 3: Edge Function - mpesa-stk-initiate ✓ READY
**Status**: not_started  
**Dependencies**: Task 1, Task 2  
**Effort**: Medium (1 hour)

### Subtasks
1. [ ] Create directory: `supabase/functions/mpesa-stk-initiate/`
2. [ ] Create `index.ts` with:
   - Zod schema for body: `{ package_id, phone }`
   - JWT verification (verify_jwt = true in config)
   - Phone normalization & validation
   - Query package by ID from DB
   - Daraja OAuth token request
   - M-Pesa STK Push request
   - Insert transaction row with status='pending'
   - Error handling with friendly messages
3. [ ] Create `deno.json` or config for environment variables

### Acceptance
- [ ] Function deployed to Supabase
- [ ] Can call via `supabase.functions.invoke()` from frontend
- [ ] Returns `{ checkout_id, message }` on success
- [ ] Proper error responses with statusCode
- [ ] Transaction inserted in DB with pending status

---

## Task 4: Edge Function - mpesa-callback ✓ READY
**Status**: not_started  
**Dependencies**: Task 1, Task 3  
**Effort**: Medium (1 hour)

### Subtasks
1. [ ] Create directory: `supabase/functions/mpesa-callback/`
2. [ ] Create `index.ts` with:
   - Parse incoming Safaricom webhook body
   - Find transaction by `mpesa_checkout_id` (CheckoutRequestID)
   - On success (ResultCode=0):
     - Update transaction status='completed', set receipt & raw_callback
     - Call `credit_sms()` RPC atomically
     - Create notification record
   - On failure:
     - Update transaction status='failed'
     - Create notification with error reason
   - Always return `{ ResultCode: 0, ResultDesc: "Accepted" }`
3. [ ] Add error logging (log to function logs, not DB)

### Acceptance
- [ ] Function deployed
- [ ] Can be tested with mock Safaricom payload
- [ ] Transaction status updates correctly
- [ ] SMS balance increments on success
- [ ] Notification created
- [ ] Returns expected response format

---

## Task 5: Edge Function - mpesa-status-check ✓ READY
**Status**: not_started  
**Dependencies**: Task 1, Task 3  
**Effort**: Low (45 min)

### Subtasks
1. [ ] Create directory: `supabase/functions/mpesa-status-check/`
2. [ ] Create `index.ts` with:
   - JWT verification
   - Zod schema: `{ transaction_id: string }`
   - Fetch transaction, verify user_id matches auth.uid()
   - If status='pending', call Daraja STK Query
   - Update transaction status if response differs
   - Return `{ status, message, receipt? }`
3. [ ] Cache Daraja bearer token to avoid repeated auth calls

### Acceptance
- [ ] Function deployed
- [ ] Callable from frontend with JWT
- [ ] Returns correct status
- [ ] Properly verifies transaction ownership

---

## Task 6: Frontend - BuySMSDialog Component ✓ READY
**Status**: not_started  
**Dependencies**: Task 3  
**Effort**: Medium (1 hour)

### Subtasks
1. [ ] Create `src/components/buy-sms/BuySMSDialog.tsx`:
   - Dialog wrapper (shadcn/ui)
   - Phone input field with label "Your phone number"
   - Help text showing expected format
   - Display package name, SMS count, price
   - Phone validation on blur (show error if invalid)
   - "Pay with M-Pesa" button (disabled until valid phone)
   - Spinner on submit
   - Error toast if edge function fails
2. [ ] Export from components barrel

### Acceptance
- [ ] Dialog opens on BuySMS page
- [ ] Phone field pre-filled from profile
- [ ] Validation works (shows error for invalid phone)
- [ ] Can submit and receive response from edge function
- [ ] Error messages are user-friendly

---

## Task 7: Frontend - PaymentPollingModal Component ✓ READY
**Status**: not_started  
**Dependencies**: Task 5, Task 6  
**Effort**: Medium (1 hour)

### Subtasks
1. [ ] Create `src/components/buy-sms/PaymentPollingModal.tsx`:
   - Receives transaction_id & timeout (60s)
   - Shows "Check your phone…" message
   - Countdown timer (displays remaining seconds)
   - Polls `mpesa-status-check` every 3s
   - Handles success state (show checkmark, close modal, refresh balance)
   - Handles failure state (show error reason, allow retry)
   - Handles timeout (show "Check your phone manually…" message)
   - "Close" button to dismiss
2. [ ] Add loading spinner via framer-motion

### Acceptance
- [ ] Modal opens after STK initiated
- [ ] Polls correctly every 3s
- [ ] Updates on success/failure
- [ ] Countdown accurate
- [ ] Closes automatically on success
- [ ] Times out after 60s with grace

---

## Task 8: Frontend - Transactions Page ✓ READY
**Status**: not_started  
**Dependencies**: None  
**Effort**: Medium (1 hour)

### Subtasks
1. [ ] Create `src/pages/Transactions.tsx`:
   - Queries user's transactions via Supabase (realtime subscription)
   - Renders table with columns:
     - Status (pill badge: pending/yellow, completed/green, failed/red)
     - Date (formatted via date-fns, e.g., "Jun 30, 2024 3:45 PM")
     - Amount (right-aligned, KES format)
     - Package name
     - Receipt number (monospace if present, "—" if pending)
     - Actions (dropdown menu)
   - Filters above table:
     - Date range picker (from/to)
     - Status dropdown (All, Pending, Completed, Failed)
   - "Export as CSV" button
   - Empty state: "No transactions yet. Buy SMS to get started"
2. [ ] Implement CSV export (client-side)

### Acceptance
- [ ] Page loads and displays user transactions
- [ ] Filters work correctly
- [ ] Realtime updates when new transaction arrives
- [ ] CSV export includes all visible rows
- [ ] Mobile responsive (horizontal scroll on small screens)

---

## Task 9: Frontend - Update BuySMS Page ✓ READY
**Status**: not_started  
**Dependencies**: Task 6, Task 7  
**Effort**: Low (30 min)

### Subtasks
1. [ ] Update `src/pages/BuySMS.tsx`:
   - Replace "M-Pesa STK Push coming in session 2" text
   - Add state management for dialog open/close
   - On "Pay with M-Pesa" click, open `<BuySMSDialog />`
   - After STK initiated, show `<PaymentPollingModal />`
   - On success, close modal and refresh balance
2. [ ] Import and render components

### Acceptance
- [ ] Dialog opens on button click
- [ ] Modal appears after dialog submit
- [ ] Success flow works end-to-end

---

## Task 10: Frontend - Add Transactions Route ✓ READY
**Status**: not_started  
**Dependencies**: Task 8  
**Effort**: Low (15 min)

### Subtasks
1. [ ] Update `src/App.tsx`:
   - Add new route `/transactions` with Transactions page
   - Place in protected authenticated routes section
2. [ ] Update `src/components/DashboardLayout.tsx`:
   - Add "Transactions" link to sidebar (between "Buy SMS" and "Settings")

### Acceptance
- [ ] Route is accessible from sidebar
- [ ] Page loads correctly

---

## Task 11: Environment Setup & Testing ✓ READY
**Status**: not_started  
**Dependencies**: All tasks  
**Effort**: Medium (1 hour)

### Subtasks
1. [ ] Request M-Pesa secrets from user (via Supabase dashboard):
   - MPESA_CONSUMER_KEY
   - MPESA_CONSUMER_SECRET
   - MPESA_SHORTCODE
   - MPESA_PASSKEY
   - MPESA_ENV (sandbox)
   - MPESA_CALLBACK_URL (will be set after deploy)
2. [ ] Test edge functions in Supabase dashboard
   - Call `mpesa-stk-initiate` with sample request
   - Verify Daraja connection works
   - Check transaction inserted
3. [ ] Manual testing from frontend:
   - Navigate to `/buy-sms`
   - Click "Pay with M-Pesa"
   - Enter phone number
   - Submit and verify STK initiates
   - Check `/transactions` page shows new pending transaction

### Acceptance
- [ ] Secrets set in Supabase
- [ ] Edge functions tested and working
- [ ] End-to-end flow works (at least up to STK confirmation)

---

## Implementation Order

Execute tasks in this sequence:
1. Task 1: Database Setup (foundation)
2. Task 2: M-Pesa Utilities (dependencies for other tasks)
3. Task 3: mpesa-stk-initiate (core flow)
4. Task 4: mpesa-callback (payment processing)
5. Task 5: mpesa-status-check (polling)
6. Task 6: BuySMSDialog (frontend)
7. Task 7: PaymentPollingModal (frontend)
8. Task 8: Transactions Page (display)
9. Task 9: Update BuySMS (wire components)
10. Task 10: Add route (navigation)
11. Task 11: Environment & Testing (verification)

