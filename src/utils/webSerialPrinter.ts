/**
 * Web Serial Thermal Printer Driver (Direct ESC/POS)
 * Zero browser dialogs, Zero second windows, 100% silent direct hardware printing.
 * Works natively in Brave Browser, Chrome, and Edge on Vercel deployments!
 */

import { Order, RestaurantSettings } from '../types';

let serialPort: any = null;
let isConnecting = false;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isWebSerialConnected(): boolean {
  return serialPort !== null && serialPort.readable !== null;
}

/**
 * Prompt user to select their USB / Serial Thermal Printer
 */
export async function connectWebSerialPrinter(): Promise<{ success: boolean; message: string }> {
  if (!isWebSerialSupported()) {
    return {
      success: false,
      message: 'Web Serial is not supported in this browser. Please use Brave or Chrome on Desktop.',
    };
  }

  if (isConnecting) {
    return { success: false, message: 'Connection already in progress.' };
  }

  isConnecting = true;
  try {
    const nav = navigator as any;
    // Prompt cashier to pick the USB thermal printer from the system dialog
    const port = await nav.serial.requestPort();
    
    // Most POS thermal receipt printers run at 9600 or 115200 baud
    try {
      await port.open({ baudRate: 9600 });
    } catch (openErr: any) {
      // If already open or different baud, try 115200
      if (!port.readable) {
        await port.open({ baudRate: 115200 });
      }
    }

    serialPort = port;
    isConnecting = false;
    return {
      success: true,
      message: 'USB Thermal Printer connected successfully! Direct silent printing is now active.',
    };
  } catch (err: any) {
    isConnecting = false;
    if (err.name === 'NotFoundError') {
      return { success: false, message: 'No printer selected.' };
    }
    return { success: false, message: err.message || 'Failed to connect to USB printer.' };
  }
}

/**
 * Disconnect current Web Serial port
 */
export async function disconnectWebSerialPrinter(): Promise<void> {
  if (serialPort) {
    try {
      await serialPort.close();
    } catch (e) {
      console.warn('Error closing serial port', e);
    }
    serialPort = null;
  }
}

/**
 * Send raw binary ESC/POS buffer directly to the thermal printer
 */
export async function writeEscPosBytes(data: Uint8Array): Promise<boolean> {
  if (!serialPort || !serialPort.writable) {
    return false;
  }

  try {
    const writer = serialPort.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    return true;
  } catch (err) {
    console.error('Failed to write ESC/POS data to printer', err);
    return false;
  }
}

/**
 * Simple ESC/POS Command Builder
 */
class EscPosBuilder {
  private buffer: number[] = [];
  private cols: number = 42; // Standard 80mm roll is 42-48 columns, 58mm is 32 columns

