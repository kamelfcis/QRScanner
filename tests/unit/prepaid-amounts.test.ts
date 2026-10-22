import { describe, expect, it } from 'vitest';
import { buildWhatsAppMessage } from '@/lib/order/whatsapp-message';
import type { OrderTotals } from '@/lib/order/totals';
import {
  buildDeliveryProofRecord,
  canSubmitPaymentProof,
  computePrepaidAmounts,
  defaultPaymentMethod,
  isEgyptMobileNumber,
  paymentProofBlockReason,
  resolveConfiguredPaymentMethods,
} from '@/lib/payment/prepaid';

const totals: OrderTotals = {
  subtotal: 555,
  discount: 0,
  tax: 0,
  service: 0,
  deliveryFee: 65,
  total: 620,
  taxRate: 0,
  serviceRate: 0,
  applyTax: false,
  applyService: false,
};

describe('computePrepaidAmounts', () => {
  it('charges only the delivery fee when shipping is prepaid', () => {
    expect(computePrepaidAmounts(555, 65, 'shipping_only')).toEqual({
      productsTotal: 555,
      deliveryFee: 65,
      grandTotal: 620,
      amountDue: 65,
      remainingOnDelivery: 555,
    });
  });

  it('charges products plus delivery when paying in full', () => {
    expect(computePrepaidAmounts(555, 65, 'full')).toEqual({
      productsTotal: 555,
      deliveryFee: 65,
      grandTotal: 620,
      amountDue: 620,
      remainingOnDelivery: 0,
    });
  });

  it('rounds money and ignores negative inputs', () => {
    expect(computePrepaidAmounts(10.005, 1.004, 'full').grandTotal).toBe(11.01);
    expect(computePrepaidAmounts(-5, -2, 'shipping_only')).toMatchObject({
      productsTotal: 0,
      deliveryFee: 0,
      amountDue: 0,
      remainingOnDelivery: 0,
    });
  });
});

describe('resolveConfiguredPaymentMethods', () => {
  it('prefers the dashboard link and ignores an empty database value', () => {
    expect(
      resolveConfiguredPaymentMethods({
        instapayPaymentUrl: ' https://ipn.eg/altounsi ',
        envInstapayUrl: 'https://ipn.eg/fallback',
        vodafoneCashNumber: ' 01012345678 ',
      })
    ).toEqual({
      instapayValue: 'https://ipn.eg/altounsi',
      vodafoneNumber: '01012345678',
      methods: ['instapay', 'vodafone_cash'],
    });

    expect(
      resolveConfiguredPaymentMethods({
        instapayPaymentUrl: '   ',
        envInstapayUrl: 'https://ipn.eg/fallback',
        vodafoneCashNumber: '',
      }).instapayValue
    ).toBe('https://ipn.eg/fallback');
  });

  it('hides methods that are not configured', () => {
    expect(
      resolveConfiguredPaymentMethods({
        instapayPaymentUrl: '',
        envInstapayUrl: '',
        vodafoneCashNumber: '',
      }).methods
    ).toEqual([]);
  });
});

describe('defaultPaymentMethod', () => {
  it('defaults to Vodafone Cash when a wallet number is saved', () => {
    expect(defaultPaymentMethod(['instapay', 'vodafone_cash'], '01012345678')).toBe(
      'vodafone_cash'
    );
  });

  it('defaults to InstaPay when no wallet number is saved', () => {
    expect(defaultPaymentMethod(['instapay'], '')).toBe('instapay');
    expect(defaultPaymentMethod(['vodafone_cash'], '01012345678')).toBe('vodafone_cash');
    expect(defaultPaymentMethod([], '')).toBeNull();
  });
});

describe('payment proof submit gate', () => {
  it('blocks submit without a screenshot while a proof is required', () => {
    expect(
      canSubmitPaymentProof({ proofRequired: true, screenshotUrl: null, uploading: false })
    ).toBe(false);
    expect(
      canSubmitPaymentProof({
        proofRequired: true,
        screenshotUrl: 'https://cdn.example/proof.png',
        uploading: true,
      })
    ).toBe(false);
    expect(paymentProofBlockReason(true, '  ')).toBe('instapay_proof_required');
  });

  it('allows submit after upload, and when no proof is required', () => {
    expect(
      canSubmitPaymentProof({
        proofRequired: true,
        screenshotUrl: 'https://cdn.example/proof.png',
        uploading: false,
      })
    ).toBe(true);
    expect(
      canSubmitPaymentProof({ proofRequired: false, screenshotUrl: null, uploading: false })
    ).toBe(true);
    expect(paymentProofBlockReason(false, null)).toBeNull();
  });
});

describe('buildDeliveryProofRecord', () => {
  it('persists method, scope, amounts, zone, customer, and screenshot', () => {
    const row = buildDeliveryProofRecord({
      orderRef: 'MS-1-AB12',
      customerName: 'Ali',
      customerPhone: '01000000000',
      deliveryLocationId: 'zone-1',
      screenshotUrl: 'https://cdn.example/proof.png',
      amountNote: null,
      paymentMethod: 'vodafone_cash',
      prepaidScope: 'shipping_only',
      productsTotal: 555,
      deliveryFee: 65,
      amountDue: 65,
      remainingOnDelivery: 555,
    });

    expect(row).toMatchObject({
      payment_method: 'vodafone_cash',
      prepaid_scope: 'shipping_only',
      products_total: 555,
      delivery_fee: 65,
      amount_due: 65,
      remaining_on_delivery: 555,
      delivery_location_id: 'zone-1',
      customer_name: 'Ali',
      customer_phone: '01000000000',
      screenshot_url: 'https://cdn.example/proof.png',
    });
  });
});

describe('isEgyptMobileNumber', () => {
  it('accepts Egyptian mobiles and stores are validated without rewriting', () => {
    expect(isEgyptMobileNumber('01012345678')).toBe(true);
    expect(isEgyptMobileNumber('+20 10 1234 5678')).toBe(true);
    expect(isEgyptMobileNumber('01112345678')).toBe(true);
    expect(isEgyptMobileNumber('12345')).toBe(false);
    expect(isEgyptMobileNumber('')).toBe(false);
  });
});

describe('buildWhatsAppMessage payment proof', () => {
  it('includes the method, amount transferred now, remaining cash, and screenshot', () => {
    const message = buildWhatsAppMessage({
      locale: 'en',
      mode: 'takeaway',
      fulfillmentType: 'delivery',
      deliveryAddress: 'Nasr City',
      items: [{ name: 'Shirt', quantity: 1, unitPrice: 555 }],
      totals,
      currency: 'EGP',
      customerName: 'Ali',
      deliveryFee: 65,
      ecommerceDelivery: true,
      requiresInstapayProof: true,
      paymentMethod: 'vodafone_cash',
      amountDue: 65,
      remainingOnDelivery: 555,
      instapayScreenshotUrl: 'https://cdn.example.com/proof.png',
    });

    expect(message).toContain('Vodafone Cash');
    expect(message).toContain('Amount transferred now: 65 EGP');
    expect(message).toContain('Cash on delivery remaining: 555 EGP');
    expect(message).toContain('https://cdn.example.com/proof.png');
    expect(message).not.toContain('InstaPay:');
  });
});
