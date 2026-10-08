import { Order, RestaurantSettings } from '../types';

interface ThermalPrintOptions {
  paperWidth?: '80mm' | '58mm';
  fontSize?: 'normal' | 'compact';
  feedLines?: number;
}

export function generateReceiptHtml(
  order: Order,
  settings: RestaurantSettings,
  options?: ThermalPrintOptions
): string {
  const paperWidth = options?.paperWidth || settings.thermalPrinterWidth || '80mm';
  const is58 = paperWidth === '58mm';
  const feedLines = options?.feedLines ?? settings.thermalCutFeedLines ?? 2;

  const formattedDate = new Date(order.createdAt).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const divider = is58
    ? '--------------------------------'
    : '------------------------------------------------';

  return `
    <div class="receipt-container ${is58 ? 'w-58' : 'w-80'}">
      <!-- HEADER -->
      <div class="center bold uppercase brand-name">${escapeHtml(settings.name || 'Tokyo Crunch')}</div>
      <div class="center text-sm">${escapeHtml(settings.location || 'Itfaq City Commercial Area')}</div>
      <div class="center text-sm">Tel: ${escapeHtml(settings.phone || '03071777948')}</div>
      ${settings.receiptHeader ? `<div class="center text-xs mt-1 font-bold">${escapeHtml(settings.receiptHeader)}</div>` : ''}

      <div class="divider">${divider}</div>

      <!-- METADATA (CLEAN SEPARATE LINES - NEVER WRAPS BROKENLY) -->
      <div class="meta-section">
        <div class="row bold">
          <span>ORDER: #${escapeHtml(order.orderNumber)}</span>
          <span class="badge">[${escapeHtml(order.type.replace('_', ' ').toUpperCase())}]</span>
        </div>
        ${order.tableNumber ? `<div class="bold text-sm">TABLE: ${escapeHtml(order.tableNumber)}</div>` : ''}
        <div class="text-sm">DATE: ${escapeHtml(formattedDate)}</div>
        <div class="row text-sm">
          <span>CASHIER: ${escapeHtml(order.cashierName || 'Staff')}</span>
          <span>${escapeHtml(order.status.toUpperCase())}</span>
        </div>

        ${
          order.customerName && order.customerName !== 'Walk-in Customer'
            ? `
          <div class="text-sm mt-1">
            <div class="bold">CUST: ${escapeHtml(order.customerName)} ${order.customerPhone ? `(${escapeHtml(order.customerPhone)})` : ''}</div>
            ${order.deliveryAddress ? `<div class="text-xs">ADDR: ${escapeHtml(order.deliveryAddress)}</div>` : ''}
          </div>
        `
            : ''
        }
      </div>

      <div class="divider">${divider}</div>

      <!-- TABLE HEADER -->
      ${
        is58
          ? `
        <div class="row bold text-xs border-b pb-1">
          <span>ITEM / DESCRIPTION</span>
          <span class="right">TOTAL</span>
        </div>
      `
          : `
        <div class="row bold text-xs border-b pb-1">
          <span style="width: 15%">QTY</span>
          <span style="width: 60%">ITEM DESCRIPTION</span>
          <span style="width: 25%" class="right">TOTAL</span>
        </div>
      `
      }

      <!-- LINE ITEMS -->
      <div class="items-list">
        ${order.items
          .map((item) => {
            const variantText =
              item.variantName && item.variantName !== 'Standard'
                ? ` (${escapeHtml(item.variantName)})`
                : '';

            if (is58) {
              return `
              <div class="item-block">
                <div class="bold text-xs">${escapeHtml(item.productName)}${variantText}</div>
                <div class="row text-xs">
                  <span>  ${item.quantity}x @ ${settings.currency} ${item.unitPrice.toLocaleString()}</span>
                  <span class="bold">${settings.currency} ${item.itemTotal.toLocaleString()}</span>
                </div>
                ${
                  item.addons && item.addons.length > 0
                    ? `<div class="addons text-xs pl-2">${item.addons.map((a) => `+ ${escapeHtml(a.name)} (${settings.currency} ${a.price})`).join('<br/>')}</div>`
                    : ''
                }
                ${item.notes ? `<div class="item-note text-xs bold pl-2">* Note: ${escapeHtml(item.notes)}</div>` : ''}
              </div>
            `;
            }

            return `
            <div class="item-block">
              <div class="row text-sm bold">
                <span style="width: 15%">${item.quantity}x</span>
                <span style="width: 60%">${escapeHtml(item.productName)}${variantText}</span>
                <span style="width: 25%" class="right">${settings.currency} ${item.itemTotal.toLocaleString()}</span>
              </div>
              ${
                item.addons && item.addons.length > 0
                  ? `<div class="addons text-xs pl-4">${item.addons.map((a) => `+ ${escapeHtml(a.name)} (${settings.currency} ${a.price})`).join('<br/>')}</div>`
                  : ''
              }
              ${item.notes ? `<div class="item-note text-xs bold pl-4">* Note: ${escapeHtml(item.notes)}</div>` : ''}
            </div>
          `;
          })
          .join('')}
      </div>

      <div class="divider">${divider}</div>

      <!-- FINANCIAL SUMMARY -->
      <div class="financials text-sm">
        <div class="row">
          <span>Subtotal:</span>
          <span>${settings.currency} ${order.subtotal.toLocaleString()}</span>
        </div>
        ${
          order.discountAmount > 0
            ? `
          <div class="row bold">
            <span>Discount:</span>
            <span>-${settings.currency} ${order.discountAmount.toLocaleString()}</span>
          </div>
        `
            : ''
        }
        ${
          order.deliveryFee > 0
            ? `
          <div class="row">
            <span>Delivery Fee:</span>
            <span>+${settings.currency} ${order.deliveryFee.toLocaleString()}</span>
          </div>
        `
            : ''
        }
        ${
          order.taxAmount > 0
            ? `
          <div class="row">
            <span>Tax:</span>
            <span>+${settings.currency} ${order.taxAmount.toLocaleString()}</span>
          </div>
        `
            : ''
        }
        <div class="divider">${divider}</div>
        <div class="row bold grand-total">
          <span>NET TOTAL:</span>
          <span>${settings.currency} ${order.total.toLocaleString()}</span>
        </div>
        <div class="row text-xs mt-1">
          <span>Paid via ${escapeHtml(order.paymentMethod.toUpperCase())}:</span>
          <span class="bold">${settings.currency} ${order.paidAmount.toLocaleString()}</span>
        </div>
        ${
          order.dueAmount > 0
            ? `
          <div class="row bold text-sm mt-1">
            <span>Balance Due:</span>
            <span>${settings.currency} ${order.dueAmount.toLocaleString()}</span>
          </div>
        `
            : ''
        }
      </div>

      ${
        order.notes
          ? `
        <div class="divider">${divider}</div>
        <div class="text-xs">
          <strong>INSTRUCTIONS:</strong> ${escapeHtml(order.notes)}
        </div>
      `
          : ''
      }

      <div class="divider">${divider}</div>

      <!-- FOOTER & DEVELOPER ADVERTISING -->
      <div class="center text-xs footer">
        <div class="bold">${escapeHtml(settings.receiptFooter || 'Thank you for choosing Tokyo Crunch! Please visit again.')}</div>
        <div>Fresh Quality · Crispy Chicken · Halal</div>
        <div class="divider mt-1">${divider}</div>
        <div class="bold text-sm tracking-wide">
          Powered by Soft Inc Developers.  Haider Islam 03126980431
        </div>
        <div class="text-xs">
          Software Solutions · POS Systems · Custom Web &amp; Mobile Apps
        </div>
        <div class="text-xs mt-1">
          POS Ref: ${order.id.slice(-8).toUpperCase()}
        </div>
      </div>

      <!-- FEED LINES FOR AUTO-CUTTER -->
      <div style="height: ${Math.max(1, feedLines) * 8}mm;"></div>
    </div>
  `;
}

