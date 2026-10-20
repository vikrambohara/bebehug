
const CART_KEY = "drbohrras_baby_cart_v1";

let cart = [];

try {
  cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  if (!Array.isArray(cart)) cart = [];
} catch (error) {
  cart = [];
}

const $ = id => document.getElementById(id);

const subtotal = () =>
  cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );

const money = value =>
  "₹" + Number(value || 0).toLocaleString("en-IN");

function showMessage(message) {
  const box = $("checkout-message");
  if (box) box.textContent = message;
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function render() {
  const box = $("checkout-items");
  if (!box) return;

  if (!cart.length) {
    box.innerHTML =
      '<p>Your cart is empty. <a href="index.html#shop">Shop products</a>.</p>';

    if ($("checkout-subtotal")) {
      $("checkout-subtotal").textContent = money(0);
    }

    if ($("checkout-total")) {
      $("checkout-total").textContent = money(0);
    }

    return;
  }

  box.innerHTML = cart.map((item, index) => `
    <div class="checkout-item">
      <div>
        <b>${escapeHTML(item.name || "Product")}</b>
        <small>
          ${escapeHTML(item.size || "")} ·
          ${escapeHTML(item.colour || "")} ·
          Qty ${Number(item.qty || 0)}
        </small>
      </div>

      <strong>${money(Number(item.price || 0) * Number(item.qty || 0))}</strong>

      <button type="button" data-remove="${index}" aria-label="Remove item">
        ×
      </button>
    </div>
  `).join("");

  if ($("checkout-subtotal")) {
    $("checkout-subtotal").textContent = money(subtotal());
  }

  // Delivery is free.
  if ($("checkout-total")) {
    $("checkout-total").textContent = money(subtotal());
  }

  box.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      cart.splice(Number(button.dataset.remove), 1);
      saveCart();
      render();
    });
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

render();

if (new URLSearchParams(location.search).get("added")) {
  showMessage("Added to your cart. Free delivery on every order.");
}

// Collect and validate customer details.
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

// WhatsApp order option.
const form = $("checkout-form");

if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();

    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    if (!form.reportValidity()) return;

    const config = window.STORE_CONFIG || {};
    const number = String(config.whatsappNumber || "").replace(/\D/g, "");

    if (!number) {
      alert("The store WhatsApp number has not been configured yet.");
      return;
    }

    const customer = getCustomer();

    const lines = cart.map(item =>
      `• ${item.name} | ${item.size} | ${item.colour} | Qty ${item.qty} | ${money(Number(item.price) * Number(item.qty))}`
    ).join("\n");

    const message =
      `Hello Dr.Bohrras, I would like to place an order.\n\n` +
      `${lines}\n\n` +
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
    if (!form || !form.reportValidity()) return;

    if (!cart.length) {
      showMessage("Your cart is empty. Please add a product first.");
      return;
    }

    const config = window.STORE_CONFIG || {};

    if (!config.razorpayKeyId) {
      showMessage(
        "Online payment is not configured. Please contact us or use WhatsApp."
      );
      return;
    }

    if (typeof window.Razorpay !== "function") {
      showMessage(
        "Razorpay checkout could not load. Please refresh the page or use WhatsApp."
      );
      return;
    }

    const customer = getCustomer();

    // Freeze the order details for this payment attempt.
    const orderCart = cart.map(item => ({ ...item }));

    payButton.disabled = true;
    payButton.textContent = "Connecting securely…";
    showMessage("Creating your secure payment order…");

    let checkout;

    try {
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: orderCart,
          customer
        })
      });

      const order = await orderResponse.json();

      if (!orderResponse.ok || !order.orderId || !order.amount) {
        throw new Error(
          order.error || "Could not create the payment order. Please contact us."
        );
      }

      const options = {
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

        theme: {
          color: "#123d69"
        },

        handler: async function (response) {
          payButton.disabled = true;
          payButton.textContent = "Verifying payment…";

          showMessage(
            "Payment submitted successfully. Verifying your payment securely. Please wait…"
          );

          try {
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response)
            });

            const verification = await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              verification.verified !== true
            ) {
              throw new Error(
                verification.error ||
                "Payment verification is still pending."
              );
            }

            // Clear the cart only after server verification succeeds.
            localStorage.removeItem(CART_KEY);
            cart = [];
            render();

            showMessage(
              `Payment verified successfully! Your Razorpay order reference is ${verification.orderId || order.orderId}. Please save this reference.`
            );

            payButton.textContent = "Payment verified";
            payButton.disabled = true;

          } catch (error) {
            // Keep the cart so the order can be checked.
            showMessage(
              `${error.message} Do not pay again. Please contact +91 98400 17107 and provide your Razorpay payment reference.`
            );

            payButton.disabled = false;
            payButton.textContent = "Retry payment verification";
          }
        },

        modal: {
          ondismiss: function () {
            showMessage(
              "The Razorpay payment window was closed. Check your Razorpay payment status before attempting another payment."
            );

            payButton.disabled = false;
            payButton.textContent = "Pay securely with Razorpay →";
          }
        }
      };

      checkout = new window.Razorpay(options);

      checkout.on("payment.failed", function (response) {
        const description =
          response.error && response.error.description
            ? response.error.description
            : "Razorpay reported a payment failure.";

        showMessage(
          `${description} Check your payment status before trying again. For assistance, contact +91 98400 17107.`
        );

        payButton.disabled = false;
        payButton.textContent = "Pay securely with Razorpay →";
      });

      payButton.textContent = "Opening Razorpay…";
      checkout.open();

    } catch (error) {
      showMessage(
        `${error.message || "Could not start payment."} Please contact us if the issue continues.`
      );

      payButton.disabled = false;
      payButton.textContent = "Pay securely with Razorpay →";
    }
  });
}
