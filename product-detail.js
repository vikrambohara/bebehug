(() => {
  const page = window.PRODUCT_PAGE;
  const $ = id => document.getElementById(id);
  const CART_KEY = "drbohrras_baby_cart_v1";
  const MAX_ITEM_QTY = 50;
  let cart = [];
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    cart = Array.isArray(saved) ? saved : [];
  } catch (error) {
    cart = [];
  }

  const size = $("size");
  const price = $("selected-price");
  const colour = $("colour");
  const qtyInput = $("detail-qty");
  const addButton = $("add-detail");
  const status = $("detail-cart-status");
  const cartActions = $("detail-cart-actions");

  function clampQty(value) {
    const parsed = parseInt(value, 10);
    return Math.max(1, Math.min(MAX_ITEM_QTY, Number.isFinite(parsed) ? parsed : 1));
  }
  function selectedPrice() {
    return Number(size.options[size.selectedIndex]?.dataset.price || 0);
  }
  function updatePrice() {
    price.textContent = selectedPrice().toLocaleString("en-IN");
  }
  function safeSave() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      return true;
    } catch (error) {
      return false;
    }
  }
  function updateCartCount() {
    const total = cart.reduce((sum, item) => sum + clampQty(item.qty), 0);
    const counter = $("detail-cart-count");
    if (counter) counter.textContent = total > 99 ? "99+" : String(total);
  }
  function showStatus(message, showActions) {
    if (status) {
      status.textContent = message;
      status.hidden = false;
    }
    if (cartActions) cartActions.hidden = !showActions;
  }

  size.addEventListener("change", updatePrice);
  updatePrice();

  if (qtyInput) {
    qtyInput.addEventListener("change", () => { qtyInput.value = String(clampQty(qtyInput.value)); });
    qtyInput.addEventListener("blur", () => { qtyInput.value = String(clampQty(qtyInput.value)); });
  }
  document.querySelectorAll("[data-detail-qty-change]").forEach(button => {
    button.addEventListener("click", () => {
      const current = clampQty(qtyInput?.value || 1);
      const delta = Number(button.dataset.detailQtyChange || 0);
      if (qtyInput) qtyInput.value = String(clampQty(current + delta));
    });
  });

  if (page.id === "magic" && colour) {
    colour.addEventListener("change", () => {
      const mainImage = $("main-product-image");
      if (!mainImage) return;
      if (colour.value.startsWith("Blue")) {
        mainImage.src = "assets/magic-mat-blue.jpeg";
        mainImage.alt = "Blue printed Magic Mat rubber sheet";
      } else {
        mainImage.src = "assets/magic-mat-pink.jpeg";
        mainImage.alt = "Pink printed Magic Mat rubber sheet";
      }
    });
  }

  addButton.addEventListener("click", () => {
    const chosenSize = size.value;
    const chosenColour = colour ? colour.value : "Pink & Blue";
    const unitPrice = selectedPrice();
    const requestedQty = clampQty(qtyInput?.value || 1);
    if (qtyInput) qtyInput.value = String(requestedQty);

    const existing = cart.find(item =>
      item.name === page.title &&
      item.size === chosenSize &&
      item.colour === chosenColour
    );
    let addedQty = requestedQty;
    if (existing) {
      const priorQty = clampQty(existing.qty);
      addedQty = Math.min(requestedQty, MAX_ITEM_QTY - priorQty);
      existing.qty = priorQty + addedQty;
      existing.price = unitPrice;
    } else {
      cart.push({
        name: page.title,
        size: chosenSize,
        colour: chosenColour,
        price: unitPrice,
        qty: requestedQty
      });
    }

    if (addedQty <= 0) {
      showStatus("This item is already at the maximum quantity of 50 pieces in your cart.", true);
      updateCartCount();
      return;
    }
    if (!safeSave()) {
      showStatus("Your browser could not save the cart. Please enable site storage and try again.", false);
      return;
    }
    updateCartCount();
    addButton.textContent = "Add more to cart";
    const suffix = addedQty < requestedQty ? " (cart limit: 50 pieces per item)." : ".";
    showStatus(`Added ${addedQty} × ${page.title} (${chosenSize}, ${chosenColour}) to your cart${suffix}`, true);
  });

  function wa(text) {
    const n = window.STORE_CONFIG?.whatsappNumber || "";
    if (!n) {
      showStatus("WhatsApp support is not configured. Please use the Contact Us page.", false);
      return;
    }
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  $("product-whatsapp").addEventListener("click", event => {
    event.preventDefault();
    wa(`Hello Dr.Bohrras, I have an inquiry about ${page.title}. Size: ${size.value}. Colour: ${colour ? colour.value : "Pink & Blue"}. Quantity: ${clampQty(qtyInput?.value || 1)}.`);
  });
  const whatsappFloat = $("whatsapp-float");
  whatsappFloat?.addEventListener("click", event => {
    event.preventDefault();
    wa("Hello Dr.Bohrras, I have an inquiry about your baby-care products.");
  });

  updateCartCount();
})();