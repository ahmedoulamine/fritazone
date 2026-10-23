const STORAGE_KEY = 'frita_zone_cart_v1';
const cartItems = new Map();
const list = document.querySelector('#cart-items');
const cartLink = document.querySelector('.cart');
const count = document.createElement('span');
count.className = 'cart-count';
cartLink.append(count);
const dialog = document.querySelector('#commande');
const status = document.querySelector('#cart-status');
const checkout = document.querySelector('#checkout-cart');
const productButtons = [...document.querySelectorAll('.add-to-cart')];
let timer;
let totalPrice = 0;

/* Sauvegarde et persistance dans le localStorage */
function saveCartToStorage() {
  try {
    const serialized = Array.from(cartItems.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.warn('Impossible de sauvegarder le panier:', err);
  }
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw);
    if (Array.isArray(entries)) {
      entries.forEach(([id, item]) => {
        if (item && item.quantity > 0) {
          cartItems.set(id, item);
        }
      });
    }
  } catch (err) {
    console.warn('Impossible de charger le panier:', err);
  }
}

function openCart(event) {
  event?.preventDefault();
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('cart-open');
}

function closeCart() { dialog.close(); }

dialog.addEventListener('close', () => document.body.classList.remove('cart-open'));
dialog.addEventListener('click', (event) => { if (event.target === dialog) closeCart(); });
document.querySelectorAll('a[href="#commande"]').forEach(link => link.addEventListener('click', openCart));
document.querySelector('#floating-cart').addEventListener('click', openCart);
document.querySelector('#close-cart').addEventListener('click', closeCart);
document.querySelector('#continue-shopping').addEventListener('click', closeCart);

const clearCartBtn = document.querySelector('#clear-cart');
if (clearCartBtn) {
  clearCartBtn.addEventListener('click', () => {
    if (cartItems.size === 0) return;
    if (confirm('Voulez-vous vraiment vider votre panier ?')) {
      cartItems.clear();
      saveCartToStorage();
      renderCart();
      announce('Votre panier a été vidé.');
    }
  });
}

function announce(message) {
  status.textContent = message;
  clearTimeout(timer);
  timer = setTimeout(() => { status.textContent = ''; }, 2500);
}

function renderCart(focusId, focusAction) {
  list.replaceChildren();
  let total = 0;
  totalPrice = 0;
  cartItems.forEach((item, id) => {
    total += item.quantity;
    totalPrice += item.price * item.quantity;
    const row = document.createElement('li');
    const photo = document.createElement('img');
    photo.src = item.image; photo.alt = item.name;
    const info = document.createElement('div'); info.className = 'cart-item-info';
    const label = document.createElement('h3'); label.textContent = item.name;
    const controls = document.createElement('div'); controls.className = 'quantity-controls';
    const quantity = document.createElement('span'); quantity.textContent = item.quantity;
    const makeButton = (text, action, callback) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = text;
      button.dataset.action = action; button.dataset.id = id;
      button.setAttribute('aria-label', `${action} : ${item.name}`);
      button.addEventListener('click', callback);
      return button;
    };
    const change = delta => {
      item.quantity += delta;
      if (item.quantity <= 0) cartItems.delete(id);
      saveCartToStorage();
      renderCart(id, delta < 0 ? 'Diminuer' : 'Augmenter');
      announce('Panier mis à jour.');
    };
    controls.append(makeButton('−', 'Diminuer', () => change(-1)), quantity, makeButton('+', 'Augmenter', () => change(1)));
    info.append(label, controls);
    const price = document.createElement('span'); price.className = 'cart-line-price'; price.textContent = `${item.price * item.quantity} DH`;
    const remove = makeButton('×', 'Supprimer', () => {
      cartItems.delete(id);
      saveCartToStorage();
      renderCart(id, 'Supprimer');
      announce(`${item.name} retiré du panier.`);
    });
    remove.className = 'remove-cart-item';
    row.append(photo, info, price, remove); list.append(row);
  });
  count.textContent = total; count.hidden = total === 0;
  document.querySelector('#floating-count').textContent = total;
  document.querySelector('#chosen-count').textContent = total;
  document.querySelector('#cart-total').textContent = `${totalPrice} DH`;
  checkout.textContent = `Commander ${totalPrice} DH`; checkout.disabled = total === 0;
  document.querySelector('#cart-empty').hidden = total !== 0;
  cartLink.setAttribute('aria-label', `Ouvrir le panier, ${total} article(s)`);
  if (focusId !== undefined) {
    const target = [...list.querySelectorAll('button')].find(b => b.dataset.id === focusId && b.dataset.action === focusAction);
    (target || document.querySelector('#close-cart')).focus();
  }
}

function addProduct(button) {
  const id = button.dataset.product;
  if (!cartItems.has(id)) {
    cartItems.set(id, {
      name: button.dataset.name,
      price: Number(button.dataset.price),
      image: button.closest('.product-card').querySelector('img').getAttribute('src'),
      quantity: 0
    });
  }
  cartItems.get(id).quantity++;
  saveCartToStorage();
  renderCart();
  announce(`${button.dataset.name} ajouté au panier.`);
}

productButtons.forEach(button => button.addEventListener('click', () => addProduct(button)));

