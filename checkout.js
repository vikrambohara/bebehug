
const CART_KEY = "drbohrras_baby_cart_v1";

let cart = [];

const $ = id => document.getElementById(id);

const money = value =>
  "₹" + Number(value || 0).toLocaleString("en-IN");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showMessage(message) {
  const box = $("checkout-message");
  if (box) box.textContent = message;
}

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    const parsed = JSON.parse(saved || "[]");

    cart = Array.isArray(parsed)
      ? parsed.filter(item =>
          item &&
          item.name &&
          Number(item.price) > 0 &&
          Number(item.qty) > 0
        )
      : [];
  } catch (error) {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function subtotal() {
  return cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );
}

function render() {
  const box = $("checkout-items");
  if (!box) return;

  if (!cart.length) {
    box.innerHTML =
      '<p>Your cart is empty. <a href="index.html#shop">Shop products</a>.</p>';
  } else {
    box.innerHTML = cart.map((item, index) => `
      <div class="checkout-item">
        <div>
          <b>${escapeHTML(item.name)}</b>
          <small>
            ${escapeHTML(item.size || "")} ·
            ${escapeHTML(item.colour || "")} ·
            Qty ${Number(item.qty)}
          </small>
        </div>
        <strong>
          ${money(Number(item.price) * Number(item.qty))}
        </strong>
        <button type="button" data-remove="${index}"
          aria-label="Remove item">×</button>
      </div>
    `).join("");

    box.querySelectorAll("[data-remove]").forEach(button => {
      button.addEventListener("click", () => {
        cart.splice(Number(button.dataset.remove), 1);
        saveCart();
        render();
      });
    });
  }

  const total = subtotal();

  if ($("checkout-subtotal")) {
    $("checkout-subtotal").textContent = money(total);
  }

  if ($("checkout-total")) {
    $("checkout-total").textContent = money(total);
  }

  if ($("checkout-shipping")) {
    $("checkout-shipping").textContent = "FREE";
  }
}

function getCustomer() {
  return {
    name: $("customer-name").value.trim(),
    phone: $("customer-phone").value.trim(),
    email: $("customer-email").value.trim(),
    address: $("customer-address").value.trim(),
    city: $("customer-city").value.trim(),
    pin: $("customer-pin").value.trim()
  };
}

function orderLines() {
  return cart.map(item =>
    `• ${item.name} | ${item.size || ""} | ${item.colour || ""} | Qty ${item.qty} | ${money(Number(item.price) * Number(item.qty))}`
  ).join("\n");
}

// Load the saved cart before displaying checkout.
loadCart();
render();

if (new URLSearchParams(location.search).get("added")) {
  showMessage("Added to your cart. Free delivery on every order.");
}

// WhatsApp order submission.
const form = $("checkout-form");

if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();

    loadCart();
    render();

    if (!cart.length) {
      showMessage("Your cart is empty. Please return to the shop and add products.");
      return;
    }

    if (!form.reportValidity()) return;

    const config = window.STORE_CONFIG || {};
    const number = String(config.whatsappNumber || "").replace(/\D/g, "");

    if (!number) {
      showMessage("WhatsApp is not configured. Please contact the store.");
      return;
    }

    const customer = getCustomer();

    const message =
      `Hello Dr.Bohrras, I would like to place an order.\n\n` +
      `${orderLines()}\n\n` +
      `Products subtotal: ${money(subtotal())}\n` +
      `Delivery: FREE\n` +
      `Order total: ${money(subtotal())}\n\n` +
      `Name: ${customer.name}\n` +
      `Mobile: ${customer.phone}\n` +
      `Email: ${customer.email || "Not provided"}\n` +
      `Address: ${customer.address}, ${customer.city} - ${customer.pin}\n\n` +
      `Please confirm availability and next steps.`;

    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  });
}

// Razorpay online payment.
const payButton = $("pay-online");

if (payButton) {
  payButton.addEventListener("click", async () => {
    loadCart();
    render();

    if (!form || !form.reportValidity()) return;

    if (!cart.length) {
      showMessage("Your cart is empty. Please add a product first.");
      return;
    }

    const config = window.STORE_CONFIG || {};

    if (!config.razorpayKeyId) {
      showMessage("Online payment is not configured. Please use WhatsApp.");
      return;
    }

    if (typeof window.Razorpay !== "function") {
      showMessage("Razorpay could not load. Refresh the page or use WhatsApp.");
      return;
    }

    const customer = getCustomer();
    const orderCart = cart.map(item => ({ ...item }));

    payButton.disabled = true;
    payButton.textContent = "Connecting securely…";
    showMessage("Creating your secure payment order…");

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: orderCart, customer })
      });

      const order = await response.json();

      if (!response.ok || !order.orderId || !order.amount) {
        throw new Error(order.error || "Could not create the payment order.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId || config.razorpayKeyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Dr.Bohrras Baby Care",
        description: "Baby-care products — free delivery",
        order_id: order.orderId,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone
        },
        notes: {
          customer_name: customer.name,
          customer_phone: customer.phone,
          delivery_address:
            `${customer.address}, ${customer.city} - ${customer.pin}`
        },
        theme: { color: "#123d69" },

        handler: async function (payment) {
          payButton.disabled = true;
          payButton.textContent = "Verifying payment…";
          showMessage("Verifying your payment securely. Please wait…");

          try {
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payment)
            });

            const result = await verifyResponse.json();

            if (!verifyResponse.ok || result.verified !== true) {
              throw new Error(result.error || "Payment verification is pending.");
            }

            localStorage.removeItem(CART_KEY);
            cart = [];
            render();

            showMessage(
              `Payment verified successfully. Reference: ${result.orderId || order.orderId}. Please save this reference.`
            );

            payButton.textContent = "Payment verified";

          } catch (error) {
            showMessage(
              `${error.message} Do not pay again until payment status is checked. Contact +91 98400 17107.`
            );
            payButton.disabled = false;
            payButton.textContent = "Retry payment verification";
          }
        },

        modal: {
          ondismiss: function () {
            showMessage(
              "Payment window closed. Check payment status before trying again."
            );
            payButton.disabled = false;
            payButton.textContent = "Pay securely with Razorpay →";
          }
        }
      });

      checkout.on("payment.failed", function (result) {
        const description =
          result.error?.description || "Razorpay reported a payment failure.";

        showMessage(
          `${description} Check your payment status before trying again. Contact +91 98400 17107 for assistance.`
        );

        payButton.disabled = false;
        payButton.textContent = "Pay securely with Razorpay →";
      });

      payButton.textContent = "Opening Razorpay…";
      checkout.open();

    } catch (error) {
      showMessage(error.message || "Could not start payment.");
      payButton.disabled = false;
      payButton.textContent = "Pay securely with Razorpay →";
    }
  });
}

