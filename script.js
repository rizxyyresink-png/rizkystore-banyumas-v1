const { createClient } = window.supabase;
const cfg = window.RIZKY_CONFIG || {};
const online = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR-") && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("YOUR-");
const sb = online ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true}}) : null;

const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
let data={products:[],orders:[],testimonials:[],wa:"6285797103586",storeName:"Rizky Store",qr:"assets/qris-rizky-store.jpg"};
let activeCategory="Semua",selectedProduct=null,isAdmin=false;

function money(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2400)}
function openModal(id){$("#"+id).classList.remove("hidden")}
function closeModal(id){$("#"+id).classList.add("hidden")}

async function loadAll(){
  if(!sb){renderAll();return}
  const [p,o,t,s]=await Promise.all([
    sb.from("products").select("*").order("created_at",{ascending:false}),
    sb.from("orders").select("*").order("created_at",{ascending:false}).limit(10),
    sb.from("testimonials").select("*").order("created_at",{ascending:false}),
    sb.from("store_settings").select("*").eq("id",true).maybeSingle()
  ]);
  if(p.error) console.error(p.error); else data.products=p.data||[];
  if(o.error) console.error(o.error); else data.orders=o.data||[];
  if(t.error) console.error(t.error); else data.testimonials=t.data||[];
  if(s.data){data.wa=s.data.whatsapp||data.wa;data.storeName=s.data.store_name||data.storeName;data.qr=s.data.qr_data||data.qr}
  renderAll();
}
function renderAll(){renderCategories();renderProducts();renderOrders();renderTestimonials();updateQR();renderAdminProducts();renderAdminTestimonials();loadSettingsForm()}
function renderCategories(){
  const cats=["Semua",...new Set(data.products.map(p=>p.category))];
  $("#categoryTabs").innerHTML=cats.map(c=>`<button class="tab ${c===activeCategory?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");
  $$(".tab").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderCategories();renderProducts()});
}
function renderProducts(){
  const q=($("#searchInput")?.value||"").toLowerCase();
  const list=data.products.filter(p=>p.is_active!==false&&(activeCategory==="Semua"||p.category===activeCategory)&&`${p.name} ${p.description}`.toLowerCase().includes(q));
  $("#emptyProducts").classList.toggle("hidden",list.length>0);
  $("#productGrid").innerHTML=list.map(p=>`<article class="product-card">${p.badge?`<span class="badge">${esc(p.badge)}</span>`:""}${p.image_url?`<img class="product-photo" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`:`<div class="product-icon">${p.category==="Top Up"?"◈":p.category==="Jasa"?"✦":p.category==="Akun"?"●":"▣"}</div>`}<h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="price">${money(p.price)}</div><button class="btn btn-primary order-btn" data-id="${p.id}">PESAN SEKARANG →</button></article>`).join("");
  $$(".order-btn").forEach(b=>b.onclick=()=>openCheckout(b.dataset.id));
}
function renderOrders(){
  $("#orderHistory").innerHTML=data.orders.length?data.orders.map(o=>`<div class="order-item"><div><b>${esc(o.product_name)}</b><small>${esc(o.customer_name)} • ${new Date(o.created_at).toLocaleString("id-ID")}</small></div><div><b>${money(o.total)}</b><span class="status">${esc(o.status)}</span></div></div>`).join(""):`<div class="empty">Belum ada pesanan.</div>`;
}
function renderTestimonials(){
  const visible=data.testimonials.filter(t=>t.is_visible!==false);
  $("#testimonialList").innerHTML=visible.length?visible.map(t=>`<article class="testimonial"><b>${esc(t.name)}</b><div class="stars">${"★".repeat(t.rating)}${"☆".repeat(5-t.rating)}</div>${t.image_url?`<img src="${esc(t.image_url)}" alt="Foto testimoni dari ${esc(t.name)}" loading="lazy">`:""}<p>“${esc(t.message)}”</p></article>`).join(""):`<div class="empty">Belum ada testimoni.</div>`;
}
function renderAdminProducts(){
  $("#adminProductList").innerHTML=data.products.length?data.products.map(p=>`<div class="admin-product"><div>${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:""}<b>${esc(p.name)}</b><small>${esc(p.category)} • ${money(p.price)}</small></div><div class="admin-product-actions"><button data-edit="${p.id}">Edit</button><button data-delete="${p.id}">Hapus</button></div></div>`).join(""):`<div class="empty">Belum ada produk. Upload produk pertama dari form di atas.</div>`;
  $$('[data-edit]').forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
  $$('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
}
function renderAdminTestimonials(){
  const el=$("#adminTestimonialList");if(!el)return;
  el.innerHTML=data.testimonials.length?data.testimonials.map(t=>`<div class="admin-testimonial"><div class="admin-testimonial-row"><div>${t.image_url?`<img src="${esc(t.image_url)}" alt="">`:""}<b>${esc(t.name)}</b><small>${"★".repeat(t.rating)}${"☆".repeat(5-t.rating)}<br>${esc(t.message)}</small></div><div class="admin-testimonial-actions"><button data-test-toggle="${t.id}">${t.is_visible!==false?"Sembunyikan":"Tampilkan"}</button><button data-test-delete="${t.id}">Hapus</button></div></div></div>`).join(""):`<div class="empty">Belum ada testimoni.</div>`;
  $$('[data-test-toggle]').forEach(b=>b.onclick=()=>toggleTestimonial(b.dataset.testToggle));
  $$('[data-test-delete]').forEach(b=>b.onclick=()=>deleteTestimonial(b.dataset.testDelete));
}
function updateQR(){
  const area=$("#qrPreview");if(!area)return;
  area.outerHTML=data.qr?`<img id="qrPreview" class="product-photo" src="${esc(data.qr)}" alt="QRIS All Payment">`:`<div id="qrPreview" class="qr-placeholder">QR PEMBAYARAN</div>`;
}
function loadSettingsForm(){if(!$("#settingsForm"))return;$("#settingsForm").elements.wa.value=data.wa;$("#settingsForm").elements.storeName.value=data.storeName;$("#adminQrPreview").innerHTML=data.qr?`<img src="${esc(data.qr)}" alt="QRIS">`:""}

async function uploadImage(bucket,file,folder="uploads"){
  if(!file||!file.size) return "";
  const max=10*1024*1024;
  const allowed=["image/jpeg","image/png","image/webp"];
  if(!allowed.includes(file.type)) throw new Error("Foto harus JPG, PNG, atau WebP.");
  if(file.size>max) throw new Error("Ukuran foto maksimal 10 MB.");
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
  const path=`${folder}/${crypto.randomUUID()}.${ext}`;
  const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
  if(error) throw error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
async function uploadProductImage(file){if(!file||!file.size)throw new Error("Foto produk wajib diisi.");return uploadImage("product-images",file,"products")}

async function openCheckout(id){
  selectedProduct=data.products.find(p=>String(p.id)===String(id));if(!selectedProduct)return;
  $("#checkoutSummary").innerHTML=`<div class="summary-row"><span>Produk</span><span>${esc(selectedProduct.name)}</span></div><div class="summary-row"><span>Total</span><span>${money(selectedProduct.price)}</span></div>`;
  updateQR();openModal("checkoutModal");
}

$("#enterBtn").onclick=async()=>{$("#entryScreen").classList.add("hidden");const a=$("#bgMusic");try{a.volume=.55;await a.play()}catch{toast("Musik belum dapat diputar otomatis. Tekan tombol ♫ jika diperlukan.")}};
$("#musicBtn").onclick=async()=>{const a=$("#bgMusic");if(a.paused){try{await a.play()}catch{toast("File musik tidak dapat diputar.")}}else a.pause()};
$("#adminBtn").onclick=()=>openModal("adminModal");
$("#searchToggle").onclick=()=>{$("#searchBox").classList.toggle("hidden");$("#searchInput").focus()};
$("#searchInput").oninput=renderProducts;
$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$$('.modal').forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden")}));
$("#paymentSelect").onchange=()=>{$("#qrArea").style.display=$("#paymentSelect").value==="QRIS"?"block":"block"};

$("#checkoutForm").onsubmit=async e=>{
  e.preventDefault();if(!sb||!selectedProduct){toast("Supabase belum dikonfigurasi.");return}
  const f=new FormData(e.target);
  const order={product_id:selectedProduct.id,product_name:selectedProduct.name,customer_name:f.get("name"),customer_phone:f.get("phone"),payment_method:f.get("payment"),total:selectedProduct.price,status:"pending"};
  const {error}=await sb.from("orders").insert(order);
  if(error){console.error(error);toast("Pesanan gagal disimpan.");return}
  const wa=(data.wa||"6285797103586").replace(/\D/g,"");
  const text=`Halo ${data.storeName}, saya ingin memesan:\n\nProduk: ${selectedProduct.name}\nTotal: ${money(selectedProduct.price)}\nNama: ${f.get("name")}\nNo. WA: ${f.get("phone")}\nPembayaran: ${f.get("payment")}`;
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`,"_blank");
  closeModal("checkoutModal");e.target.reset();await loadAll();toast("Pesanan tersimpan.");
};

