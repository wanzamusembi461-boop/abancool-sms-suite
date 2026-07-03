# SESSION 2: DESIGN

## User Flows

### Flow 1: Buy SMS with M-Pesa

```
User on Dashboard
  ↓
Clicks "Buy SMS" link → `/buy-sms`
  ↓
Sees pricing cards (Starter/Business/Enterprise)
  ↓
Clicks "Pay with M-Pesa" on any card
  ↓
BuySMSDialog opens with:
  - Phone field (prefilled from profile.phone)
  - Package name & total price displayed
  - "Pay" button
  ↓
User edits phone if needed, clicks "Pay"
  ↓
Frontend calls mpesa-stk-initiate
  - Validates phone: ^(?:254|0)?7\d{8}$
  - Sends { package_id, phone }
  ↓
Edge function:
  - Fetches package (atomic server-side)
  - Normalizes phone to 2547XXXXXXXX
  - OAuth to Daraja
  - POST STK request
  - Inserts transaction (status='pending')
  - Returns checkout_id
  ↓
Frontend closes dialog, shows PaymentPollingModal
  - "Check your phone for M-Pesa prompt"
  - Countdown timer (60s max)
  ↓
Modal polls mpesa-status-check every 3s
  ↓
User enters PIN on phone (or cancels)
  ↓
Daraja calls mpesa-callback webhook
  ↓
Edge function:
  - Parses callback
  - Updates transaction status
  - Calls credit_sms RPC (atomic)
  - Creates notification
  ↓
Frontend polling detects status='completed'
  ↓
Shows success toast "X SMS credited!"
  ↓
User redirected to dashboard (balance updated)
```

### Flow 2: View Transaction History

```
User on Dashboard
  ↓
Clicks "Transactions" link → `/transactions`
  ↓
Sees table of all user transactions:
  - Status pill (pending/completed/failed)
  - Date & time
  - Amount (KES)
  - Package name
  - Receipt number
  - Actions (retry if failed, view details)
  ↓
Can filter by:
  - Date range (from/to)
  - Status
  ↓
Can export as CSV
```

## Component Architecture

```
src/pages/BuySMS.tsx
├── Displays packages from DB
└── Renders "Pay" buttons
    ├── → opens BuySMSDialog

src/components/buy-sms/BuySMSDialog.tsx
├── Phone input with validation
├── Package summary (name, price)
├── "Pay" button
└── On submit → invokes mpesa-stk-initiate
    ├── → shows PaymentPollingModal

src/components/buy-sms/PaymentPollingModal.tsx
├── Status message
├── Countdown timer (60s)
├── Polls mpesa-status-check
├── Handles success/error
└── Closes on success or timeout

src/pages/Transactions.tsx
├── Queries user's transactions (realtime)
├── Table with status, date, amount, package, receipt
├── Filters: date range, status
├── CSV export button
└── Realtime refresh via supabase subscription
```

## Database Changes

### Ensure transactions table has RLS:

```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_user_select" 
  ON public.transactions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "transactions_user_insert" 
  ON public.transactions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);
```

### Add unique index for concurrent payment safety:

```sql
CREATE UNIQUE INDEX idx_transactions_checkout_id 
  ON public.transactions(mpesa_checkout_id) 
  WHERE status = 'pending';
```

## Edge Function Architecture

### /supabase/functions/mpesa-stk-initiate/index.ts

```typescript
import { createClient } from "@supabase/supabase-js";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const bodySchema = z.object({
  package_id: z.string().uuid(),
  phone: z.string().regex(/^(?:254|0)?7\d{8}$/),
});

export async function POST(req: Request) {
  // 1. Verify JWT (handled by Supabase auto)
  // 2. Parse & validate body
  // 3. Fetch package
  // 4. Normalize phone
  // 5. OAuth to Daraja
  // 6. POST STK request
  // 7. Insert transaction
  // 8. Return checkout_id
}
```

### /supabase/functions/mpesa-callback/index.ts

```typescript
export async function POST(req: Request) {
  // 1. Parse callback
  // 2. Find transaction by CheckoutRequestID
  // 3. Update status
  // 4. Call credit_sms RPC
  // 5. Create notification
  // 6. Return Accepted
}
```

### /supabase/functions/mpesa-status-check/index.ts

```typescript
export async function POST(req: Request) {
  // 1. Verify JWT
  // 2. Get transaction
  // 3. If pending, query Daraja
  // 4. Update if needed
  // 5. Return status
}
```

## UI Design (Glassmorphism)

### BuySMSDialog
- Glass card with soft border
- Phone input with clear label
- Package summary (name, price, SMS count)
- "Pay" button: gradient-primary with shadow-primary
- Error messages in red text inside card

### PaymentPollingModal
- Larger glass card
- Phone icon + "Waiting for M-Pesa prompt…"
- Countdown timer (large, prominent)
- "Cancel" button (secondary)
- Spinner animation while polling
- Success: green checkmark + "SMS credited!" message
- Error: red X + error message from Daraja

### Transactions Table
- Glass card wrapper
- Table with:
  - Status pill (semantic colors: yellow/green/red)
  - Date (formatted via date-fns)
  - Amount (right-aligned)
  - Package name
  - Receipt (monospace font)
  - Actions dropdown
- Filters above table (date range picker + status select)
- CSV export button (secondary)

## Mobile Responsiveness

- **Dialog**: Full width on mobile (max-width 90vw), centered
- **Table**: Horizontal scroll on mobile, sticky status column
- **Countdown**: Large readable font on mobile
- **Buttons**: Full width on mobile (touch target ≥44px)

## Accessibility

- Phone input: `aria-label="Phone number"`, `aria-describedby="phone-help"`
- Modal: Focus trap, backdrop close, Escape key support
- Status pills: `aria-label="Status: Pending"` etc.
- Table headers: `scope="col"`, semantic `<th>` tags
- Countdown timer: `aria-live="polite"` for screen readers
- Buttons: Visible focus rings, no color-only status

## Error Handling

### Phone Validation Errors
- "Invalid phone number. Use format 0712345678 or 254712345678"

### Package Errors
- "Package not found or inactive"
- "Package price mismatch (possible tampering)"

### M-Pesa Errors
- 1 "Unable to process your transaction" (generic)
- 17 "Invalid amount (minimum KES 10)" 
- 25 "Invalid API request" (bad phone, etc.)

### Network Errors
- "Network error. Retrying…" (auto-retry 3x)
- "Request timeout. Please try again"

### Payment Timeouts
- "Payment timeout. Check your phone and try again"
- Allow manual retry without re-entering details

## Performance Considerations

- Package list: Cached for 5 minutes (TanStack Query staleTime)
- Transaction list: Realtime via Supabase subscription, no polling
- STK polling: Every 3s for 60s (20 requests max per transaction)
- Modal animation: GPU-accelerated via CSS transforms
- CSV export: Client-side (no server load)

## Security Notes

- Phone validation prevents injection into Daraja
- Package lookup prevents price manipulation
- Callback validates against DB record (CheckoutRequestID)
- RLS policies prevent users seeing others' transactions
- JWT verification on user endpoints (`mpesa-stk-initiate`, `mpesa-status-check`)
- No JWT on callback (Safaricom hits directly) — validate via CheckoutRequestID

