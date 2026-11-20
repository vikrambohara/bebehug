(() => {
  "use strict";

  const PIXEL_ID = "1673283201013437";
  const CONSENT_KEY = "bebehug_marketing_consent_v1";
  const CART_KEY = "drbohrras_baby_cart_v1";
  let consent = "unset";
  let initialized = false;

  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted" || saved === "rejected") consent = saved;
  } catch (error) {
    // If browser storage is unavailable, do not load optional advertising tracking.
    consent = "unset";
  }

  function track(eventName, parameters = {}, eventId) {
    if (consent !== "accepted" || !initialized || typeof window.fbq !== "function") return false;
    try {
      if (eventId) window.fbq("track", eventName, parameters, { eventID: String(eventId) });
      else window.fbq("track", eventName, parameters);
      return true;
    } catch (error) {
      return false;
    }
  }

  window.bebehugTrackMetaEvent = track;
  window.bebehugHasMarketingConsent = () => consent === "accepted";

  function getCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter(item => item && typeof item === "object") : [];
    } catch (error) {
      return [];
    }
  }

  function productIdForName(name) {
    const value = String(name || "").toLowerCase();
    if (value.includes("feel dry")) return "feel";
    if (value.includes("double colour")) return "rubber";
    if (value.includes("magic mat")) return "magic";
    return "bebehug-product";
  }

  function cartKey(item) {
    return [item.name || "", item.size || "", item.colour || ""].join("|");
  }

  function installAddToCartTracking() {
    let beforeCart = null;
    let clickedAt = 0;

    // Capture the cart before the store's own click handler runs.
    document.addEventListener("click", event => {
      const button = event.target.closest(".product-info .add-btn[data-price-map], #add-detail");
      if (!button) return;
      beforeCart = getCart().map(item => ({ ...item }));
      clickedAt = Date.now();
    }, true);

    // The page's existing add-to-cart handler runs before this bubbling listener.
    document.addEventListener("click", event => {
      const button = event.target.closest(".product-info .add-btn[data-price-map], #add-detail");
      if (!button || !beforeCart || Date.now() - clickedAt > 3000) return;
      const afterCart = getCart();
      const oldByKey = new Map(beforeCart.map(item => [cartKey(item), Number(item.qty) || 0]));
      const added = afterCart.map(item => {
        const delta = (Number(item.qty) || 0) - (oldByKey.get(cartKey(item)) || 0);
        if (delta <= 0) return null;
        const price = Number(item.price) || 0;
        return {
          id: productIdForName(item.name),
          quantity: delta,
          item_price: price
        };
      }).filter(Boolean);

      beforeCart = null;
      clickedAt = 0;
      if (!added.length) return;

      const value = added.reduce((sum, item) => sum + item.quantity * item.item_price, 0);
      track("AddToCart", {
        content_ids: [...new Set(added.map(item => item.id))],
        contents: added,
        content_type: "product",
        num_items: added.reduce((sum, item) => sum + item.quantity, 0),
        value,
        currency: "INR"
      });
    });
  }

  function pageContextEvents() {
    track("PageView", { page_path: window.location.pathname, page_title: document.title });

    const product = window.PRODUCT_PAGE;
    if (product && product.id && product.title) {
      const sizeSelect = document.getElementById("size");
      const option = sizeSelect && sizeSelect.options[sizeSelect.selectedIndex];
      const selectedSize = option ? option.value : "";
      const selectedPrice = Number(option?.dataset?.price || document.getElementById("selected-price")?.textContent || 0);
      const colour = document.getElementById("colour")?.value || "Pink & Blue";
      const selectedVariant = Array.isArray(product.sizes)
        ? product.sizes.find(row => row[1] === selectedSize)
        : null;
      const value = selectedVariant ? Number(selectedVariant[2]) : selectedPrice;

      track("ViewContent", {
        content_ids: [String(product.id)],
        content_name: String(product.title),
        content_type: "product",
        content_category: "Baby-care sheets",
        contents: [{ id: String(product.id), quantity: 1, item_price: value }],
        value,
        currency: "INR",
        content_variant: [selectedSize, colour].filter(Boolean).join(" / "),
        page_path: window.location.pathname,
        page_title: document.title
      });
    }

    if (/\/checkout(?:\.html)?\/?$/i.test(window.location.pathname)) {
      const cart = getCart();
      if (cart.length) {
        const value = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
        const numItems = cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
        track("InitiateCheckout", {
          content_ids: [...new Set(cart.map(item => productIdForName(item.name)))],
          contents: cart.map(item => ({
            id: productIdForName(item.name),
            quantity: Number(item.qty) || 1,
            item_price: Number(item.price) || 0
          })),
          content_type: "product",
          num_items: numItems,
          value,
          currency: "INR"
        });
      }
    }
  }

  function initializePixel() {
    if (initialized || consent !== "accepted") return;
    initialized = true;

    (function(f,b,e,v,n,t,s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", PIXEL_ID);
    pageContextEvents();
    installAddToCartTracking();
  }

  function saveConsent(choice) {
    const pixelWasLoaded = initialized;
    consent = choice;
    try { localStorage.setItem(CONSENT_KEY, choice); } catch (error) {}
    const banner = document.getElementById("bebehug-cookie-banner");
    if (banner) banner.remove();
    const settings = document.getElementById("bebehug-cookie-settings");
    if (settings) settings.hidden = false;
    if (choice === "accepted") {
      initializePixel();
    } else if (pixelWasLoaded) {
      // Reload after consent withdrawal so the already-loaded Meta library is unloaded.
      window.location.reload();
    }
  }

  function createButton(label, background, color, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      display: "block",
      width: "100%",
      border: background === "transparent" ? "0" : "1px solid #111111",
      borderRadius: "0",
      padding: "15px 18px",
      minHeight: "56px",
      font: "700 15px/1.2 Arial,sans-serif",
      letterSpacing: ".02em",
      textAlign: "left",
      cursor: "pointer",
      background,
      color
    });
    button.addEventListener("click", onClick);
    return button;
  }

  function openConsentBanner() {
    let banner = document.getElementById("bebehug-cookie-banner");
    if (banner) return;

    banner = document.createElement("section");
    banner.id = "bebehug-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "true");
    banner.setAttribute("aria-label", "Protecting your privacy");
    Object.assign(banner.style, {
      position: "fixed",
      inset: "0",
      zIndex: "100000",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      width: "100%",
      padding: "0",
      background: "rgba(0,0,0,.72)",
      boxSizing: "border-box"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      width: "100%",
      maxWidth: "760px",
      maxHeight: "88vh",
      overflowY: "auto",
      padding: "30px 24px 24px",
      background: "#ffffff",
      color: "#111111",
      boxShadow: "0 -8px 32px rgba(0,0,0,.18)",
      font: "16px/1.6 Arial,sans-serif",
      boxSizing: "border-box"
    });

    const title = document.createElement("h2");
    title.textContent = "PROTECTING YOUR PRIVACY";
    Object.assign(title.style, {
      margin: "0 0 20px",
      color: "#000000",
      font: "800 clamp(27px, 6vw, 38px)/1.08 Arial,sans-serif",
      letterSpacing: "-.025em",
      textTransform: "uppercase"
    });

    const copy = document.createElement("p");
    copy.textContent = "We use cookies and tracking to make our site work. To help us improve and personalise your experience, we also use optional tracking for analytics and marketing personalisation. This means better content and offers. Opting in allows optional cookies and similar technologies to be stored on your device to support these purposes. If you choose not to opt in, you can still access the main features of our site, including browsing, shopping and checkout, but analytics and personalised advertising may be limited. For more detailed information see our ";
    Object.assign(copy.style, {
      margin: "0 0 22px",
      color: "#222222",
      font: "16px/1.65 Arial,sans-serif"
    });

    const privacyLink = document.createElement("a");
    privacyLink.href = "privacy-policy.html";
    privacyLink.textContent = "Privacy Notice";
    Object.assign(privacyLink.style, { color: "#111111", textDecoration: "underline" });
    copy.appendChild(privacyLink);
    copy.appendChild(document.createTextNode("."));

    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "grid", gap: "14px" });

    const continueButton = createButton("CONTINUE  →", "#000000", "#ffffff", () => saveConsent("accepted"));
    continueButton.setAttribute("aria-label", "Continue and allow optional marketing tracking");

    const manageButton = document.createElement("button");
    manageButton.type = "button";
    manageButton.textContent = "Manage Tracking";
    Object.assign(manageButton.style, {
      justifySelf: "start",
      border: "0",
      padding: "0",
      background: "transparent",
      color: "#111111",
      font: "700 15px/1.4 Arial,sans-serif",
      textDecoration: "underline",
      textUnderlineOffset: "2px",
      cursor: "pointer"
    });

    manageButton.addEventListener("click", () => {
      title.textContent = "MANAGE TRACKING";
      copy.textContent = "Choose whether to allow optional marketing tracking. Essential storage needed for the shopping cart and checkout remains active. You can change this choice later using Manage Tracking.";
      actions.replaceChildren(
        createButton("ALLOW OPTIONAL TRACKING", "#000000", "#ffffff", () => saveConsent("accepted")),
        createButton("REJECT OPTIONAL TRACKING", "#ffffff", "#111111", () => saveConsent("rejected")),
        createButton("BACK", "transparent", "#111111", () => {
          title.textContent = "PROTECTING YOUR PRIVACY";
          copy.innerHTML = "";
          copy.textContent = "We use cookies and tracking to make our site work. To help us improve and personalise your experience, we also use optional tracking for analytics and marketing personalisation. This means better content and offers. Opting in allows optional cookies and similar technologies to be stored on your device to support these purposes. If you choose not to opt in, you can still access the main features of our site, including browsing, shopping and checkout, but analytics and personalised advertising may be limited. For more detailed information see our ";
          copy.appendChild(privacyLink);
          copy.appendChild(document.createTextNode("."));
          actions.replaceChildren(continueButton, manageButton);
        })
      );
    });

    const footerLinks = document.createElement("div");
    Object.assign(footerLinks.style, {
      display: "flex",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      marginTop: "18px",
      font: "600 14px/1.4 Arial,sans-serif"
    });

    const cookiePolicyLink = document.createElement("a");
    cookiePolicyLink.href = "privacy-policy.html#marketing-cookies";
    cookiePolicyLink.textContent = "Cookie Policy";
    Object.assign(cookiePolicyLink.style, { color: "#111111", textDecoration: "underline" });

    const imprintLink = document.createElement("a");
    imprintLink.href = "about-us.html";
    imprintLink.textContent = "Imprint";
    Object.assign(imprintLink.style, { color: "#111111", textDecoration: "underline" });

    actions.append(continueButton, manageButton);
    footerLinks.append(cookiePolicyLink, imprintLink);
    panel.append(title, copy, actions, footerLinks);
    banner.appendChild(panel);
    document.body.appendChild(banner);
    document.getElementById("bebehug-cookie-settings")?.setAttribute("aria-expanded", "true");
  }

  function createSettingsControl() {
    if (document.getElementById("bebehug-cookie-settings")) return;
    const button = document.createElement("button");
    button.id = "bebehug-cookie-settings";
    button.type = "button";
    button.textContent = "Manage Tracking";
    button.setAttribute("aria-label", "Manage tracking preferences");
    Object.assign(button.style, {
      position: "fixed",
      left: "12px",
      bottom: "12px",
      zIndex: "99980",
      border: "1px solid #d8e7ee",
      borderRadius: "18px",
      padding: "7px 11px",
      minHeight: "32px",
      background: "#ffffff",
      color: "#536b7d",
      boxShadow: "0 3px 12px rgba(16,48,72,.10)",
      font: "11px/1.2 Arial,sans-serif",
      cursor: "pointer"
    });
    button.hidden = consent === "unset";
    button.addEventListener("click", () => {
      const existing = document.getElementById("bebehug-cookie-banner");
      if (existing) existing.remove();
      openConsentBanner();
    });
    document.body.appendChild(button);
  }

  function start() {
    createSettingsControl();
    if (consent === "accepted") initializePixel();
    else if (consent === "unset") openConsentBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();