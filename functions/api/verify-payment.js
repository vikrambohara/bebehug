
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export async function onRequestPost({ request, env }) {
  if (env.PAYMENTS_ENABLED !== "true") {
    return json({ error: "Online payments are not enabled yet." }, 503);
  }

  if (!env.RAZORPAY_KEY_SECRET) {
    return json({ error: "Payment verification is not configured." }, 503);
  }

  try {
    const body = await request.json();

    const paymentId = String(body?.razorpay_payment_id || "");
    const orderId = String(body?.razorpay_order_id || "");
    const signature = String(body?.razorpay_signature || "");

    if (
      !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
      !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      !/^[a-f0-9]{64}$/i.test(signature)
    ) {
      return json({ verified: false, error: "Invalid payment details." }, 400);
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signedBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${orderId}|${paymentId}`)
    );

    const expectedSignature = Array.from(new Uint8Array(signedBytes))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    const a = encoder.encode(expectedSignature.toLowerCase());
    const b = encoder.encode(signature.toLowerCase());

    let difference = a.length ^ b.length;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      difference |= a[i] ^ b[i];
    }

    if (difference !== 0) {
      return json({
        verified: false,
        error: "Payment signature verification failed."
      }, 400);
    }

    // Signature verified. The checkout must still confirm the payment
    // status and amount before treating the order as paid.
    const auth = btoa(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
    );

    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    if (!paymentResponse.ok) {
      return json({
        verified: false,
        error: "Unable to confirm payment status with Razorpay."
      }, 502);
    }

    const payment = await paymentResponse.json();

    if (
      payment.order_id !== orderId ||
      !["captured", "authorized"].includes(payment.status)
    ) {
      return json({
        verified: false,
        error: "Payment is not confirmed yet."
      }, 400);
    }

    if (payment.status !== "captured") {
      return json({
        verified: false,
        pending: true,
        error: "Payment is authorized but not captured yet."
      }, 409);
    }

    return json({
      verified: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      status: payment.status
    });
  } catch (error) {
    return json({
      verified: false,
      error: "Could not verify the payment. Please contact support."
    }, 500);
  }
}
