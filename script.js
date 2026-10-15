const CART_KEY="drbohrras_baby_cart_v1";
let cart=[];
try{cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch(e){cart=[]}
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart))}
const $=id=>document.getElementById(id);
const prices={
  feel:{"S":165,"M":300,"L":545,"XL":1200},
  rubber:{"90 × 100 cm":450,"90 × 200 cm":800,"90 × 300 cm":1050},
  magic:{"90 × 90 cm":350,"90 × 180 cm":550}
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
  box.innerHTML=cart.map((x,i)=>`<div class="cart-line"><div><b>${x.name}</b><small>${x.size} · ${x.colour} · Qty ${x.qty}</small><small>₹${(x.price*x.qty).toLocaleString("en-IN")}</small></div><button class="remove-item" data-remove="${i}">Remove</button></div>`).join("");
  const total=cart.reduce((n,x)=>n+x.price*x.qty,0);
  $("cart-total").textContent="₹"+total.toLocaleString("en-IN");
  document.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{
    cart.splice(Number(b.dataset.remove),1);renderCart();
  }));
}
document.querySelectorAll(".add-btn").forEach(btn=>btn.addEventListener("click",()=>{
  const product=btn.dataset.priceMap;
  const size=$(btn.dataset.size).value;
  const colour=btn.dataset.colour==="rubber-colour-fixed"?"Pink & Blue":$(btn.dataset.colour).value;
  const price=prices[product][size];
  const existing=cart.find(x=>x.name===btn.dataset.product&&x.size===size&&x.colour===colour);
  if(existing) existing.qty+=1;
  else cart.push({name:btn.dataset.product,size,colour,price,qty:1});
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
$("whatsapp-order").addEventListener("click",()=>{
  if(!cart.length){alert("Please add a product to your cart first.");return;}
  const lines=cart.map(x=>`• ${x.name} | ${x.size} | ${x.colour} | Qty ${x.qty} | ₹${x.price}`).join("\n");
  const msg=encodeURIComponent("Hello Dr.Bohrras, I would like to order:\n"+lines+"\nProduct total: ₹"+cart.reduce((n,x)=>n+x.price*x.qty,0)+"\nPlease confirm delivery charges and availability.");
  const number=(window.STORE_CONFIG&&window.STORE_CONFIG.whatsappNumber)||"";
  if(!number){alert("Please add your WhatsApp number in config.js before publishing.");return;}
  window.open(`https://wa.me/${number}?text=${msg}`,"_blank","noopener");
});

const waFloat=$("whatsapp-float");
if(waFloat) waFloat.addEventListener("click",e=>{e.preventDefault();const n=(window.STORE_CONFIG&&window.STORE_CONFIG.whatsappNumber)||"";if(!n){alert("Please add your WhatsApp number in config.js before publishing.");return;}window.open(`https://wa.me/${n}?text=${encodeURIComponent("Hello Dr.Bohrras, I have an inquiry about your baby-care products.")}`,"_blank","noopener");});
