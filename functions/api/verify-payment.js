const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export async function onRequestPost({ request, env }) {
  if (env.PAYMENTS_ENABLED !== "true" || !env.RAZORPAY_KEY_SECRET) return json({ error: "Payment verification is not configured." }, 503);
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(v => typeof v === "string" && v.length > 0)) return json({ error: "Missing payment verification details." }, 400);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.RAZORPAY_KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${razorpay_order_id}|${razorpay_payment_id}`));
    const expected = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join("");
    if (expected.length !== razorpay_signature.length) return json({ error: "Payment signature did not match." }, 400);
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ razorpay_signature.charCodeAt(i);
    if (mismatch !== 0) return json({ error: "Payment signature did not match." }, 400);
    const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, { headers: { "Authorization": `Basic ${auth}` } });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || payment.order_id !== razorpay_order_id) return json({ error: "Could not confirm this payment with Razorpay. Please contact support before retrying." }, 502);
    if (payment.status !== "captured" && payment.captured !== true) return json({ error: `Razorpay payment status is ${payment.status || "pending"}. Please contact support before paying again.` }, 409);
    return json({ verified: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id, message: "Payment signature and captured status verified." });
  } catch (err) {
    return json({ error: "Could not verify payment. Please contact support before retrying." }, 500);
  }
}
