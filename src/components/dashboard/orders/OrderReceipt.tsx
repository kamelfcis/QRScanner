'use client';

import { getRestaurantDisplayName } from '@/lib/appName';
import { formatLocaleDate } from '@/lib/dateLocale';
import { formatCurrencyAmount, type CurrencyLocale } from '@/lib/order/format-currency';
import { isOstolThermalReceipt, receiptDomId, RECEIPT_SLIP_CSS } from '@/lib/order/print-receipt';
import { formatDisplayPhone } from '@/lib/phone/normalize';
import { getLocalizedText } from '@/lib/utils';
import type { OrderWithItems, RestaurantSettings } from '@/types/database';

type ReceiptCopy = (key: string, values?: Record<string, string | number>) => string;

interface OrderReceiptProps {
  order: OrderWithItems;
  settings?: RestaurantSettings | null;
  locale: string;
  currencyLocale: CurrencyLocale;
  t: ReceiptCopy;
}

function money(amount: number, currency: string, locale: CurrencyLocale): string {
  return formatCurrencyAmount(amount, currency, { locale, plain: true });
}

function ReceiptPair({
  start,
  end,
  startClassName,
  endClassName,
  style,
}: {
  start: React.ReactNode;
  end: React.ReactNode;
  startClassName?: string;
  endClassName?: string;
  style?: React.CSSProperties;
}) {
  if (isOstolThermalReceipt) {
    return (
      <table className="receipt-line" width="100%" style={style}>
        <tbody>
          <tr>
            <td className={startClassName}>{start}</td>
            <td className={endClassName}>{end}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div className="receipt-row" style={style}>
      <span className={startClassName}>{start}</span>
      <span className={endClassName}>{end}</span>
    </div>
  );
}

export function OrderReceipt({ order, settings, locale, currencyLocale, t }: OrderReceiptProps) {
  const shopName = getRestaurantDisplayName(locale, settings);
  const address = settings
    ? getLocalizedText(locale, {
        en: settings.address_en,
        ar: settings.address_ar,
      })
    : '';
  const shopPhone = settings?.phone ? formatDisplayPhone(settings.phone) : '';
  const customerPhone = order.customer_phone ? formatDisplayPhone(order.customer_phone) : '';
  const fulfillment =
    order.fulfillment_type === 'delivery'
      ? t('delivery')
      : order.fulfillment_type === 'pickup'
        ? t('pickup')
        : order.dining_mode === 'dining'
          ? t('dining')
          : t('takeaway');

  return (
    <div
      id={receiptDomId(order.id)}
      className="order-receipt-slip"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <style>{RECEIPT_SLIP_CSS}</style>
      {settings?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- print/PDF needs a live img for html2canvas + iframe clone
        <img
          className="receipt-logo"
          src={settings.logo_url}
          alt=""
          {...(isOstolThermalReceipt ? {} : { width: 64, height: 64 })}
          crossOrigin="anonymous"
        />
      ) : null}
      <p className="receipt-shop">{shopName}</p>
      {address ? <p className="receipt-meta">{address}</p> : null}
      {shopPhone ? (
        <p className="receipt-meta receipt-phone" dir="ltr">
          {shopPhone}
        </p>
      ) : null}

      <hr className="receipt-rule" />

      <p className="receipt-order">{order.order_number}</p>
      <p className="receipt-meta">
        {formatLocaleDate(order.created_at, 'dd/MM/yyyy HH:mm', locale)}
      </p>
      <p className="receipt-meta">
        {fulfillment}
        {order.table_number ? ` · ${t('table')} ${order.table_number}` : ''}
      </p>
      {order.delivery_address ? <p className="receipt-meta">{order.delivery_address}</p> : null}

      <hr className="receipt-rule" />

      {order.items.map((item) => {
        const name = getLocalizedText(locale, {
          en: item.name_en,
          ar: item.name_ar,
          fr: item.name_fr,
          nl: item.name_nl,
        });
        const size =
          item.size_option === 'small'
            ? t('small')
            : item.size_option === 'large'
              ? t('large')
              : '';
        const lineTotal = Number(item.unit_price) * item.quantity;
        return (
          <div key={item.id} style={{ marginBottom: 6 }}>
            <ReceiptPair
              startClassName="receipt-item-name"
              endClassName="receipt-num"
              start={
                <>
                  <span className="receipt-num">{item.quantity}×</span> {name}
                  {size ? ` (${size})` : ''}
                </>
              }
              end={money(lineTotal, order.currency, currencyLocale)}
            />
            {isOstolThermalReceipt ? (
              <p className="receipt-unit receipt-num">
                {money(Number(item.unit_price), order.currency, currencyLocale)}
              </p>
            ) : (
              <div className="receipt-row">
                <span className="receipt-note receipt-num">
                  {money(Number(item.unit_price), order.currency, currencyLocale)}
                </span>
                <span />
              </div>
            )}
            {item.notes ? <span className="receipt-note">{item.notes}</span> : null}
          </div>
        );
      })}

      {order.notes ? <p className="receipt-note">{order.notes}</p> : null}

      <hr className="receipt-rule" />

      <ReceiptPair
        endClassName="receipt-num"
        start={t('receiptSubtotal')}
        end={money(Number(order.subtotal), order.currency, currencyLocale)}
      />
      {Number(order.discount_amount) > 0 ? (
        <ReceiptPair
          endClassName="receipt-num"
          start={
            order.coupon_code
              ? t('receiptDiscountCode', { code: order.coupon_code })
              : t('receiptDiscount')
          }
          end={`−${money(Number(order.discount_amount), order.currency, currencyLocale)}`}
        />
      ) : null}
      {Number(order.tax) > 0 ? (
        <ReceiptPair
          endClassName="receipt-num"
          start={t('receiptTax')}
          end={money(Number(order.tax), order.currency, currencyLocale)}
        />
      ) : null}
      {Number(order.service) > 0 ? (
        <ReceiptPair
          endClassName="receipt-num"
          start={t('receiptService')}
          end={money(Number(order.service), order.currency, currencyLocale)}
        />
      ) : null}
      {Number(order.delivery_fee) > 0 ? (
        <ReceiptPair
          endClassName="receipt-num"
          start={t('receiptDelivery')}
          end={money(Number(order.delivery_fee), order.currency, currencyLocale)}
        />
      ) : null}

      <hr className="receipt-rule-double" />
      <ReceiptPair
        startClassName="receipt-total-label"
        endClassName="receipt-total-value receipt-num"
        start={t('receiptTotal')}
        end={money(Number(order.total), order.currency, currencyLocale)}
      />
      {order.payment_method ? (
        <>
          <ReceiptPair
            style={{ marginTop: 6 }}
            start={t('paymentMethodLabel')}
            end={t(`paymentMethod.${order.payment_method}`)}
          />
          {order.payment_method === 'cash' ? (
            <>
              <ReceiptPair
                endClassName="receipt-num"
                start={t('paymentAmountReceived')}
                end={money(Number(order.amount_received ?? 0), order.currency, currencyLocale)}
              />
              <ReceiptPair
                endClassName="receipt-num"
                start={t('paymentChangeDue')}
                end={money(Number(order.change_due ?? 0), order.currency, currencyLocale)}
              />
            </>
          ) : null}
        </>
      ) : null}
      <hr className="receipt-rule-double" />

      <p
        className="receipt-meta"
        style={{ textAlign: isOstolThermalReceipt ? 'center' : 'start', marginTop: 8 }}
      >
        {order.customer_name}
      </p>
      {customerPhone ? (
        <p className="receipt-meta receipt-phone" dir="ltr">
          {customerPhone}
        </p>
      ) : null}

      <p className="receipt-thanks">{t('receiptThanks')}</p>
      <p className="receipt-dots">· · ·</p>
    </div>
  );
}
