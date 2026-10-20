
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

async function razorpayRequest(path, env) {
  const credentials = btoa(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
  );

  return fetch(`https://api.razorpay.com/v1${path}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (env.PAYMENTS_ENABLED !== "true") {
    return json({
      verified: false,
      error: "Online payments are not enabled."
    }, 503);
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return json({
      verified: false,
      error: "Payment verification is not configured."
    }, 503);
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
      return json({
        verified: false,
        error: "Invalid payment details."
      }, 400);
    }

    // 1. Verify Razorpay's checkout signature.
    const encoder = new TextEncoder();

    const hmacKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      encoder.encode(`${orderId}|${paymentId}`)
    );

    const expectedSignature = Array.from(
      new Uint8Array(signatureBytes)
    )
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    const received = signature.toLowerCase();

    let mismatch =
      expectedSignature.length ^ received.length;

    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |=
        expectedSignature.charCodeAt(i) ^
        (received.charCodeAt(i) || 0);
    }

    if (mismatch !== 0) {
      return json({
        verified: false,
        error: "Payment signature verification failed."
      }, 400);
    }

    // 2. Fetch the payment directly from Razorpay.
    const paymentResponse = await razorpayRequest(
      `/payments/${encodeURIComponent(paymentId)}`,
      env
    );

    if (!paymentResponse.ok) {
      return json({
        verified: false,
        error: "Could not confirm payment with Razorpay."
      }, 502);
    }

    const payment = await paymentResponse.json();

    // 3. Fetch the original server-created Razorpay order.
    const orderResponse = await razorpayRequest(
      `/orders/${encodeURIComponent(orderId)}`,
      env
    );

    if (!orderResponse.ok) {
      return json({
        verified: false,
        error: "Could not confirm the original order with Razorpay."
      }, 502);
    }

    const order = await orderResponse.json();

    // 4. Ensure payment and order match.
    if (
      payment.order_id !== order.id ||
      order.id !== orderId
    ) {
      return json({
        verified: false,
        error: "The payment does not match this order."
      }, 400);
    }

    // 5. Confirm amount and currency against the original order.
    if (
      !Number.isSafeInteger(payment.amount) ||
      !Number.isSafeInteger(order.amount) ||
      payment.amount !== order.amount ||
      payment.currency !== order.currency ||
      order.currency !== "INR"
    ) {
      return json({
        verified: false,
        error: "Payment amount or currency does not match the order."
      }, 400);
    }

    // 6. Only a captured payment counts as a completed payment.
    if (payment.status !== "captured") {
      return json({
        verified: false,
        pending: payment.status === "authorized",
        status: payment.status,
        error:
          payment.status === "authorized"
            ? "Payment is authorized but not captured yet."
            : "Payment has not been captured successfully."
      }, 409);
    }

    // 7. Confirm Razorpay considers the order paid.
    if (order.status !== "paid") {
      return json({
        verified: false,
        error: "Payment is captured, but the order status is not paid yet."
      }, 409);
    }

    // 8. Return verified payment details to the checkout page.
    return json({
      verified: true,
      status: "captured",
      paymentId: payment.id,
      orderId: order.id,
      amount: payment.amount,
      currency: payment.currency
    });

  } catch (error) {
    return json({
      verified: false,
      error: "Could not verify the payment. Please contact support."
    }, 500);
  }
}
