const CART_KEY = "drbohrras_baby_cart_v1";
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { cart = []; }
const $ = id => document.getElementById(id);
const subtotal = () => cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
const money = value => "₹" + Number(value).toLocaleString("en-IN");
function render() {
  const box = $("checkout-items");
  if (!cart.length) {
    box.innerHTML = '<p>Your cart is empty. <a href="index.html#shop">Shop products</a>.</p>';
    $("checkout-subtotal").textContent = money(0); $("checkout-total").textContent = money(0);
    return;
  }
  box.innerHTML = cart.map((item, i) => `<div class="checkout-item"><div><b>${item.name}</b><small>${item.size} · ${item.colour} · Qty ${item.qty}</small></div><strong>${money(item.price * item.qty)}</strong><button type="button" data-remove="${i}" aria-label="Remove item">×</button></div>`).join("");
  $("checkout-subtotal").textContent = money(subtotal());
  $("checkout-total").textContent = money(subtotal()); // Delivery is free.
  document.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => { cart.splice(Number(button.dataset.remove), 1); localStorage.setItem(CART_KEY, JSON.stringify(cart)); render(); }));
}
render();
if (new URLSearchParams(location.search).get("added")) $("checkout-message").textContent = "Added to your cart. Free delivery on every order.";
$("checkout-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!cart.length) { alert("Your cart is empty."); return; }
  const cfg = window.STORE_CONFIG || {}; const number = cfg.whatsappNumber || "";
  if (!number) { alert("The store WhatsApp number has not been configured yet."); return; }
  const lines = cart.map(item => `• ${item.name} | ${item.size} | ${item.colour} | Qty ${item.qty} | ${money(item.price * item.qty)}`).join("\n");
  const fields = { name: $("customer-name").value, phone: $("customer-phone").value, email: $("customer-email").value, address: $("customer-address").value, city: $("customer-city").value, pin: $("customer-pin").value };
  const msg = `Hello Dr.Bohrras, I would like to place an order.\n\n${lines}\nProducts subtotal: ${money(subtotal())}\nDelivery: FREE\nOrder total: ${money(subtotal())}\n\nName: ${fields.name}\nMobile: ${fields.phone}\nEmail: ${fields.email || "Not provided"}\nAddress: ${fields.address}, ${fields.city} - ${fields.pin}\n\nPlease confirm availability and next steps.`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
});


// Razorpay checkout uses server-side Pages Functions. Payment remains unavailable until the Cloudflare secrets are configured and PAYMENTS_ENABLED=true.
const payButton = $("pay-online");
if (payButton) payButton.addEventListener("click", async () => {
  const form = $("checkout-form");
  if (!form.reportValidity()) return;
  if (!cart.length) { alert("Your cart is empty."); return; }
  const cfg = window.STORE_CONFIG || {};
  if (!cfg.razorpayKeyId) { $("checkout-message").textContent = "Online payment is not activated yet. Please use WhatsApp to enquire or contact us."; return; }
  if (typeof window.Razorpay !== "function") { $("checkout-message").textContent = "Razorpay checkout could not load. Please refresh or use WhatsApp."; return; }
  const customer = { name: $("customer-name").value.trim(), phone: $("customer-phone").value.trim(), email: $("customer-email").value.trim(), address: $("customer-address").value.trim(), city: $("customer-city").value.trim(), pin: $("customer-pin").value.trim() };
  payButton.disabled = true; payButton.textContent = "Connecting securely…"; $("checkout-message").textContent = "Creating your secure payment order…";
  try {
    const orderResponse = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cart, customer }) });
    const order = await orderResponse.json();
    if (!orderResponse.ok) throw new Error(order.error || "Could not start payment.");
    const options = { key: order.keyId || cfg.razorpayKeyId, amount: order.amount, currency: order.currency || "INR", name: "Dr.Bohrras Baby Care", description: "Baby-care products — free delivery", order_id: order.orderId, prefill: { name: customer.name, email: customer.email, contact: customer.phone }, notes: { delivery_address: `${customer.address}, ${customer.city} - ${customer.pin}` }, theme: { color: "#123d69" }, handler: async response => {
      $("checkout-message").textContent = "Payment received by Razorpay. Verifying securely…";
      try {
        const verifyResponse = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
        const verification = await verifyResponse.json();
        if (!verifyResponse.ok || !verification.verified) throw new Error(verification.error || "Payment verification is pending.");
        localStorage.removeItem(CART_KEY); cart = []; render();
        $("checkout-message").textContent = `Payment verified successfully. Razorpay order: ${verification.orderId}. Please save this reference.`;
      } catch (error) { $("checkout-message").textContent = `${error.message} Do not pay again until our team confirms the status. Contact +91 98400 17107.`; }
    }, modal: { ondismiss: () => { $("checkout-message").textContent = "Payment window closed. Your cart is still saved; no payment confirmation has been recorded by this website."; } } };
    const checkout = new window.Razorpay(options);
    checkout.on("payment.failed", response => { $("checkout-message").textContent = response.error?.description || "Payment failed or was cancelled. Please retry later or contact us."; });
    checkout.open();
  } catch (error) { $("checkout-message").textContent = error.message || "Could not start payment. Please use WhatsApp to contact us."; }
  finally { payButton.disabled = false; payButton.textContent = "Pay securely with Razorpay →"; }
});
