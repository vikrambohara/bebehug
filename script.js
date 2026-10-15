```javascript
const CART_KEY = "drbohrras_baby_cart_v1";

let cart = [];

try {
  const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  cart = Array.isArray(saved) ? saved : [];
} catch (error) {
  cart = [];
}

const $ = id => document.getElementById(id);

const prices = {
  feel: { S: 165, M: 300, L: 545, XL: 1200 },
  rubber: {
    "90 × 100 cm": 450,
    "90 × 200 cm": 800,
    "90 × 300 cm": 1050
  },
  magic: {
    "90 × 90 cm": 350,
    "90 × 180 cm": 550
  }
};

// Save the current cart.
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Format prices in Indian rupees.
function formatPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

// Update the price displayed when a size changes.
function updatePrice(product) {
  const sizeIds = {
    feel: "feel-size",
    rubber: "rubber-size",
    magic: "magic-size"
  };

  const priceIds = {
    feel: "feel-price",
    rubber: "rubber-price",
    magic: "magic-price"
  };

  const sizeElement = $(sizeIds[product]);
  const priceElement = $(priceIds[product]);

  if (!sizeElement || !priceElement) return;

  const size = sizeElement.value;
  priceElement.textContent = formatPrice(prices[product][size]);
}

["feel", "rubber", "magic"].forEach(product => {
  const sizeIds = {
    feel: "feel-size",
    rubber: "rubber-size",
    magic: "magic-size"
  };

  const sizeElement = $(sizeIds[product]);

  if (sizeElement) {
    sizeElement.addEventListener("change", () => updatePrice(product));
    updatePrice(product);
  }
});

// Calculate the product subtotal.
function getCartTotal() {
  return cart.reduce(
    (total, item) => total + item.price * item.qty,
    0
  );
}

// Display the shopping cart.
function renderCart() {
  saveCart();

  const count = $("cart-count");
  const box = $("cart-items");
  const totalElement = $("cart-total");

  if (!count || !box || !totalElement) return;

  count.textContent = cart.reduce(
    (total, item) => total + item.qty,
    0
  );

  if (cart.length === 0) {
    box.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
    totalElement.textContent = "₹0";
    return;
  }

  box.innerHTML = cart.map((item, index) => `
    <div class="cart-line">
      <div class="cart-product-info">
        <b>${item.name}</b>
        <small>${item.size} · ${item.colour}</small>
        <small>${formatPrice(item.price)} per piece</small>

        <div class="quantity-controls">
          <button type="button"
                  class="qty-btn"
                  data-minus="${index}"
                  aria-label="Decrease quantity">−</button>

          <span class="qty-value">${item.qty}</span>

          <button type="button"
                  class="qty-btn"
                  data-plus="${index}"
                  aria-label="Increase quantity">+</button>
        </div>

        <small>
          Line total: ${formatPrice(item.price * item.qty)}
        </small>
      </div>

      <button type="button"
              class="remove-item"
              data-remove="${index}">Remove</button>
    </div>
  `).join("");

  totalElement.textContent = formatPrice(getCartTotal());

  // Decrease quantity, with a minimum of one piece.
  box.querySelectorAll("[data-minus]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.minus);
      if (!cart[index]) return;

      cart[index].qty = Math.max(1, cart[index].qty - 1);
      renderCart();
    });
  });

  // Increase quantity.
  box.querySelectorAll("[data-plus]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.plus);
      if (!cart[index]) return;

      cart[index].qty += 1;
      renderCart();
    });
  });

  // Remove a product completely.
  box.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.remove);
      if (index < 0 || index >= cart.length) return;

      cart.splice(index, 1);
      renderCart();
    });
  });
}

// Add the selected product and quantity to the cart.
document.querySelectorAll(".add-btn").forEach(button => {
  button.addEventListener("click", () => {
    const product = button.dataset.priceMap;
    const sizeElement = $(button.dataset.size);
    const quantityElement = $(button.dataset.qty);

    if (!prices[product] || !sizeElement || !quantityElement) {
      alert("Please refresh the page and try again.");
      return;
    }

    const size = sizeElement.value;
    const colour =
      button.dataset.colour === "rubber-colour-fixed"
        ? "Pink & Blue"
        : $(button.dataset.colour)?.value;

    const rawQuantity = Number(quantityElement.value);

    if (
      !Number.isFinite(rawQuantity) ||
      !Number.isInteger(rawQuantity) ||
      rawQuantity < 1
    ) {
      alert("Please enter a whole quantity of at least 1 piece.");
      quantityElement.focus();
      return;
    }

    const qty = rawQuantity;
    const price = prices[product][size];

    if (!colour || price === undefined) {
      alert("Please select a valid product option.");
      return;
    }

    const existing = cart.find(item =>
      item.name === button.dataset.product &&
      item.size === size &&
      item.colour === colour
    );

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        name: button.dataset.product,
        size: size,
        colour: colour,
        price: price,
        qty: qty
      });
    }

    renderCart();
    openCart();

    // Reset the product quantity box after adding.
    quantityElement.value = "1";
  });
});

// Open and close the cart drawer.
function openCart() {
  $("cart-drawer")?.classList.add("open");
  $("backdrop")?.classList.add("open");
  $("cart-drawer")?.setAttribute("aria-hidden", "false");
}

function closeCart() {
  $("cart-drawer")?.classList.remove("open");
  $("backdrop")?.classList.remove("open");
  $("cart-drawer")?.setAttribute("aria-hidden", "true");
}

$("cart-open")?.addEventListener("click", openCart);
$("cart-close")?.addEventListener("click", closeCart);
$("backdrop")?.addEventListener("click", closeCart);

// Initialize the cart when the page loads.
renderCart();

// Allow the floating WhatsApp button for general inquiries only.
const whatsappButton = $("whatsapp-float");

if (whatsappButton) {
  whatsappButton.addEventListener("click", event => {
    const number =
      (window.STORE_CONFIG &&
        window.STORE_CONFIG.whatsappNumber) || "919840017107";

    if (!number) return;

    event.preventDefault();

    const message = encodeURIComponent(
      "Hello, I have an inquiry about Bebehug baby-care products."
    );

    window.open(
      `https://wa.me/${number}?text=${message}`,
      "_blank",
      "noopener"
    );
  });
}
```