$("#loginForm").onsubmit=async e=>{
  e.preventDefault();if(!sb){toast("Supabase belum dikonfigurasi.");return}
  const f=new FormData(e.target);const {error}=await sb.auth.signInWithPassword({email:f.get("username"),password:f.get("password")});
  if(error){toast("Login gagal. Cek email/password.");return}
  const {data:u}=await sb.auth.getUser();const {data:a,error:ae}=await sb.from("admin_users").select("user_id").eq("user_id",u.user.id).maybeSingle();
  if(ae||!a){await sb.auth.signOut();toast("Akun ini bukan admin.");return}
  isAdmin=true;showAdmin();await loadAll();toast("Login admin berhasil.");
};
function showAdmin(){$("#adminLoginView").classList.add("hidden");$("#adminDashboard").classList.remove("hidden")}
function resetAdmin(){$("#adminLoginView").classList.remove("hidden");$("#adminDashboard").classList.add("hidden")}
$("#logoutBtn").onclick=async()=>{if(sb)await sb.auth.signOut();isAdmin=false;resetAdmin()};

$$('.admin-tab').forEach(b=>b.onclick=()=>{
  $$('.admin-tab').forEach(x=>x.classList.remove("active"));b.classList.add("active");
  const tab=b.dataset.adminTab;
  $("#adminProducts").classList.toggle("hidden",tab!=="products");
  $("#adminTestimonials").classList.toggle("hidden",tab!=="testimonials");
  $("#adminSettings").classList.toggle("hidden",tab!=="settings");
});

