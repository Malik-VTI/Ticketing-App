'use strict';

/**
 * Mengekspos sejumlah field bisnis sebagai response header `X-DT-*` agar bisa
 * ditangkap Dynatrace OneAgent sebagai Request Attribute (source: RESPONSE_HEADER).
 *
 * Kenapa lewat header, bukan langsung dari body JSON:
 * OneAgent tidak mem-parsing body JSON (hanya form-urlencoded), sehingga field
 * seperti booking_type / payment_method mustahil ditangkap tanpa bantuan aplikasi.
 * Selain itu booking-service & payment-service ditulis dengan Go, dan Go sama
 * sekali tidak mendukung request attribute — jadi gateway inilah satu-satunya
 * titik tangkap yang tersedia untuk data bisnis tersebut.
 *
 * Header ini TIDAK didaftarkan di Access-Control-Expose-Headers, jadi JavaScript
 * di browser tidak bisa membacanya. OneAgent membacanya di sisi server.
 *
 * Definisi request attribute yang memakai header ini:
 *   deployments/dynatrace/request-attributes/ra-13..ra-22*.json
 * Dokumentasi lengkap: docs/DYNATRACE-REQUEST-ATTRIBUTES.md
 */

const HEADER = {
  operation: 'X-DT-Operation',
  userId: 'X-DT-User-Id',
  bookingType: 'X-DT-Booking-Type',
  bookingRef: 'X-DT-Booking-Ref',
  bookingStatus: 'X-DT-Booking-Status',
  itemCount: 'X-DT-Item-Count',
  paymentMethod: 'X-DT-Payment-Method',
  paymentStatus: 'X-DT-Payment-Status',
  amount: 'X-DT-Amount',
  currency: 'X-DT-Currency',
  errorCode: 'X-DT-Error-Code',
};

// Nilai header harus ASCII satu baris dan tidak boleh kepanjangan.
const clean = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s || s.length > 120) return null;
  return /^[\x20-\x7E]+$/.test(s) ? s : null;
};

const setAttr = (res, header, value) => {
  const v = clean(value);
  if (v !== null && !res.headersSent) res.setHeader(header, v);
};

const operationOf = (req) => {
  const routePath = (req.route && req.route.path) || '';
  const full = `${req.baseUrl || ''}${routePath}`.replace(/\/+$/, '');
  return full ? `${req.method} ${full}` : `${req.method} ${req.path}`;
};

const enrich = (req, res, body) => {
  setAttr(res, HEADER.operation, operationOf(req));
  setAttr(res, HEADER.userId, req.user && req.user.id);

  if (!body || typeof body !== 'object') return;

  // Respons error dari service manapun: { error, message }
  if (body.error) setAttr(res, HEADER.errorCode, body.error);

  // BookingDTO — backend/booking-service/models/booking.go
  if (body.booking_reference) {
    setAttr(res, HEADER.bookingRef, body.booking_reference);
    setAttr(res, HEADER.bookingType, body.booking_type);
    setAttr(res, HEADER.bookingStatus, body.status);
    setAttr(res, HEADER.amount, body.total_amount);
    setAttr(res, HEADER.currency, body.currency);
    if (Array.isArray(body.items)) setAttr(res, HEADER.itemCount, body.items.length);
    return;
  }

  // PaymentDTO — backend/payment-service/models/payment.go
  if (body.payment_method) {
    setAttr(res, HEADER.paymentMethod, body.payment_method);
    setAttr(res, HEADER.paymentStatus, body.status);
    setAttr(res, HEADER.amount, body.amount);
    setAttr(res, HEADER.currency, body.currency);
  }
};

/**
 * Membungkus res.json agar payload balikan service hilir bisa dibaca sebelum
 * dikirim. Kegagalan di sini tidak boleh menjatuhkan request — observability
 * tidak pernah menjadi alasan sebuah booking gagal.
 */
const dtAttributes = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      enrich(req, res, body);
    } catch {
      // sengaja diabaikan: jalur bisnis harus tetap jalan
    }
    return originalJson(body);
  };
  next();
};

module.exports = { dtAttributes, HEADER };