  constructor(is58: boolean = false) {
    this.cols = is58 ? 32 : 42;
    this.init();
  }

  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize)
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  doubleSize(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // GS ! n
    return this;
  }

  doubleHeight(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  text(str: string): this {
    // Convert string to ASCII / CP437 bytes
    const cleanStr = str.replace(/[^\x20-\x7E\n\r]/g, ' ');
    for (let i = 0; i < cleanStr.length; i++) {
      this.buffer.push(cleanStr.charCodeAt(i));
    }
    return this;
  }

  line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  divider(char: string = '-'): this {
    this.line(char.repeat(this.cols));
    return this;
  }

  twoColumnRow(left: string, right: string, padChar: string = ' '): this {
    const spaceNeeded = this.cols - left.length - right.length;
    if (spaceNeeded <= 0) {
      const maxLeft = Math.max(1, this.cols - right.length - 1);
      const trimmedLeft = left.substring(0, maxLeft);
      this.line(trimmedLeft + ' ' + right);
    } else {
      this.line(left + padChar.repeat(spaceNeeded) + right);
    }
    return this;
  }

  feed(lines: number = 2): this {
    this.buffer.push(0x1b, 0x64, Math.max(1, lines)); // ESC d n
    return this;
  }

  cut(full: boolean = false): this {
    this.feed(3);
    if (full) {
      this.buffer.push(0x1d, 0x56, 0x00); // Full cut
    } else {
      this.buffer.push(0x1d, 0x56, 0x41, 0x00); // Partial cut with feed
    }
    return this;
  }

  kickDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // Pulse pin 2
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Print standard customer receipt directly via Web Serial
 */
export async function printReceiptWebSerial(
  order: Order,
  settings: RestaurantSettings,
  options?: { paperWidth?: '80mm' | '58mm'; feedLines?: number }
): Promise<boolean> {
  if (!isWebSerialConnected()) return false;

  const is58 = (options?.paperWidth || settings.thermalPrinterWidth) === '58mm';
  const currency = settings.currency || 'Rs.';
  const builder = new EscPosBuilder(is58);

  // 1. Header
  builder.alignCenter();
  builder.bold(true);
  builder.doubleSize(true);
  builder.line(settings.name || 'TOKYO CRUNCH');
  builder.doubleSize(false);
  builder.bold(false);

  if (settings.tagline) {
    builder.line(settings.tagline);
  }
  if (settings.phone) {
    builder.line(`Tel: ${settings.phone}`);
  }
  if (settings.location) {
    builder.line(settings.location);
  }
  if (settings.receiptHeader) {
    builder.line(settings.receiptHeader);
  }

  builder.divider('=');

  // 2. Order Metadata
  builder.bold(true);
  builder.doubleHeight(true);
  builder.line(`ORDER #${order.orderNumber}`);
  builder.doubleHeight(false);
  builder.bold(false);

  const orderDate = new Date(order.createdAt).toLocaleString('en-PK', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  builder.alignLeft();
  builder.twoColumnRow(`Date: ${orderDate}`, `Type: ${(order.type || 'dine_in').toUpperCase()}`);
  if (order.tableNumber) {
    builder.twoColumnRow(`Table: ${order.tableNumber}`, '');
  }
  if (order.customerName) {
    builder.twoColumnRow(`Customer: ${order.customerName}`, order.customerPhone || '');
  }
  if (order.cashierName) {
    builder.line(`Cashier: ${order.cashierName}`);
  }

  builder.divider('-');

  // 3. Items Header
  builder.bold(true);
  builder.twoColumnRow('ITEM [QTY]', 'TOTAL');
  builder.bold(false);
  builder.divider('-');

  // 4. Items List
  for (const item of order.items) {
    const itemName = `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
    const leftText = `${item.quantity}x ${itemName}`;
    const rightText = `${currency} ${item.itemTotal.toLocaleString()}`;
    builder.bold(true);
    builder.twoColumnRow(leftText, rightText);
    builder.bold(false);

    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        builder.twoColumnRow(`  + ${addon.name}`, `${currency} ${addon.price}`);
      }
    }
    if (item.notes) {
      builder.line(`  * Note: ${item.notes}`);
    }
  }

  builder.divider('-');

  // 5. Totals
  builder.alignLeft();
  builder.twoColumnRow('Subtotal:', `${currency} ${order.subtotal.toLocaleString()}`);
  if (order.discountAmount && order.discountAmount > 0) {
    builder.twoColumnRow('Discount:', `-${currency} ${order.discountAmount.toLocaleString()}`);
  }
  if (order.deliveryFee && order.deliveryFee > 0) {
    builder.twoColumnRow('Delivery Fee:', `${currency} ${order.deliveryFee.toLocaleString()}`);
  }
  if (order.taxAmount && order.taxAmount > 0) {
    builder.twoColumnRow('Tax:', `${currency} ${order.taxAmount.toLocaleString()}`);
  }

  builder.divider('=');
  builder.bold(true);
  builder.doubleHeight(true);
  builder.twoColumnRow('GRAND TOTAL:', `${currency} ${order.total.toLocaleString()}`);
  builder.doubleHeight(false);
  builder.bold(false);
  builder.divider('=');

  // 6. Payment info
  builder.twoColumnRow('Payment Method:', (order.paymentMethod || 'CASH').toUpperCase());
  if (order.paidAmount && order.paidAmount > 0) {
    builder.twoColumnRow('Paid Amount:', `${currency} ${order.paidAmount.toLocaleString()}`);
    const changeDue = order.paidAmount > order.total ? order.paidAmount - order.total : 0;
    if (changeDue > 0) {
      builder.bold(true);
      builder.twoColumnRow('Change Due:', `${currency} ${changeDue.toLocaleString()}`);
      builder.bold(false);
    }
  }

  // 7. Footer
  builder.feed(1);
  builder.alignCenter();
  if (settings.receiptFooter) {
    builder.line(settings.receiptFooter);
  } else {
    builder.line('Thank you for dining with us!');
    builder.line('Please visit us again!');
  }

  const feedCount = options?.feedLines ?? settings.thermalCutFeedLines ?? 2;
  builder.feed(feedCount);
  builder.cut(false);

  return await writeEscPosBytes(builder.getBytes());
}

/**
 * Print Kitchen KOT directly via Web Serial
 */
export async function printKotWebSerial(
  order: Order,
  settings: RestaurantSettings,
  options?: { paperWidth?: '80mm' | '58mm'; feedLines?: number }
): Promise<boolean> {
  if (!isWebSerialConnected()) return false;

  const is58 = (options?.paperWidth || settings.thermalPrinterWidth) === '58mm';
  const builder = new EscPosBuilder(is58);

  // KOT Header
  builder.alignCenter();
  builder.bold(true);
  builder.line('*** KITCHEN ORDER TICKET (KOT) ***');
  builder.doubleSize(true);
  builder.line(`ORDER #${order.orderNumber}`);
  builder.doubleSize(false);

  builder.divider('=');
  builder.alignLeft();
  builder.bold(true);
  builder.twoColumnRow(`TYPE: ${(order.type || 'dine_in').toUpperCase()}`, `ORDER: #${order.orderNumber}`);
  if (order.tableNumber) {
    builder.line(`>>> TABLE: ${order.tableNumber} <<<`);
  }
  builder.bold(false);

  const timeStr = new Date(order.createdAt).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });
  builder.line(`Time: ${timeStr} | Server: ${order.cashierName || 'POS'}`);
  builder.divider('=');

  // Items
  builder.bold(true);
  builder.line('QTY  ITEM DESCRIPTION');
  builder.divider('-');

  for (const item of order.items) {
    builder.doubleHeight(true);
    builder.bold(true);
    const itemName = `${item.productName}${item.variantName ? ` [${item.variantName}]` : ''}`;
    builder.line(`${item.quantity}x  ${itemName}`);
    builder.doubleHeight(false);
    builder.bold(false);

    if (item.addons && item.addons.length > 0) {
      for (const addon of item.addons) {
        builder.line(`     + ${addon.name}`);
      }
    }
    if (item.notes) {
      builder.bold(true);
      builder.line(`     *** NOTE: ${item.notes} ***`);
      builder.bold(false);
    }
    builder.line('');
  }

  builder.divider('=');
  builder.alignCenter();
  builder.line('--- END OF KITCHEN ORDER ---');

  const feedCount = options?.feedLines ?? settings.thermalCutFeedLines ?? 2;
  builder.feed(feedCount);
  builder.cut(false);

  return await writeEscPosBytes(builder.getBytes());
}
