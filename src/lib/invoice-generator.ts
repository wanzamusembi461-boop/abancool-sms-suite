/**
 * Invoice Generator for Sender ID Requests
 * Generates beautiful PDF invoices using html2pdf
 */

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  network: string;
  senderIdText: string;
  businessName: string;
  userEmail: string;
  userPhone?: string;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const formattedAmount = data.amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px;
          color: white;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }
        .company-info h1 {
          font-size: 28px;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .company-info p {
          font-size: 13px;
          opacity: 0.9;
          line-height: 1.6;
        }
        .invoice-label {
          text-align: right;
          font-size: 12px;
          opacity: 0.8;
        }
        .invoice-number {
          font-size: 24px;
          font-weight: 700;
          margin-top: 5px;
        }
        .content {
          padding: 40px;
        }
        .section {
          margin-bottom: 35px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          color: #667eea;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-item {
          font-size: 13px;
        }
        .info-label {
          color: #999;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .info-value {
          color: #333;
          font-weight: 600;
          font-size: 14px;
        }
        .divider {
          border-top: 1px solid #e0e0e0;
          margin: 30px 0;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .details-table th {
          background: #f8f8f8;
          border-bottom: 2px solid #e0e0e0;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .details-table td {
          padding: 15px 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
          color: #555;
        }
        .details-table tr:last-child td {
          border-bottom: none;
        }
        .amount-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .amount-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px 30px;
          border-radius: 6px;
          text-align: right;
        }
        .amount-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 600;
        }
        .amount-value {
          font-size: 32px;
          font-weight: 700;
        }
        .footer {
          background: #f8f8f8;
          padding: 25px 40px;
          border-top: 1px solid #e0e0e0;
        }
        .footer-content {
          font-size: 12px;
          color: #999;
          line-height: 1.8;
        }
        .status-badge {
          display: inline-block;
          background: #fff3cd;
          color: #856404;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 15px;
        }
        .waiting-message {
          background: #e7f3ff;
          border-left: 4px solid #2196F3;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
          font-size: 13px;
          color: #1565c0;
          line-height: 1.6;
        }
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .invoice-container {
            box-shadow: none;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="header-top">
            <div class="company-info">
              <h1>ABANCOOL</h1>
              <p>SMS Communication Suite<br>
                 Nairobi, Kenya<br>
                 support@abancool.com</p>
            </div>
            <div class="invoice-label">
              <div>INVOICE</div>
              <div class="invoice-number">${data.invoiceNumber}</div>
            </div>
          </div>
        </div>

        <div class="content">
          <div class="status-badge">PENDING APPROVAL</div>

          <div class="waiting-message">
            <strong>⏱️ Processing Time:</strong> Your sender ID request will be reviewed within 28-48 hours. You'll receive an email notification once approved.
          </div>

          <div class="info-grid">
            <div>
              <div class="section-title">Bill To</div>
              <div class="info-item">
                <div class="info-label">Business Name</div>
                <div class="info-value">${data.businessName}</div>
              </div>
              <div class="info-item" style="margin-top: 10px;">
                <div class="info-label">Email</div>
                <div class="info-value">${data.userEmail}</div>
              </div>
              ${data.userPhone ? `
              <div class="info-item" style="margin-top: 10px;">
                <div class="info-label">Phone</div>
                <div class="info-value">${data.userPhone}</div>
              </div>
              ` : ""}
            </div>
            <div>
              <div class="section-title">Invoice Details</div>
              <div class="info-item">
                <div class="info-label">Invoice Date</div>
                <div class="info-value">${data.date}</div>
              </div>
              <div class="info-item" style="margin-top: 10px;">
                <div class="info-label">Service Type</div>
                <div class="info-value">Sender ID Request</div>
              </div>
              <div class="info-item" style="margin-top: 10px;">
                <div class="info-label">Network</div>
                <div class="info-value">${data.network}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <table class="details-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Sender ID: ${data.senderIdText}</strong><br>
                  <span style="font-size: 12px; color: #999;">Network: ${data.network}</span><br>
                  <span style="font-size: 12px; color: #999;">One-time activation fee</span>
                </td>
                <td style="text-align: right;">
                  <strong>${data.amount.toLocaleString("en-KE")}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="amount-section">
            <div class="amount-box">
              <div class="amount-label">Total Amount</div>
              <div class="amount-value">${formattedAmount}</div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="section-title">Terms & Conditions</div>
            <div style="font-size: 12px; color: #666; line-height: 1.8;">
              <p>• This invoice is for sender ID activation service</p>
              <p>• Payment must be received to proceed with approval</p>
              <p>• Sender ID will be activated within 48 hours of payment confirmation</p>
              <p>• Please keep this invoice for your records</p>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-content">
            <p><strong>Payment Instructions:</strong></p>
            <p>Payment will be processed via M-Pesa STK Push. A prompt will appear on your registered phone number.</p>
            <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
              <strong>ABANCOOL SMS Suite</strong> | Secure SMS Communication<br>
              Email: support@abancool.com | Invoice Date: ${data.date}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

export async function downloadInvoicePDF(html: string, fileName: string): Promise<void> {
  // This will be called client-side with html2pdf library
  // Implementation will depend on having html2pdf loaded
  if (typeof window === "undefined") return;

  const element = document.createElement("div");
  element.innerHTML = html;

  // Dynamic import of html2pdf
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) {
    console.error("html2pdf library not loaded");
    return;
  }

  const opt = {
    margin: 10,
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
  };

  html2pdf().set(opt).from(element).save();
}