export function generateKotHtml(
  order: Order,
  settings: RestaurantSettings,
  options?: ThermalPrintOptions
): string {
  const paperWidth = options?.paperWidth || settings.thermalPrinterWidth || '80mm';
  const is58 = paperWidth === '58mm';
  const feedLines = options?.feedLines ?? settings.thermalCutFeedLines ?? 2;

  const formattedDate = new Date(order.createdAt).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const divider = is58
    ? '--------------------------------'
    : '================================================';

  return `
    <div class="receipt-container kot-container ${is58 ? 'w-58' : 'w-80'}">
      <!-- KOT HEADER -->
      <div class="center bold kot-badge">*** KITCHEN TICKET (KOT) ***</div>
      <div class="divider">${divider}</div>

      <!-- HUGE ORDER & TABLE INFO FOR COOKS -->
      <div class="kot-hero">
        <div class="kot-order-num">ORDER #${escapeHtml(order.orderNumber)}</div>
        <div class="kot-type-badge">[${escapeHtml(order.type.replace('_', ' ').toUpperCase())}]</div>
      </div>

      ${
        order.tableNumber
          ? `
        <div class="kot-table-box center bold">
          TABLE: ${escapeHtml(order.tableNumber)}
        </div>
      `
          : ''
      }

      <div class="row text-sm bold mt-1">
        <span>TIME: ${escapeHtml(formattedDate)}</span>
        <span>SERVER: ${escapeHtml(order.cashierName || 'POS')}</span>
      </div>

      ${
        order.customerName && order.customerName !== 'Walk-in Customer'
          ? `<div class="text-xs bold mt-1">CUSTOMER: ${escapeHtml(order.customerName)}</div>`
          : ''
      }

      <div class="divider">${divider}</div>

      <!-- KITCHEN ITEMS (LARGE HIGH-CONTRAST FOR COOKS) -->
      <div class="kot-items-list">
        ${order.items
          .map((item) => {
            const variantText =
              item.variantName && item.variantName !== 'Standard'
                ? ` [${escapeHtml(item.variantName).toUpperCase()}]`
                : '';

            return `
            <div class="kot-item-row">
              <div class="kot-item-main">
                <span class="kot-item-qty">${item.quantity}X</span>
                <span class="kot-item-name">${escapeHtml(item.productName).toUpperCase()}${variantText}</span>
              </div>
              ${
                item.addons && item.addons.length > 0
                  ? `<div class="kot-addon-list">${item.addons.map((a) => `+ ${escapeHtml(a.name).toUpperCase()}`).join('<br/>')}</div>`
                  : ''
              }
              ${
                item.notes
                  ? `<div class="kot-note-box">*** NOTE: ${escapeHtml(item.notes).toUpperCase()} ***</div>`
                  : ''
              }
            </div>
            <div class="divider-sub">--------------------------------</div>
          `;
          })
          .join('')}
      </div>

      <!-- SPECIAL ORDER INSTRUCTIONS -->
      ${
        order.notes
          ? `
        <div class="kot-special-note">
          <div class="bold">⚠️ SPECIAL KITCHEN INSTRUCTIONS:</div>
          <div>${escapeHtml(order.notes).toUpperCase()}</div>
        </div>
        <div class="divider">${divider}</div>
      `
          : ''
      }

      <div class="center bold kot-footer">
        --- END OF KITCHEN ORDER ---
      </div>

      <!-- CUT MARGIN -->
      <div style="height: ${Math.max(1, feedLines) * 8}mm;"></div>
    </div>
  `;
}