$("#productForm").onsubmit=async e=>{
  e.preventDefault();if(!isAdmin)return;
  const f=new FormData(e.target),id=f.get("id"),imageFile=f.get("image");
  try{
    let image_url=id?(data.products.find(x=>String(x.id)===String(id))?.image_url||""):"";
    if(imageFile&&imageFile.size)image_url=await uploadProductImage(imageFile);
    if(!image_url)throw new Error("Foto produk wajib diisi.");
    const obj={name:String(f.get("name")),price:Number(f.get("price")),category:String(f.get("category")),description:String(f.get("description")||""),badge:String(f.get("badge")||""),image_url,is_active:true};
    const result=id?await sb.from("products").update(obj).eq("id",id):await sb.from("products").insert(obj);
    if(result.error)throw result.error;
    e.target.reset();e.target.elements.id.value="";$("#cancelEdit").classList.add("hidden");$("#productImagePreview").innerHTML="";e.target.elements.image.required=true;await loadAll();toast("Produk berhasil disimpan.");
  }catch(err){console.error(err);toast(err.message||"Gagal menyimpan produk.")}
};
$("#cancelEdit").onclick=()=>{$("#productForm").reset();$("#productForm").elements.image.required=true;$("#productImagePreview").innerHTML="";$("#cancelEdit").classList.add("hidden")};
function editProduct(id){const p=data.products.find(x=>String(x.id)===String(id));if(!p)return;const f=$("#productForm");["id","name","price","category","description","badge"].forEach(k=>f.elements[k].value=p[k]??"");f.elements.image.required=false;$("#productImagePreview").innerHTML=p.image_url?`<img src="${esc(p.image_url)}" alt="Preview foto produk">`:"";$("#cancelEdit").classList.remove("hidden")}
async function deleteProduct(id){if(!confirm("Hapus produk ini?"))return;const {error}=await sb.from("products").delete().eq("id",id);if(error){toast("Gagal menghapus produk.");return}await loadAll();toast("Produk dihapus.")}

