
const CART_KEY = "drbohrras_baby_cart_v1";
const CONFIRMED_ORDER_KEY = "bebehug_confirmed_order_id";

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
          typeof item.name === "string" &&
          Number.isFinite(Number(item.price)) &&
          Number(item.price) > 0 &&
          Number.isFinite(Number(item.qty)) &&
          Number(item.qty) > 0
        )
      : [];
  } catch (error) {
    cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    showMessage("Unable to update your cart. Please refresh the page.");
  }
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

        <button
          type="button"
          data-remove="${index}"
          aria-label="Remove item"
        >×</button>
      </div>
    `).join("");

    box.querySelectorAll("[data-remove]").forEach(button => {
      button.addEventListener("click", () => {
        cart.splice(Number(button.dataset.remove), 1);
        saveCart();
        render();
        showMessage("Cart updated.");
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
    name: $("customer-name")?.value.trim() || "",
    phone: $("customer-phone")?.value.trim() || "",
    email: $("customer-email")?.value.trim() || "",
    address: $("customer-address")?.value.trim() || "",
    city: $("customer-city")?.value.trim() || "",
    pin: $("customer-pin")?.value.trim() || ""
  };
}

function orderLines() {
  return cart.map(item =>
    `• ${item.name} | ${item.size || ""} | ${item.colour || ""} | Qty ${item.qty} | ${money(Number(item.price) * Number(item.qty))}`
  ).join("\n");
}

function validateCart() {
  if (!cart.length) {
    showMessage(
      "Your cart is empty. Please return to the shop and add products."
    );
    return false;
  }

  return true;
}

function validateForm(form) {
  if (!form) {
    showMessage("The checkout form could not be found. Please refresh the page.");
    return false;
  }

  return form.reportValidity();
}

// Load and display the cart.
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

    if (!validateCart()) return;
    if (!validateForm(form)) return;

    const config = window.STORE_CONFIG || {};
    const number = String(config.whatsappNumber || "").replace(/\D/g, "");

    if (!number) {
      showMessage(
        "WhatsApp is not configured. Please contact the store directly."
      );
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

    const whatsappURL =
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    const whatsappWindow = window.open(
      whatsappURL,
      "_blank",
      "noopener,noreferrer"
    );

    if (!whatsappWindow) {
      showMessage(
        "Your browser blocked the WhatsApp window. Please allow pop-ups and try again."
      );
    }
  });
}

// Razorpay online payment.
const payButton = $("pay-online");

if (payButton) {
  const originalButtonText =
    payButton.textContent.trim() || "Pay securely with Razorpay →";

  payButton.addEventListener("click", async () => {
    if (payButton.disabled) return;

    loadCart();
    render();

    if (!validateCart()) return;
    if (!validateForm(form)) return;

    const config = window.STORE_CONFIG || {};

    if (!config.razorpayKeyId) {
      showMessage(
        "Online payment is not configured. Please place your order through WhatsApp."
      );
      return;
    }

    if (typeof window.Razorpay !== "function") {
      showMessage(
        "Razorpay could not load. Refresh the page or use WhatsApp to place your order."
      );
      return;
    }

    const customer = getCustomer();

    // Send a snapshot of the cart. The server validates products and prices.
    const orderCart = cart.map(item => ({
      name: item.name,
      size: item.size,
      colour: item.colour,
      price: Number(item.price),
      qty: Number(item.qty)
    }));

    payButton.disabled = true;
    payButton.textContent = "Connecting securely…";
    showMessage("Creating your secure payment order…");

    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cart: orderCart,
          customer
        })
      });

      let order;

      try {
        order = await response.json();
      } catch {
        throw new Error("The server returned an invalid response. Please try again.");
      }

      if (
        !response.ok ||
        !order.orderId ||
        !order.amount ||
        !order.keyId
      ) {
        throw new Error(
          order.error || "Could not create the payment order."
        );
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

        theme: {
          color: "#123d69"
        },

        handler: async function (payment) {
          payButton.disabled = true;
          payButton.textContent = "Verifying payment…";

          showMessage(
            "Verifying your payment securely. Please wait and do not close this page."
          );

          try {
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payment)
            });

            let result;

            try {
              result = await verifyResponse.json();
            } catch {
              throw new Error(
                "We could not read the verification response. Contact us before paying again."
              );
            }

            if (!verifyResponse.ok || result.verified !== true) {
              throw new Error(
                result.error ||
                "Payment verification is pending. Please contact us before paying again."
              );
            }

            // Save the verified reference for the confirmation page.
            const confirmedOrderId =
              result.orderId || order.orderId;

            try {
              sessionStorage.setItem(
                CONFIRMED_ORDER_KEY,
                confirmedOrderId
              );
            } catch (error) {
              // Continue to the confirmation page even if storage is unavailable.
            }

            // Clear the cart only after server-side verification succeeds.
            try {
              localStorage.removeItem(CART_KEY);
            } catch (error) {
              // Payment is already verified; continue to confirmation.
            }

            cart = [];
            render();

            // Show the dedicated confirmation page.
            window.location.href = "/order-confirmation.html";
          } catch (error) {
            showMessage(
              `${error.message || "Payment verification could not be completed."} Do not pay again until the payment status is checked. Contact +91 98400 17107.`
            );

            payButton.disabled = false;
            payButton.textContent = "Retry payment verification";
          }
        },

        modal: {
          ondismiss: function () {
            showMessage(
              "Payment window closed. If you completed payment, contact us to check its status before trying again."
            );

            payButton.disabled = false;
            payButton.textContent = originalButtonText;
          }
        }
      });

      checkout.on("payment.failed", function (result) {
        const description =
          result?.error?.description ||
          "Razorpay reported a payment failure.";

        showMessage(
          `${description} If money was deducted, contact +91 98400 17107 before trying again.`
        );

        payButton.disabled = false;
        payButton.textContent = originalButtonText;
      });

      payButton.textContent = "Opening Razorpay…";
      checkout.open();
    } catch (error) {
      showMessage(
        error.message || "Could not start payment. Please try again."
      );

      payButton.disabled = false;
      payButton.textContent = originalButtonText;
    }
  });
}
