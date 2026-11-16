// --- CONFIGURATION ---
const SUPABASE_URL = "https://cdhxkhwjleqpsatrcojr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaHhraHdqbGVxcHNhdHJjb2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjUzODEsImV4cCI6MjExMDE0MTM4MX0.sDz0xEEmreArK3dSxdiOpJ8FrtfoiTQKa-mSIPD28JI";
const SELLER_WHATSAPP = "22602846305"; // <-- REMPLACE PAR TON NUMÉRO WHATSAPP

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// --- ÉTAT DE L'APPLICATION ---
let allProducts = [];
let cart = [];

// --- SÉLECTEURS DOM ---
const productsGrid = document.getElementById("products-grid");
const cartDrawer = document.getElementById("cart-drawer");
const cartCount = document.getElementById("cart-count");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

// --- INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
  setupEventListeners();
});

function setupEventListeners() {
  // Boutons d'ouverture/fermeture du panier
  document.getElementById("cart-toggle-btn").addEventListener("click", () => {
    if (cart.length > 0) cartDrawer.classList.toggle("translate-y-full");
  });
  document.getElementById("cart-close-btn").addEventListener("click", () => {
    cartDrawer.classList.add("translate-y-full");
  });

  // Bouton de validation WhatsApp
  document
    .getElementById("checkout-btn")
    .addEventListener("click", checkoutWhatsApp);

  // Filtres par catégorie
  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const category = e.target.dataset.category;
      updateFilterButtons(e.target);
      filterProducts(category);
    });
  });

  // Délégation d'événements pour ajouter au panier
  productsGrid.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-to-cart-btn");
    if (addBtn) {
      const productId = parseInt(addBtn.dataset.id, 10);
      addToCart(productId);
    }
  });

  // Délégation d'événements pour supprimer du panier
  cartItemsContainer.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-item-btn");
    if (removeBtn) {
      const index = parseInt(removeBtn.dataset.index, 10);
      removeFromCart(index);
    }
  });
}

// --- SUPABASE : CHARGEMENT DES DONNÉES ---
async function fetchProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("in_stock", true);

  if (error) {
    console.error("Erreur Supabase:", error);
    productsGrid.innerHTML =
      '<p class="col-span-2 text-center text-red-500 text-xs py-8">Impossible de charger les articles.</p>';
    return;
  }

  allProducts = data;
  renderProducts(allProducts);
}

// --- RENDU VISUEL ---
function renderProducts(products) {
  if (products.length === 0) {
    productsGrid.innerHTML =
      '<p class="col-span-2 text-center text-gray-400 text-xs py-8">Aucun article disponible dans cette catégorie.</p>';
    return;
  }

  productsGrid.innerHTML = products
    .map(
      (p) => `
        <div class="product-card bg-white rounded-2xl p-2.5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
                <div class="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-2 relative">
                    <img src="${p.image_url}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover">
                    <span class="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md text-white text-[9px] px-1.5 py-0.5 rounded-md">${p.category}</span>
                </div>
                <h3 class="font-medium text-xs text-gray-800 line-clamp-1">${p.name}</h3>
                <p class="text-[10px] text-gray-400 mb-1">Tailles : ${p.sizes || "Unique"}</p>
            </div>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <span class="font-bold text-xs text-gray-900">${p.public_price.toLocaleString()} F</span>
                <button data-id="${p.id}" class="add-to-cart-btn bg-gray-900 hover:bg-gray-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition">
                    + Ajouter
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

function updateFilterButtons(activeBtn) {
  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.classList.remove("bg-gray-900", "text-white");
    btn.classList.add("bg-white", "text-gray-700", "border", "border-gray-200");
  });
  activeBtn.classList.remove(
    "bg-white",
    "text-gray-700",
    "border",
    "border-gray-200",
  );
  activeBtn.classList.add("bg-gray-900", "text-white");
}

function filterProducts(category) {
  if (category === "all") {
    renderProducts(allProducts);
  } else {
    renderProducts(allProducts.filter((p) => p.category === category));
  }
}

// --- LOGIQUE DU PANIER ---
function addToCart(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCartUI();
  cartDrawer.classList.remove("translate-y-full");
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.innerText = count;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML =
      '<p class="text-gray-400 text-center py-4">Votre panier est vide</p>';
    cartTotal.innerText = "0 FCFA";
    cartDrawer.classList.add("translate-y-full");
    return;
  }

  let total = 0;
  cartItemsContainer.innerHTML = cart
    .map((item, index) => {
      total += item.public_price * item.quantity;
      return `
            <div class="py-2 flex justify-between items-center border-b border-gray-100 last:border-none">
                <div class="flex items-center gap-3">
                    <img src="${item.image_url}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg border border-gray-100">
                    <div>
                        <p class="font-medium text-xs text-gray-800">${item.name}</p>
                        <p class="text-[10px] text-gray-400">${item.public_price.toLocaleString()} F x ${item.quantity}</p>
                    </div>
                </div>
                <button data-index="${index}" class="remove-item-btn text-red-500 font-bold px-2 py-1 text-xs">✕</button>
            </div>
        `;
    })
    .join("");

  cartTotal.innerText = `${total.toLocaleString()} FCFA`;
}

// --- TUNNEL WHATSAPP ---
function checkoutWhatsApp() {
  if (cart.length === 0) return;

  let message = "Bonjour, je souhaite passer commande sur la boutique :\n\n";
  let total = 0;

  cart.forEach((item) => {
    const subtotal = item.public_price * item.quantity;
    total += subtotal;
    message += `- ${item.quantity}x *${item.name}* (${item.public_price.toLocaleString()} F/u) = ${subtotal.toLocaleString()} FCFA\n`;
    message += `  Visuel : ${item.image_url}\n\n`;
  });

  message += `*Total Général : ${total.toLocaleString()} FCFA*\n`;
  message +=
    "\nMerci de me confirmer la disponibilité et les modalités de livraison.";

  const encodedMessage = encodeURIComponent(message);
  window.open(
    `https://wa.me/${SELLER_WHATSAPP}?text=${encodedMessage}`,
    "_blank",
  );
}
