const CATALOGUE = {
  "Feel Dry Washable Quick-Drying Sheet": { sizes: { S: 165, M: 300, L: 545, XL: 1200 }, colours: ["Pink", "Blue", "Maroon", "Pista", "Red", "Rose"] },
  "Feel Dry Washable Quick-Drying Sheets": { sizes: { S: 165, M: 300, L: 545, XL: 1200 }, colours: ["Pink", "Blue", "Maroon", "Pista", "Red", "Rose"] },
  "Double Colour Sterilizable Rubber Sheet": { sizes: { "90 × 100 cm": 400, "90 × 200 cm": 700, "90 × 300 cm": 900 }, colours: ["Pink & Blue"] },
  "Magic Mat Printed Sterilizable Rubber Sheet": { sizes: { "90 × 90 cm": 300, "90 × 180 cm": 500 }, colours: ["Pink printed", "Blue printed"] }
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export async function onRequestPost({ request, env }) {
  if (env.PAYMENTS_ENABLED !== "true") return json({ error: "Online payment setup is not enabled yet. Please send your order inquiry on WhatsApp." }, 503);
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ error: "Razorpay keys are not configured in Cloudflare." }, 503);
  if (env.SHIPPING_CHARGE_RUPEES === undefined || env.SHIPPING_CHARGE_RUPEES === "") return json({ error: "Delivery charges have not been configured yet." }, 503);
  try {
    const body = await request.json();
    const { cart, customer } = body || {};
    if (!Array.isArray(cart) || !cart.length || !customer?.name || !customer?.phone || !customer?.address || !customer?.city || !/^\d{6}$/.test(String(customer?.pin || ""))) return json({ error: "Please complete your delivery details and cart." }, 400);
    let subtotal = 0;
    const items = [];
    for (const line of cart) {
      const product = CATALOGUE[line.name];
      const qty = Number(line.qty);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 50 || !Object.prototype.hasOwnProperty.call(product.sizes, line.size) || !product.colours.includes(line.colour)) return json({ error: "A cart item is invalid. Please refresh the page and try again." }, 400);
      const unitPrice = product.sizes[line.size];
      subtotal += unitPrice * qty;
      items.push(`${line.name} | ${line.size} | ${line.colour} | Qty ${qty} | Rs ${unitPrice * qty}`);
    }
    const shipping = Number(env.SHIPPING_CHARGE_RUPEES);
    if (!Number.isFinite(shipping) || shipping < 0 || shipping > 100000) return json({ error: "The configured delivery charge is invalid." }, 500);
    const totalPaise = Math.round((subtotal + shipping) * 100);
    const notes = {
      customer_name: String(customer.name).slice(0, 255),
      customer_phone: String(customer.phone).slice(0, 255),
      customer_email: String(customer.email || "").slice(0, 255),
      delivery_address: `${customer.address}, ${customer.city} - ${customer.pin}`.slice(0, 255),
      items: items.join("\n").slice(0, 255),
      product_subtotal_inr: String(subtotal),
      shipping_charge_inr: String(shipping)
    };
    const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: totalPaise, currency: "INR", receipt: `dbh_${Date.now()}`.slice(0, 40), notes })
    });
    const result = await response.json();
    if (!response.ok) return json({ error: result?.error?.description || "Razorpay could not create the order." }, 502);
    return json({ orderId: result.id, amount: result.amount, currency: result.currency, keyId: env.RAZORPAY_KEY_ID, productSubtotal: subtotal, shippingCharge: shipping, total: subtotal + shipping });
  } catch (err) {
    return json({ error: "Could not start payment. Please try again or contact us on WhatsApp." }, 500);
  }
}