$("#productForm").elements.image.onchange=e=>{const file=e.target.files[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast("Gunakan JPG, PNG, atau WebP.");e.target.value="";return}if(file.size>10*1024*1024){toast("Foto maksimal 10 MB.");e.target.value="";$("#productImagePreview").innerHTML="";return}const url=URL.createObjectURL(file);$("#productImagePreview").innerHTML=`<img src="${url}" alt="Preview foto produk">`};

$("#settingsForm").onsubmit=async e=>{
  e.preventDefault();if(!isAdmin)return;const f=new FormData(e.target);let qr=data.qr;const file=f.get("qr");
  try{
    if(file&&file.size)qr=await uploadImage("payment-assets",file,"payments");
    const {error}=await sb.from("store_settings").update({store_name:f.get("storeName"),whatsapp:String(f.get("wa")),qr_data:qr}).eq("id",true);
    if(error)throw error;await loadAll();toast("Pengaturan tersimpan.");
  }catch(err){console.error(err);toast(err.message||"Gagal menyimpan pengaturan.")}
};

$("#addTestimonialBtn").onclick=()=>openModal("testimonialModal");
$("#testimonialForm").onsubmit=async e=>{
  e.preventDefault();if(!sb){toast("Supabase belum dikonfigurasi.");return}
  const f=new FormData(e.target);
  try{
    const imageFile=f.get("image");let image_url="";
    if(imageFile&&imageFile.size)image_url=await uploadImage("testimonial-images",imageFile,"testimonials");
    const {error}=await sb.from("testimonials").insert({name:String(f.get("name")),rating:Number(f.get("rating")),message:String(f.get("message")),image_url,is_visible:true});
    if(error)throw error;
    closeModal("testimonialModal");e.target.reset();$("#testimonialImagePreview").innerHTML="";await loadAll();toast("Testimoni berhasil ditambahkan.");
  }catch(err){console.error(err);toast(err.message||"Gagal mengirim testimoni.")}
};
$("#testimonialForm").elements.image.onchange=e=>{const file=e.target.files[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast("Gunakan JPG, PNG, atau WebP.");e.target.value="";return}if(file.size>10*1024*1024){toast("Foto maksimal 10 MB.");e.target.value="";$("#testimonialImagePreview").innerHTML="";return}const url=URL.createObjectURL(file);$("#testimonialImagePreview").innerHTML=`<img src="${url}" alt="Preview foto testimoni">`};

async function toggleTestimonial(id){if(!isAdmin)return;const t=data.testimonials.find(x=>String(x.id)===String(id));if(!t)return;const {error}=await sb.from("testimonials").update({is_visible:!t.is_visible}).eq("id",id);if(error){toast("Gagal mengubah testimoni.");return}await loadAll();toast(t.is_visible?"Testimoni disembunyikan.":"Testimoni ditampilkan.")}
async function deleteTestimonial(id){if(!isAdmin||!confirm("Hapus testimoni ini?"))return;const {error}=await sb.from("testimonials").delete().eq("id",id);if(error){toast("Gagal menghapus testimoni.");return}await loadAll();toast("Testimoni dihapus.")}

$$('.bottom-nav a').forEach(a=>a.onclick=()=>{$$('.bottom-nav a').forEach(x=>x.classList.remove("active"));a.classList.add("active")});

(async()=>{
  if(online){
    const {data:{session}}=await sb.auth.getSession();
    if(session){const {data:u}=await sb.auth.getUser();const {data:a}=await sb.from("admin_users").select("user_id").eq("user_id",u.user.id).maybeSingle();if(a){isAdmin=true;showAdmin()}}
    await loadAll();
  }else{renderAll();toast("Mode demo: isi config.js untuk mengaktifkan Supabase online.")}
})();
