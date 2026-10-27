(() => {
  function setupGallery() {
    document.querySelectorAll('.product-image, .detail-visual').forEach(gallery => {
      const main = gallery.querySelector('.product-main-photo, #main-product-image');
      if (!main || main.dataset.galleryReady === "true") return;
      const thumbs = Array.from(gallery.querySelectorAll('.product-photo-thumbs img, .detail-thumbs img'));

      // Remember the last known-good main image so an invalid thumbnail never blanks the gallery.
      const initialSrc = main.getAttribute("src") || "";
      let lastGoodSrc = initialSrc;
      let lastGoodAlt = main.alt || "Product photo";
      main.dataset.galleryReady = "true";

      const setActiveThumb = (src) => {
        thumbs.forEach(thumb => {
          const thumbSrc = new URL(thumb.getAttribute("src") || "", document.baseURI).href;
          const active = thumbSrc === src;
          thumb.classList.toggle("gallery-thumb-active", active);
          thumb.setAttribute("aria-pressed", active ? "true" : "false");
          const button = thumb.closest("button.gallery-thumb");
          if (button) {
            button.classList.toggle("is-active", active);
            if (active) button.setAttribute("aria-current", "true");
            else button.removeAttribute("aria-current");
          }
        });
      };

      const activate = (thumb) => {
        const rawSrc = thumb.getAttribute("src");
        if (!rawSrc) return;
        const targetSrc = new URL(rawSrc, document.baseURI).href;
        if (targetSrc === new URL(lastGoodSrc, document.baseURI).href) {
          setActiveThumb(targetSrc);
          return;
        }

        // Preload before swapping the image. Keep the current main image while loading.
        const candidate = new Image();
        candidate.onload = () => {
          main.src = targetSrc;
          main.alt = thumb.alt || "Product photo";
          main.classList.remove("gallery-image-error");
          lastGoodSrc = targetSrc;
          lastGoodAlt = main.alt;
          setActiveThumb(targetSrc);
        };
        candidate.onerror = () => {
          // Keep the last good image visible and tell assistive technology what happened.
          main.src = lastGoodSrc;
          main.alt = lastGoodAlt;
          let status = gallery.querySelector(".gallery-status");
          if (!status) {
            status = document.createElement("p");
            status.className = "gallery-status";
            status.setAttribute("role", "status");
            status.setAttribute("aria-live", "polite");
            gallery.appendChild(status);
          }
          status.textContent = "This photo could not be loaded. The previous product image is still displayed.";
        };
        candidate.src = targetSrc;
      };

      thumbs.forEach(thumb => {
        thumb.style.cursor = "pointer";
        thumb.tabIndex = thumb.closest("button") ? -1 : 0;
        if (!thumb.closest("button")) {
          thumb.setAttribute("role", "button");
          thumb.setAttribute("aria-label", "Show image: " + (thumb.alt || "product photo"));
        }
        thumb.addEventListener("click", event => {
          event.preventDefault();
          activate(thumb);
        });
        if (!thumb.closest("button")) {
          thumb.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              activate(thumb);
            }
          });
        }
        thumb.addEventListener("error", () => thumb.classList.add("gallery-thumb-error"), { once: true });
      });

      main.addEventListener("error", () => {
        if (lastGoodSrc && main.src !== lastGoodSrc) {
          main.src = lastGoodSrc;
          main.alt = lastGoodAlt;
        }
      });

      main.style.cursor = "zoom-in";
      main.tabIndex = 0;
      main.setAttribute("role", "button");
      main.setAttribute("aria-label", "Open larger product image");
      main.addEventListener("click", () => openLightbox(main.currentSrc || main.src, main.alt));
      main.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(main.currentSrc || main.src, main.alt);
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