const CART_KEY="drbohrras_baby_cart_v1";
let cart=[];
try{cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch(e){cart=[]}
cart=cart.filter(x=>x&&typeof x==="object").map(x=>({...x,price:Number(x.price)||0,qty:Math.max(1,parseInt(x.qty,10)||1)}));
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart))}
const $=id=>document.getElementById(id);
const prices={
  feel:{"S":165,"M":300,"L":545,"XL":1200},
  rubber:{"90 × 100 cm":400,"90 × 200 cm":700,"90 × 300 cm":900},
  magic:{"90 × 90 cm":300,"90 × 180 cm":500}
};
$("year").textContent=new Date().getFullYear();
function updatePrice(product){
  const sizeId={feel:"feel-size",rubber:"rubber-size",magic:"magic-size"}[product];
  const priceId={feel:"feel-price",rubber:"rubber-price",magic:"magic-price"}[product];
  const size=$(sizeId).value;
  $(priceId).textContent="₹"+prices[product][size].toLocaleString("en-IN");
}
["feel","rubber","magic"].forEach(key=>{
  const id={feel:"feel-size",rubber:"rubber-size",magic:"magic-size"}[key];
  $(id).addEventListener("change",()=>updatePrice(key));
  updatePrice(key);
});
function renderCart(){
  saveCart();
  $("cart-count").textContent=cart.reduce((n,x)=>n+x.qty,0);
  const box=$("cart-items");
  if(!cart.length){
    box.innerHTML='<p class="empty-cart">Your cart is empty.</p>';
    $("cart-total").textContent="₹0";
    return;
  }
  box.innerHTML=cart.map((x,i)=>`<div class="cart-line"><div class="cart-line-info"><b>${x.name}</b><small>${x.size} · ${x.colour}</small><small>₹${(x.price*x.qty).toLocaleString("en-IN")}</small></div><div class="cart-line-actions"><div class="quantity-control" aria-label="Change quantity"><button type="button" data-qty-change="-1" data-index="${i}" aria-label="Decrease quantity">−</button><span>${x.qty}</span><button type="button" data-qty-change="1" data-index="${i}" aria-label="Increase quantity">+</button></div><button class="remove-item" data-remove="${i}" type="button">Remove</button></div></div>`).join("");
  const total=cart.reduce((n,x)=>n+x.price*x.qty,0);
  $("cart-total").textContent="₹"+total.toLocaleString("en-IN");
  box.querySelectorAll("[data-qty-change]").forEach(button=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.index); const delta=Number(button.dataset.qtyChange);
    if(!cart[index])return;
    cart[index].qty=Math.max(1,(parseInt(cart[index].qty,10)||1)+delta);
    renderCart();
  }));
  box.querySelectorAll("[data-remove]").forEach(button=>button.addEventListener("click",()=>{
    cart.splice(Number(button.dataset.remove),1);renderCart();
  }));
}
document.querySelectorAll(".add-btn").forEach(btn=>btn.addEventListener("click",()=>{
  const product=btn.dataset.priceMap;
  const size=$(btn.dataset.size).value;
  const colour=btn.dataset.colour==="rubber-colour-fixed"?"Pink & Blue":$(btn.dataset.colour).value;
  const quantityInput=$(btn.dataset.qty);
  const requestedQty=Math.max(1,parseInt(quantityInput?.value,10)||1);
  if(quantityInput)quantityInput.value=String(requestedQty);
  const price=prices[product][size];
  const existing=cart.find(x=>x.name===btn.dataset.product&&x.size===size&&x.colour===colour);
  if(existing) existing.qty+=requestedQty;
  else cart.push({name:btn.dataset.product,size,colour,price,qty:requestedQty});
  renderCart();openCart();
}));
renderCart();
function openCart(){
  $("cart-drawer").classList.add("open");$("backdrop").classList.add("open");
  $("cart-drawer").setAttribute("aria-hidden","false");
}
function closeCart(){
  $("cart-drawer").classList.remove("open");$("backdrop").classList.remove("open");
  $("cart-drawer").setAttribute("aria-hidden","true");
}
$("cart-open").addEventListener("click",openCart);
$("cart-close").addEventListener("click",closeCart);
$("backdrop").addEventListener("click",closeCart);
const whatsappOrderButton=$("whatsapp-order");
if(whatsappOrderButton) whatsappOrderButton.addEventListener("click",()=>{
  if(!cart.length){alert("Please add a product to your cart first.");return;}
  const lines=cart.map(x=>`• ${x.name} | ${x.size} | ${x.colour} | Qty ${x.qty} | ₹${(x.price*x.qty).toLocaleString("en-IN")}`).join("\n");
  const msg=encodeURIComponent("Hello Dr.Bohrras, I would like to order:\n"+lines+"\nProduct total: ₹"+cart.reduce((n,x)=>n+x.price*x.qty,0)+"\nPlease confirm delivery charges and availability.");
  const number=(window.STORE_CONFIG&&window.STORE_CONFIG.whatsappNumber)||"";
  if(!number){alert("Please add your WhatsApp number in config.js before publishing.");return;}
  window.open(`https://wa.me/${number}?text=${msg}`,"_blank","noopener");
});
const waFloat=$("whatsapp-float");
if(waFloat) waFloat.addEventListener("click",e=>{e.preventDefault();const n=(window.STORE_CONFIG&&window.STORE_CONFIG.whatsappNumber)||"";if(!n){alert("Please add your WhatsApp number in config.js before publishing.");return;}window.open(`https://wa.me/${n}?text=${encodeURIComponent("Hello Dr.Bohrras, I have an inquiry about your baby-care products.")}`,"_blank","noopener");});
