const CART_KEY = "drbohrras_baby_cart_v1";
const MAX_ITEM_QTY = 50;
let cart = [];

try {
  const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  cart = Array.isArray(saved) ? saved : [];
} catch (error) {
  cart = [];
}

cart = cart.filter(item => item && typeof item === "object").map(item => ({
  ...item,
  name: String(item.name || "Product"),
  size: String(item.size || ""),
  colour: String(item.colour || ""),
  price: Math.max(0, Number(item.price) || 0),
  qty: Math.max(1, Math.min(MAX_ITEM_QTY, parseInt(item.qty, 10) || 1))
}));

const $ = id => document.getElementById(id);
const prices = {
  feel: { "S": 165, "M": 300, "L": 545, "XL": 1200 },
  rubber: { "90 × 100 cm": 400, "90 × 200 cm": 700, "90 × 300 cm": 900 },
  magic: { "90 × 90 cm": 300, "90 × 180 cm": 500 }
};

function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN");
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (error) {}
}
function updatePrice(product) {
  const sizeId = { feel: "feel-size", rubber: "rubber-size", magic: "magic-size" }[product];
  const priceId = { feel: "feel-price", rubber: "rubber-price", magic: "magic-price" }[product];
  const select = $(sizeId);
  const price = $(priceId);
  if (!select || !price || !prices[product][select.value]) return;
  price.textContent = money(prices[product][select.value]);
}
$("year")?.textContent = new Date().getFullYear();
["feel", "rubber", "magic"].forEach(key => {
  const id = { feel: "feel-size", rubber: "rubber-size", magic: "magic-size" }[key];
  const select = $(id);
  if (!select) return;
  select.addEventListener("change", () => updatePrice(key));
  updatePrice(key);
});

function showToast(message) {
  let toast = $("cart-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cart-toast";
    toast.className = "cart-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function renderCart() {
  saveCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  $("cart-count").textContent = count;
  const box = $("cart-items");
  if (!cart.length) {
    box.innerHTML = '<p class="empty-cart">Your cart is empty. Choose a product to get started.</p>';
    $("cart-total").textContent = money(0);
    return;
  }
  box.innerHTML = cart.map((item, index) => {
    const qty = Math.max(1, Math.min(MAX_ITEM_QTY, parseInt(item.qty, 10) || 1));
    return `<div class="cart-line">
      <div class="cart-line-info">
        <b>${escapeHtml(item.name)}</b>
        <small>${escapeHtml(item.size)} · ${escapeHtml(item.colour)}</small>
        <small>${money(item.price)} each</small>
        <small><strong>${money(item.price * qty)}</strong></small>
      </div>
      <div class="cart-line-actions">
        <div class="quantity-control" aria-label="Change quantity for ${escapeHtml(item.name)}">
          <button type="button" data-qty-change="-1" data-index="${index}" aria-label="Decrease quantity" ${qty <= 1 ? "disabled" : ""}>−</button>
          <span aria-live="polite">${qty}</span>
          <button type="button" data-qty-change="1" data-index="${index}" aria-label="Increase quantity" ${qty >= MAX_ITEM_QTY ? "disabled" : ""}>+</button>
        </div>
        <button class="remove-item" data-remove="${index}" type="button" aria-label="Remove ${escapeHtml(item.name)} from cart">Remove</button>
      </div>
    </div>`;
  }).join("");
  $("cart-total").textContent = money(cart.reduce((sum, item) => sum + item.price * item.qty, 0));
}

function openCart() {
  $("cart-drawer").classList.add("open");
  $("backdrop").classList.add("open");
  $("cart-drawer").setAttribute("aria-hidden", "false");
  window.setTimeout(() => $("cart-close")?.focus(), 0);
}
function closeCart() {
  $("cart-drawer").classList.remove("open");
  $("backdrop").classList.remove("open");
  $("cart-drawer").setAttribute("aria-hidden", "true");
  $("cart-open")?.focus();
}

$("cart-items")?.addEventListener("click", event => {
  const qtyButton = event.target.closest("[data-qty-change]");
  const removeButton = event.target.closest("[data-remove]");
  if (qtyButton) {
    const index = Number(qtyButton.dataset.index);
    const item = cart[index];
    if (!item) return;
    const next = item.qty + Number(qtyButton.dataset.qtyChange);
    item.qty = Math.max(1, Math.min(MAX_ITEM_QTY, next));
    renderCart();
    return;
  }
  if (removeButton) {
    cart.splice(Number(removeButton.dataset.remove), 1);
    renderCart();
    showToast("Item removed from your cart.");
  }
});

document.querySelectorAll(".product-info .add-btn[data-price-map]").forEach(button => {
  button.addEventListener("click", () => {
    const productKey = button.dataset.priceMap;
    const sizeSelect = $(button.dataset.size);
    const quantityInput = $(button.dataset.qty);
    const size = sizeSelect?.value;
    const colour = button.dataset.colour === "rubber-colour-fixed" ? "Pink & Blue" : $(button.dataset.colour)?.value;
    if (!prices[productKey] || !prices[productKey][size] || !colour) return;

    const rawQty = parseInt(quantityInput?.value, 10);
    const qty = Math.max(1, Math.min(MAX_ITEM_QTY, Number.isFinite(rawQty) ? rawQty : 1));
    if (quantityInput) quantityInput.value = String(qty);
    const productName = button.dataset.product;
    const price = prices[productKey][size];
    const existing = cart.find(item => item.name === productName && item.size === size && item.colour === colour);
    if (existing) existing.qty = Math.min(MAX_ITEM_QTY, existing.qty + qty);
    else cart.push({ name: productName, size, colour, price, qty });

    renderCart();
    openCart();
    showToast("Added to cart — " + productName + ".");
  });
});

$("cart-open")?.addEventListener("click", openCart);
$("cart-close")?.addEventListener("click", closeCart);
$("backdrop")?.addEventListener("click", closeCart);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && $("cart-drawer")?.classList.contains("open")) closeCart();
});

$("whatsapp-order")?.addEventListener("click", () => {
  if (!cart.length) {
    showToast("Your cart is empty. Add a product first.");
    return;
  }
  const lines = cart.map(item => `• ${item.name} | ${item.size} | ${item.colour} | Qty ${item.qty} | ${money(item.price * item.qty)}`).join("\n");
  const productTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const message = `Hello Dr.Bohrras, I would like to order:\n\n${lines}\nProduct subtotal: ${money(productTotal)}\nDelivery: FREE (subject to serviceability)\nOrder total: ${money(productTotal)}\n\nPlease confirm availability and delivery details.`;
  const number = window.STORE_CONFIG?.whatsappNumber || "";
  if (!number) {
    showToast("WhatsApp support is not configured. Please use the Contact Us page.");
    return;
  }
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});

$("whatsapp-float")?.addEventListener("click", event => {
  event.preventDefault();
  const number = window.STORE_CONFIG?.whatsappNumber || "";
  if (!number) {
    showToast("WhatsApp support is not configured. Please use the Contact Us page.");
    return;
  }
  window.open(`https://wa.me/${number}?text=${encodeURIComponent("Hello Dr.Bohrras, I have an inquiry about your baby-care products.")}`, "_blank", "noopener,noreferrer");
});

renderCart();
