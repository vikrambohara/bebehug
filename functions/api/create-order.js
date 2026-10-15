
const CATALOGUE = {
  "Feel Dry Washable Quick-Drying Sheet": {
    sizes: { S: 165, M: 300, L: 545, XL: 1200 },
    colours: ["Pink", "Blue", "Maroon", "Pista", "Red", "Rose"]
  },
  "Feel Dry Washable Quick-Drying Sheets": {
    sizes: { S: 165, M: 300, L: 545, XL: 1200 },
    colours: ["Pink", "Blue", "Maroon", "Pista", "Red", "Rose"]
  },
  "Double Colour Sterilizable Rubber Sheet": {
    sizes: {
      "90 × 100 cm": 450,
      "90 × 200 cm": 800,
      "90 × 300 cm": 1050
    },
    colours: ["Pink & Blue"]
  },
  "Magic Mat Printed Sterilizable Rubber Sheet": {
    sizes: {
      "90 × 90 cm": 350,
      "90 × 180 cm": 550
    },
    colours: ["Pink printed", "Blue printed"]
  }
};

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
    return json({
      error: "Online payments are not enabled yet. Please contact us on WhatsApp."
    }, 503);
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return json({ error: "Payment configuration is incomplete." }, 503);
  }

  // Free delivery on every order.
  const shipping = 0;

  try {
    const body = await request.json();
    const { cart, customer } = body || {};

    if (
      !Array.isArray(cart) ||
      cart.length === 0 ||
      !customer?.name?.trim() ||
      !/^[6-9]\d{9}$/.test(String(customer?.phone || "")) ||
      !customer?.address?.trim() ||
      !customer?.city?.trim() ||
      !/^\d{6}$/.test(String(customer?.pin || ""))
    ) {
      return json({
        error: "Enter your name, valid 10-digit mobile number, address, city and 6-digit PIN code."
      }, 400);
    }

    let subtotal = 0;
    const items = [];

    for (const line of cart) {
      const product = CATALOGUE[line.name];
      const qty = Number(line.qty);

      if (
        !product ||
        !Number.isInteger(qty) ||
        qty < 1 ||
        qty > 50 ||
        !Object.prototype.hasOwnProperty.call(product.sizes, line.size) ||
        !product.colours.includes(line.colour)
      ) {
        return json({
          error: "A product, size, colour or quantity is invalid. Please refresh your cart."
        }, 400);
      }

      const unitPrice = product.sizes[line.size];
      subtotal += unitPrice * qty;

      items.push(
        `${line.name} | ${line.size} | ${line.colour} | Qty ${qty}`
      );
    }

    const totalPaise = subtotal * 100;

    const notes = {
      customer_name: String(customer.name).slice(0, 255),
      customer_phone: String(customer.phone).slice(0, 255),
      customer_email: String(customer.email || "").slice(0, 255),
      delivery_address:
        `${customer.address}, ${customer.city} - ${customer.pin}`.slice(0, 255),
      items: items.join("; ").slice(0, 255),
      product_subtotal_inr: String(subtotal),
      shipping_charge_inr: "0"
    };

    const auth = btoa(
      `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
    );

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: totalPaise,
        currency: "INR",
        receipt: `bh_${Date.now()}`.slice(0, 40),
        notes
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return json({
        error: "Razorpay could not create the order. Please try again."
      }, 502);
    }

    return json({
      orderId: result.id,
      amount: result.amount,
      currency: result.currency,
      keyId: env.RAZORPAY_KEY_ID,
      productSubtotal: subtotal,
      shippingCharge: 0,
      total: subtotal
    });
  } catch (error) {
    return json({
      error: "Unable to start payment. Please try again or contact us on WhatsApp."
    }, 500);
  }
}