/* Extras dynamiques : Frites et Boissons dans la barre latérale du panier */
const extrasContainer = document.querySelector('#extras-list');
if (extrasContainer) {
  productButtons.filter(button => button.closest('#frites') || button.closest('#boissons')).forEach(button => {
    const card = document.createElement('div'); card.className = 'extra-card';
    const image = document.createElement('img');
    image.src = button.closest('.product-card').querySelector('img').getAttribute('src');
    image.alt = button.dataset.name; image.loading = 'lazy'; image.decoding = 'async';
    const name = document.createElement('h3'); name.textContent = button.dataset.name;
    const price = document.createElement('p'); price.textContent = `${button.dataset.price} DH`;
    const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Ajouter';
    add.setAttribute('aria-label', `Ajouter : ${button.dataset.name}`);
    add.addEventListener('click', () => addProduct(button));
    card.append(image, name, price, add);
    extrasContainer.append(card);
  });
}

const confirmation = document.querySelector('#confirmation');
const confirmationForm = document.querySelector('#confirmation-form');

function syncDelivery() {
  const delivery = confirmationForm.elements.delivery.value === 'delivery';
  document.querySelector('#address-field').hidden = !delivery;
  document.querySelector('#customer-address').required = delivery;
  document.querySelector('#delivery-cost').textContent = delivery ? 'Frais à confirmer' : 'À emporter';
}

confirmationForm.querySelectorAll('input[name="delivery"]').forEach(input => input.addEventListener('change', syncDelivery));

checkout.addEventListener('click', () => {
  if (!cartItems.size) return;
  const summary = document.querySelector('#confirmation-items');
  summary.replaceChildren();
  cartItems.forEach(item => {
    const row = document.createElement('li');
    const image = document.createElement('img'); image.src = item.image; image.alt = item.name;
    const label = document.createElement('span'); label.textContent = `${item.name} × ${item.quantity}`;
    const price = document.createElement('strong'); price.textContent = `${item.price * item.quantity} DH`;
    row.append(image, label, price); summary.append(row);
  });
  document.querySelector('#confirmation-subtotal').textContent = `${totalPrice} DH`;
  document.querySelector('#confirmation-total').textContent = `${totalPrice} DH`;
  document.querySelector('#confirmation-status').textContent = '';
  syncDelivery();
  closeCart(); confirmation.showModal(); document.body.classList.add('cart-open');
});

confirmation.addEventListener('close', () => document.body.classList.remove('cart-open'));
document.querySelector('#close-confirmation').addEventListener('click', () => confirmation.close());
document.querySelector('#back-to-cart').addEventListener('click', () => { confirmation.close(); openCart(); });

confirmationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!cartItems.size || !confirmationForm.reportValidity()) return;
  const name = document.querySelector('#customer-name').value.trim();
  const phone = document.querySelector('#customer-phone').value.trim();
  const address = document.querySelector('#customer-address').value.trim();
  const notes = document.querySelector('#customer-notes').value.trim();
  const delivery = confirmationForm.elements.delivery.value === 'delivery';
  
  if (!name || (delivery && !address)) {
    document.querySelector('#confirmation-status').textContent = 'Veuillez renseigner votre nom et votre adresse pour la livraison.';
    return;
  }

  // Sauces sélectionnées
  const selectedSauces = [...confirmationForm.querySelectorAll('input[name="sauce"]:checked')].map(s => s.value);
  const saucesText = selectedSauces.length ? `\nSauces offertes : ${selectedSauces.join(', ')}` : '';

  const lines = [...cartItems.values()].map(item => `${item.quantity} × ${item.name} : ${item.price * item.quantity} DH`);
  const message = `Bonjour Frita Zone, je souhaite passer commande.\n\nProduits :\n${lines.join('\n')}${saucesText}\n\nNom : ${name}\nTéléphone : ${phone}\nMode : ${delivery ? '🛵 Livraison à domicile' : '🥡 À emporter'}${delivery ? '\nAdresse : ' + address : ''}\nRemarques : ${notes || 'Aucune'}\n\nTotal des produits : ${totalPrice} DH${delivery ? '\nFrais de livraison : à confirmer avec vous' : ''}\n\nMerci de confirmer la prise en charge de ma commande !`;
  
  window.open(`https://wa.me/212638295783?text=${encodeURIComponent(message)}`, '_blank');
  document.querySelector('#confirmation-status').textContent = 'Si WhatsApp s’est ouvert, vérifiez le message et appuyez sur Envoyer. Votre panier est conservé.';
});

/* Statut d'ouverture dynamique en direct (Fuseau horaire Maroc) */
function updateRestaurantStatus() {
  const statusIndicator = document.querySelector('#hero-status-indicator');
  const statusText = document.querySelector('#hero-status-text');
  if (!statusIndicator || !statusText) return;

  const now = new Date();
  const hour = now.getHours();
  // Ouvert de 12h00 à 02h00 du matin
  const isOpen = (hour >= 12 || hour < 2);

  if (isOpen) {
    statusIndicator.classList.remove('closed');
    statusText.textContent = '🟢 Ouvert actuellement (12h - 02h) • Taroudant';
  } else {
    statusIndicator.classList.add('closed');
    statusText.textContent = '🔴 Actuellement fermé • Réouverture à 12h00';
  }
}

/* Service Worker pour PWA (installation mobile) */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW non enregistré:', err);
    });
  });
}

// Initialisation
loadCartFromStorage();
renderCart();
updateRestaurantStatus();
setInterval(updateRestaurantStatus, 60000);
