
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function sendOrderEmail(env, order, payment) {
  if (
    !env.RESEND_API_KEY ||
    !env.ORDER_NOTIFICATION_EMAIL ||
    !env.ORDER_EMAIL_FROM
  ) {
    throw new Error("Order email configuration is incomplete.");
  }

  const notes = order.notes || {};
  const customerName = notes.customer_name || "Not provided";
  const customerPhone = notes.customer_phone || "Not provided";
  const customerEmail = notes.customer_email || "Not provided";
  const address = notes.delivery_address || "Not provided";
  const items = notes.items || "Please check the Razorpay order notes.";
  const subtotal = notes.product_subtotal_inr || (order.amount / 100);
  const shipping = notes.shipping_charge_inr || "0";
  const total = (order.amount / 100).toFixed(2);

  const html = `
    <h2>Bebehug - New Paid Order</h2>
    <p><strong>Payment status:</strong> Captured</p>
    <h3>Customer details</h3>
    <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
    <p><strong>Mobile:</strong> ${escapeHtml(customerPhone)}</p>
    <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
    <p><strong>Delivery address:</strong> ${escapeHtml(address)}</p>
    <h3>Order details</h3>
    <p>${escapeHtml(items)}</p>
    <p><strong>Products subtotal:</strong> ₹${escapeHtml(subtotal)}</p>
    <p><strong>Delivery:</strong> ₹${escapeHtml(shipping)}</p>
    <p><strong>Order total:</strong> ₹${escapeHtml(total)}</p>
    <p><strong>Razorpay order ID:</strong> ${escapeHtml(order.id)}</p>
    <p><strong>Razorpay payment ID:</strong> ${escapeHtml(payment.id)}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.ORDER_EMAIL_FROM,
      to: [env.ORDER_NOTIFICATION_EMAIL],
      subject: `Bebehug paid order - ${order.id}`,
      html,
      text: [
        "Bebehug - New Paid Order",
        `Customer: ${customerName}`,
        `Mobile: ${customerPhone}`,
        `Email: ${customerEmail}`,
        `Address: ${address}`,
        `Items: ${items}`,
        `Subtotal: INR ${subtotal}`,
        `Delivery: INR ${shipping}`,
        `Total: INR ${total}`,
        `Razorpay order ID: ${order.id}`,
        `Razorpay payment ID: ${payment.id}`
      ].join("\n")
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Resend error (${response.status}): ${
        result.message || result.name || "Email send failed"
      }`
    );
  }

  return result.id || null;
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

    // Verify Razorpay checkout signature.
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

    let mismatch = expectedSignature.length ^ received.length;

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

    // Retrieve payment from Razorpay.
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

    // Retrieve original server-created order and its customer notes.
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

    if (payment.order_id !== order.id || order.id !== orderId) {
      return json({
        verified: false,
        error: "The payment does not match this order."
      }, 400);
    }

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

    if (order.status !== "paid") {
      return json({
        verified: false,
        error: "Payment is captured, but the order status is not paid yet."
      }, 409);
    }

    // Payment is verified. Email failure must not falsely reject payment.
    let emailSent = false;
    let emailError = null;
    let emailId = null;

    try {
      emailId = await sendOrderEmail(env, order, payment);
      emailSent = true;
    } catch (error) {
      emailError = String(error?.message || "Unknown email error");
      console.error("Bebehug order email failed:", emailError);
    }

    return json({
      verified: true,
      status: "captured",
      paymentId: payment.id,
      orderId: order.id,
      amount: payment.amount,
      currency: payment.currency,
      emailSent,
      emailId,
      emailError
    });

  } catch (error) {
    console.error("Payment verification error:", error);

    return json({
      verified: false,
      error: "Could not verify the payment. Please contact support."
    }, 500);
  }
}
