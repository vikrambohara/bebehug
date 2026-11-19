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

  function pageContextEvents() {
    track("PageView");

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
        content_variant: [selectedSize, colour].filter(Boolean).join(" / ")
      });
    }

    if (/\/checkout(?:\.html)?\/?$/i.test(window.location.pathname)) {
      const cart = getCart();
      if (cart.length) {
        const value = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
        const numItems = cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
        track("InitiateCheckout", {
          content_ids: cart.map(item => String(item.name || "product")),
          contents: cart.map(item => ({
            id: String(item.name || "product"),
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
  }

  function saveConsent(choice) {
    consent = choice;
    try { localStorage.setItem(CONSENT_KEY, choice); } catch (error) {}
    const banner = document.getElementById("bebehug-cookie-banner");
    if (banner) banner.remove();
    const settings = document.getElementById("bebehug-cookie-settings");
    if (settings) settings.hidden = false;
    if (choice === "accepted") initializePixel();
  }

  function createButton(label, background, color, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      border: "0",
      borderRadius: "9px",
      padding: "10px 14px",
      minHeight: "42px",
      font: "700 13px/1.2 Arial,sans-serif",
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
    banner.setAttribute("aria-label", "Optional advertising cookie preferences");
    Object.assign(banner.style, {
      position: "fixed",
      left: "16px",
      right: "16px",
      bottom: "16px",
      zIndex: "100000",
      width: "auto",
      maxWidth: "760px",
      margin: "0 auto",
      padding: "17px",
      border: "1px solid #d8e7ee",
      borderRadius: "16px",
      background: "#ffffff",
      color: "#183858",
      boxShadow: "0 12px 38px rgba(16,48,72,.22)",
      font: "13px/1.55 Arial,sans-serif"
    });

    const title = document.createElement("strong");
    title.textContent = "Your privacy choices";
    Object.assign(title.style, { display: "block", fontSize: "15px", marginBottom: "5px" });

    const copy = document.createElement("p");
    copy.textContent = "Bebehug would like to use optional advertising cookies to measure visits and show relevant Bebehug ads on Facebook and Instagram. You can accept or reject these optional cookies. Read our ";
    Object.assign(copy.style, { margin: "0 0 12px", color: "#536b7d" });
    const privacyLink = document.createElement("a");
    privacyLink.href = "privacy-policy.html";
    privacyLink.textContent = "Privacy Policy";
    privacyLink.style.color = "#17658a";
    privacyLink.style.textDecoration = "underline";
    copy.appendChild(privacyLink);
    copy.appendChild(document.createTextNode("."));

    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", gap: "9px", flexWrap: "wrap" });
    actions.appendChild(createButton("Accept marketing cookies", "#f34d7d", "#ffffff", () => saveConsent("accepted")));
    actions.appendChild(createButton("Reject optional cookies", "#eef5f8", "#183858", () => saveConsent("rejected")));

    banner.append(title, copy, actions);
    document.body.appendChild(banner);

    const settings = document.getElementById("bebehug-cookie-settings");
    if (settings) settings.hidden = true;
  }

  function createSettingsControl() {
    if (document.getElementById("bebehug-cookie-settings")) return;
    const button = document.createElement("button");
    button.id = "bebehug-cookie-settings";
    button.type = "button";
    button.textContent = "Cookie settings";
    button.setAttribute("aria-label", "Change cookie preferences");
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
    button.addEventListener("click", openConsentBanner);
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