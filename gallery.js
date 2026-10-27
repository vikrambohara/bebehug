(() => {
  const resolveUrl = value => {
    try { return new URL(value, document.baseURI).href; }
    catch (error) { return value || ""; }
  };

  function setupGallery() {
    document.querySelectorAll(".product-image, .detail-visual").forEach(gallery => {
      const main = gallery.querySelector(".product-main-photo, #main-product-image");
      if (!main || main.dataset.galleryReady === "true") return;
      main.dataset.galleryReady = "true";

      // Normalize every image thumbnail to a real button, including older product pages
      // that still have plain <img> elements rather than button wrappers.
      const thumbImages = Array.from(gallery.querySelectorAll(".product-photo-thumbs img, .detail-thumbs img"));
      const thumbButtons = thumbImages.map(img => {
        let button = img.closest("button.gallery-thumb");
        if (!button) {
          button = document.createElement("button");
          button.className = "gallery-thumb";
          button.type = "button";
          img.parentNode.insertBefore(button, img);
          button.appendChild(img);
        }
        return button;
      });
      let lastGoodSrc = resolveUrl(main.getAttribute("src") || main.src);
      let lastGoodAlt = main.alt || "Product photo";
      let requestNumber = 0;

      const paintMain = (src, alt) => {
        main.removeAttribute("srcset");
        main.removeAttribute("sizes");
        main.src = src;
        main.alt = alt || "Product photo";
        main.style.display = "block";
        main.style.visibility = "visible";
        main.style.opacity = "1";
        main.style.objectFit = "contain";
        main.classList.remove("gallery-image-error");
      };

      const updateActive = activeSrc => {
        thumbButtons.forEach(button => {
          const img = button.querySelector("img");
          const active = !!img && resolveUrl(img.getAttribute("src") || img.src) === activeSrc;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
          if (active) button.setAttribute("aria-current", "true");
          else button.removeAttribute("aria-current");
        });
      };

      const reportFailure = () => {
        let status = gallery.querySelector(".gallery-status");
        if (!status) {
          status = document.createElement("p");
          status.className = "gallery-status";
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          gallery.appendChild(status);
        }
        status.textContent = "That photo could not be loaded. The previous image is still displayed.";
      };

      // Keep the main image at a stable size and make sure the default is the same on both pages.
      paintMain(lastGoodSrc, lastGoodAlt);
      updateActive(lastGoodSrc);

      thumbButtons.forEach(button => {
        const img = button.querySelector("img");
        if (!img) return;
        button.type = "button";
        button.setAttribute("aria-label", "Show image: " + (img.alt || "product photo"));
        button.setAttribute("aria-pressed", resolveUrl(img.getAttribute("src") || img.src) === lastGoodSrc ? "true" : "false");
        img.addEventListener("error", () => button.classList.add("gallery-thumb-error"), { once: true });

        button.addEventListener("click", event => {
          event.preventDefault();
          const source = img.getAttribute("src");
          if (!source) return;
          const targetSrc = resolveUrl(source);
          const thisRequest = ++requestNumber;
          if (targetSrc === lastGoodSrc) {
            updateActive(lastGoodSrc);
            return;
          }

          // Preload the new image; never clear the visible main image while it loads.
          const candidate = new Image();
          candidate.onload = () => {
            if (thisRequest !== requestNumber) return;
            paintMain(targetSrc, img.alt || "Product photo");
            lastGoodSrc = targetSrc;
            lastGoodAlt = img.alt || "Product photo";
            updateActive(lastGoodSrc);
            const status = gallery.querySelector(".gallery-status");
            if (status) status.remove();
          };
          candidate.onerror = () => {
            if (thisRequest !== requestNumber) return;
            paintMain(lastGoodSrc, lastGoodAlt);
            updateActive(lastGoodSrc);
            reportFailure();
          };
          candidate.src = targetSrc;
        });
      });

      main.addEventListener("error", () => {
        const failedSrc = resolveUrl(main.getAttribute("src") || main.src);
        if (lastGoodSrc && failedSrc !== lastGoodSrc) paintMain(lastGoodSrc, lastGoodAlt);
      });

      main.style.cursor = "zoom-in";
      main.tabIndex = 0;
      main.setAttribute("role", "button");
      main.setAttribute("aria-label", "Open larger product image");
      main.addEventListener("click", () => openLightbox(resolveUrl(main.getAttribute("src") || main.src), main.alt));
      main.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(resolveUrl(main.getAttribute("src") || main.src), main.alt);
        }
      });
    });
  }

  function openLightbox(src, alt) {
    let overlay = document.getElementById("product-image-lightbox");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "product-image-lightbox";
      overlay.innerHTML = '<button type="button" class="gallery-lightbox-close" aria-label="Close enlarged image">×</button><img class="gallery-lightbox-image" alt=""><p class="gallery-lightbox-hint">Click outside the image or press Esc to close</p>';
      Object.assign(overlay.style, {position:"fixed",inset:"0",zIndex:"99999",background:"rgba(9,25,39,.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",flexDirection:"column"});
      const large = overlay.querySelector("img");
      Object.assign(large.style, {maxWidth:"min(94vw,1200px)",maxHeight:"82vh",objectFit:"contain",background:"#fff",borderRadius:"12px",padding:"8px",boxShadow:"0 18px 60px rgba(0,0,0,.35)"});
      const close = overlay.querySelector("button");
      Object.assign(close.style, {position:"absolute",top:"16px",right:"22px",border:"0",borderRadius:"50%",width:"44px",height:"44px",fontSize:"32px",lineHeight:"1",cursor:"pointer",background:"#fff",color:"#103e68"});
      const hint = overlay.querySelector("p");
      Object.assign(hint.style, {color:"#fff",fontSize:"13px",textAlign:"center",marginTop:"14px"});
      const closeOverlay = () => { overlay.style.display="none"; document.body.style.overflow=""; };
      close.addEventListener("click", closeOverlay);
      overlay.addEventListener("click", event => { if (event.target === overlay) closeOverlay(); });
      document.addEventListener("keydown", event => { if (event.key === "Escape" && overlay.style.display !== "none") closeOverlay(); });
      document.body.appendChild(overlay);
    }
    const image = overlay.querySelector("img");
    image.src = src;
    image.alt = alt || "Product image enlarged";
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupGallery);
  else setupGallery();
})();