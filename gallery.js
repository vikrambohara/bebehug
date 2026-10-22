(() => {
  function setupGallery() {
    // A thumbnail click changes the main product image; clicking a main image opens it larger.
    document.querySelectorAll('.product-image, .detail-visual').forEach(gallery => {
      const main = gallery.querySelector('.product-main-photo, #main-product-image');
      if (!main) return;
      const thumbs = Array.from(gallery.querySelectorAll('.product-photo-thumbs img, .detail-thumbs img'));
      const allImages = [main, ...thumbs];
      const activate = (img) => {
        main.src = img.currentSrc || img.src;
        main.alt = img.alt || 'Product photo';
        thumbs.forEach(t => {
          const active = t === img || (t.src === main.src);
          t.classList.toggle('gallery-thumb-active', active);
          t.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      };
      thumbs.forEach(img => {
        img.style.cursor = 'pointer';
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', 'Show image: ' + (img.alt || 'product photo'));
        img.addEventListener('click', () => activate(img));
        img.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(img); }
        });
      });
      main.style.cursor = 'zoom-in';
      main.tabIndex = 0;
      main.setAttribute('role', 'button');
      main.setAttribute('aria-label', 'Open larger product image');
      main.addEventListener('click', () => openLightbox(main.currentSrc || main.src, main.alt));
      main.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(main.currentSrc || main.src, main.alt); }
      });
    });
  }
  function openLightbox(src, alt) {
    let overlay = document.getElementById('product-image-lightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'product-image-lightbox';
      overlay.innerHTML = '<button type="button" class="gallery-lightbox-close" aria-label="Close enlarged image">×</button><img class="gallery-lightbox-image" alt=""><p class="gallery-lightbox-hint">Click outside the image or press Esc to close</p>';
      Object.assign(overlay.style, {position:'fixed',inset:'0',zIndex:'99999',background:'rgba(9,25,39,.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',flexDirection:'column'});
      const large = overlay.querySelector('img');
      Object.assign(large.style, {maxWidth:'min(94vw,1200px)',maxHeight:'82vh',objectFit:'contain',background:'#fff',borderRadius:'12px',padding:'8px',boxShadow:'0 18px 60px rgba(0,0,0,.35)'});
      const close = overlay.querySelector('button');
      Object.assign(close.style, {position:'absolute',top:'16px',right:'22px',border:'0',borderRadius:'50%',width:'44px',height:'44px',fontSize:'32px',lineHeight:'1',cursor:'pointer',background:'#fff',color:'#103e68'});
      const hint = overlay.querySelector('p');
      Object.assign(hint.style, {color:'#fff',fontSize:'13px',textAlign:'center',marginTop:'14px'});
      const closeOverlay = () => { overlay.style.display='none'; document.body.style.overflow=''; };
      close.addEventListener('click', closeOverlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.style.display !== 'none') closeOverlay(); });
      document.body.appendChild(overlay);
    }
    const image = overlay.querySelector('img');
    image.src = src;
    image.alt = alt || 'Product image enlarged';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupGallery);
  else setupGallery();
})();