/**
 * Universal Direct Thermal Print Execution via Isolated IFrame
 */
export function printThermalDirect(
  htmlContent: string,
  paperWidth: '80mm' | '58mm' = '80mm'
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const is58 = paperWidth === '58mm';
      const actualWidth = is58 ? '48mm' : '72mm';
      const pageSize = is58 ? '58mm auto' : '80mm auto';

      let iframe = document.getElementById('tokyo-thermal-print-frame') as HTMLIFrameElement;
      if (iframe) {
        iframe.remove();
      }

      iframe = document.createElement('iframe');
      iframe.id = 'tokyo-thermal-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '100px';
      iframe.style.height = '100px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        resolve(true);
        return;
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Thermal Print</title>
          <style>
            @page {
              margin: 0 !important;
              size: ${pageSize} !important;
            }
            *, *::before, *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'JetBrains Mono', 'Courier New', Courier, monospace !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .receipt-container {
              width: ${actualWidth} !important;
              max-width: ${actualWidth} !important;
              margin: 0 !important;
              padding: 1.5mm 1mm !important;
              color: #000000 !important;
              background: #ffffff !important;
              font-size: ${is58 ? '9.5px' : '11px'};
              line-height: 1.25;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .brand-name { font-size: ${is58 ? '13px' : '15px'}; font-weight: 900; letter-spacing: 0.5px; }
            .text-sm { font-size: ${is58 ? '9px' : '10px'}; }
            .text-xs { font-size: ${is58 ? '8.5px' : '9px'}; }
            .row { display: flex; justify-content: space-between; align-items: baseline; }
            .meta-section { line-height: 1.35; }
            .divider {
              white-space: pre;
              overflow: hidden;
              margin: 1.5mm 0;
              font-weight: bold;
              font-size: 10px;
              line-height: 1;
              color: #000000;
            }
            .divider-sub {
              white-space: pre;
              overflow: hidden;
              margin: 1mm 0;
              font-size: 9px;
              color: #000000;
            }
            .items-list { margin: 1mm 0; }
            .item-block { margin-bottom: 1.5mm; }
            .addons { font-style: italic; }
            .grand-total { font-size: ${is58 ? '13px' : '14px'}; font-weight: 900; margin: 1mm 0; }
            .footer { margin-top: 1.5mm; line-height: 1.2; }

            /* KITCHEN SPECIFIC STYLES */
            .kot-container {
              font-size: ${is58 ? '11px' : '12.5px'};
            }
            .kot-badge {
              font-size: ${is58 ? '12px' : '14px'};
              font-weight: 900;
              letter-spacing: 1px;
            }
            .kot-hero {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 1mm 0;
            }
            .kot-order-num {
              font-size: ${is58 ? '15px' : '18px'};
              font-weight: 900;
            }
            .kot-type-badge {
              font-size: ${is58 ? '12px' : '14px'};
              font-weight: 900;
            }
            .kot-table-box {
              font-size: ${is58 ? '16px' : '20px'};
              font-weight: 900;
              border: 2px solid #000000;
              padding: 1.5mm 0;
              margin: 1.5mm 0;
            }
            .kot-item-row {
              margin: 1.5mm 0;
            }
            .kot-item-main {
              display: flex;
              align-items: baseline;
              font-weight: 900;
              font-size: ${is58 ? '12px' : '14px'};
            }
            .kot-item-qty {
              display: inline-block;
              width: ${is58 ? '26px' : '32px'};
              font-weight: 900;
              font-size: ${is58 ? '13px' : '15px'};
            }
            .kot-item-name {
              flex: 1;
            }
            .kot-addon-list {
              padding-left: ${is58 ? '26px' : '32px'};
              font-size: ${is58 ? '10px' : '11px'};
              font-weight: bold;
            }
            .kot-note-box {
              padding-left: ${is58 ? '26px' : '32px'};
              font-size: ${is58 ? '10px' : '11px'};
              font-weight: 900;
              margin-top: 0.5mm;
            }
            .kot-special-note {
              border: 1.5px solid #000000;
              padding: 1.5mm;
              margin: 1.5mm 0;
              font-size: ${is58 ? '10px' : '11px'};
            }
            .kot-footer {
              font-size: ${is58 ? '10px' : '11px'};
              margin-top: 1mm;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.warn('Iframe print failed, falling back to window.print', e);
          window.print();
          resolve(true);
        }
      }, 250);
    } catch (err) {
      console.error('Direct thermal print error', err);
      window.print();
      resolve(false);
    }
  });
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
