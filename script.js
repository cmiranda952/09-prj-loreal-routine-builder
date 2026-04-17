/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearchInput = document.getElementById("productSearchInput");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const chatToggleButton = document.getElementById("toggleChatSize");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const SELECTED_PRODUCTS_STORAGE_KEY = "lorealSelectedProductIds";

const selectedProductIds = new Set();
let allProducts = [];
let lastFocusedDetailsButton = null;
let productModalCloseTimeoutId = null;
let generatedRoutineText = "";
const conversationHistory = [];

const followUpSystemPrompt =
  "You are a helpful beauty advisor. You can answer only questions related to the generated routine or beauty topics such as skincare, haircare, makeup, fragrance, and grooming. If a question is unrelated, politely refuse and redirect the user to routine or beauty topics.";

/* Escape message content before inserting it into HTML */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Fill the product description panel with the selected product details */
function setProductModalContent(product) {
  const modalTitle = document.getElementById("productModalTitle");
  const modalBrand = document.getElementById("productModalBrand");
  const modalDescription = document.getElementById("productModalDescription");

  modalTitle.textContent = product.name;
  modalBrand.textContent = product.brand;
  modalDescription.textContent = product.description;
}

/* Build one chat message as HTML so the rendering code stays easy to read */
function createChatMessageMarkup(message) {
  const senderLabel = message.role === "user" ? "You" : "Advisor";
  const bubbleClass =
    message.role === "user" ? "chat-message user" : "chat-message advisor";
  const safeContent = escapeHtml(message.content).replace(/\n/g, "<br>");

  return `
    <div class="${bubbleClass}">
      <p class="chat-sender">${senderLabel}</p>
      <div class="chat-bubble">${safeContent}</div>
    </div>
  `;
}

/* Build one selected product chip */
function createSelectedProductMarkup(product) {
  return `
    <div class="selected-item" data-id="${product.id}">
      <span>${product.name}</span>
      <button type="button" class="remove-selected-btn" data-id="${product.id}" aria-label="Remove ${product.name}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `;
}

/* Build one product card */
function createProductCardMarkup(product) {
  const isSelected = selectedProductIds.has(product.id) ? "selected" : "";

  return `
    <div class="product-card ${isSelected}" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button
          type="button"
          class="description-btn"
          data-id="${product.id}"
        >
          Description
        </button>
      </div>
    </div>
  `;
}

/* Update the product card state in the grid without redrawing everything */
function setProductCardSelectedState(productId, isSelected) {
  const productCard = productsContainer.querySelector(
    `.product-card[data-id="${productId}"]`,
  );

  if (productCard) {
    productCard.classList.toggle("selected", isSelected);
  }
}

/* Remove the selected style from every visible card */
function clearAllProductCardSelections() {
  const selectedCards = productsContainer.querySelectorAll(
    ".product-card.selected",
  );

  selectedCards.forEach((card) => card.classList.remove("selected"));
}

/* Add or remove a product from the selection set */
function toggleSelectedProduct(productId) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
    return false;
  }

  selectedProductIds.add(productId);
  return true;
}

/* Create an accessible modal once and reuse it for all products */
const productModal = document.createElement("div");
productModal.className = "product-modal";
productModal.hidden = true;
productModal.innerHTML = `
  <div class="product-modal-backdrop" data-modal-close="backdrop"></div>
  <div
    class="product-modal-content"
    role="dialog"
    aria-modal="true"
    aria-labelledby="productModalTitle"
    aria-describedby="productModalDescription"
  >
    <button type="button" class="close-modal-btn" data-modal-close="button" aria-label="Close product details">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <h3 id="productModalTitle"></h3>
    <p id="productModalBrand" class="product-modal-brand"></p>
    <p id="productModalDescription" class="product-modal-description"></p>
  </div>
`;
document.body.appendChild(productModal);

function openProductModal(product, triggerButton) {
  const closeButton = productModal.querySelector(".close-modal-btn");

  if (productModalCloseTimeoutId) {
    clearTimeout(productModalCloseTimeoutId);
    productModalCloseTimeoutId = null;
  }

  setProductModalContent(product);

  lastFocusedDetailsButton = triggerButton;
  productModal.hidden = false;

  /* Wait one frame so the opening animation has a chance to play */
  requestAnimationFrame(() => {
    productModal.classList.add("is-open");
  });
  closeButton.focus();
}

function closeProductModal() {
  productModal.classList.remove("is-open");

  /* Keep the element in the DOM briefly so the close animation can finish */
  productModalCloseTimeoutId = window.setTimeout(() => {
    productModal.hidden = true;
    productModalCloseTimeoutId = null;
  }, 220);

  if (lastFocusedDetailsButton) {
    lastFocusedDetailsButton.focus();
  }
}

/* Expand or collapse the chat window so more conversation is visible */
function toggleChatBoxSize() {
  const isExpanded = chatForm
    .closest(".chatbox")
    .classList.toggle("is-expanded");

  chatToggleButton.textContent = isExpanded ? "Collapse" : "Expand";
  chatToggleButton.setAttribute("aria-expanded", String(isExpanded));
}

/* Save selected product ids so they survive page reload */
function saveSelectedProductsToStorage() {
  localStorage.setItem(
    SELECTED_PRODUCTS_STORAGE_KEY,
    JSON.stringify([...selectedProductIds]),
  );
}

/* Load previously selected product ids from localStorage */
function loadSelectedProductsFromStorage() {
  const storedIdsJson = localStorage.getItem(SELECTED_PRODUCTS_STORAGE_KEY);

  if (!storedIdsJson) {
    return;
  }

  try {
    const storedIds = JSON.parse(storedIdsJson);

    if (!Array.isArray(storedIds)) {
      return;
    }

    const validProductIds = new Set(allProducts.map((product) => product.id));

    storedIds.forEach((id) => {
      if (validProductIds.has(id)) {
        selectedProductIds.add(id);
      }
    });
  } catch (error) {
    localStorage.removeItem(SELECTED_PRODUCTS_STORAGE_KEY);
  }
}

/* Render the entire conversation again whenever a new message is added */
function renderConversation() {
  chatWindow.innerHTML = conversationHistory
    .map((message) => createChatMessageMarkup(message))
    .join("");

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Get only the fields we want to send to the API */
function getSelectedProductsForRoutine() {
  return [...selectedProductIds]
    .map((productId) => getProductById(productId))
    .filter(Boolean)
    .map((product) => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    }));
}

/* Read Worker URL from secrets.js without redeclaring global variables */
function getWorkerUrl() {
  const globalUrl = (
    globalThis.OPENAI_WORKER_URL ||
    globalThis.WORKER_URL ||
    ""
  ).trim();

  if (globalUrl) {
    return globalUrl;
  }

  if (
    typeof OPENAI_WORKER_URL !== "undefined" &&
    String(OPENAI_WORKER_URL).trim()
  ) {
    return String(OPENAI_WORKER_URL).trim();
  }

  if (typeof WORKER_URL !== "undefined" && String(WORKER_URL).trim()) {
    return String(WORKER_URL).trim();
  }

  return "";
}

/* Support common Worker response shapes */
function extractAssistantContent(data) {
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  if (typeof data?.reply === "string") {
    return data.reply;
  }

  if (typeof data?.content === "string") {
    return data.content;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  return "";
}

/* Send chat-completions style payload to Cloudflare Worker */
async function sendMessagesToWorker(messages) {
  const workerUrl = getWorkerUrl();

  if (!workerUrl) {
    throw new Error(
      "Missing Worker URL. Add OPENAI_WORKER_URL (or WORKER_URL) in secrets.js.",
    );
  }

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage =
      data?.error?.message || data?.message || "Worker request failed.";
    throw new Error(errorMessage);
  }

  const assistantContent = extractAssistantContent(data);

  if (!assistantContent) {
    throw new Error("Worker returned an unexpected response format.");
  }

  return assistantContent;
}

/* Ask OpenAI to build a routine from selected product data */
async function generateRoutineFromSelectedProducts(selectedProducts) {
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor. Build a clear, safe daily routine from the selected products. Use friendly beginner language and structure the routine into morning and evening steps.",
    },
    {
      role: "user",
      content: `Use only these selected products to create a routine:\n\n${JSON.stringify(
        selectedProducts,
        null,
        2,
      )}`,
    },
  ];

  return sendMessagesToWorker(messages);
}

/* Ask follow-up questions using full conversation history */
async function getFollowUpAnswer() {
  const messages = [
    {
      role: "system",
      content: followUpSystemPrompt,
    },
    {
      role: "system",
      content: `Generated routine context:\n${generatedRoutineText}`,
    },
    ...conversationHistory,
  ];

  return sendMessagesToWorker(messages);
}

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Build a quick lookup helper so we can get product details by id */
function getProductById(productId) {
  return allProducts.find((product) => product.id === productId);
}

/* Update the selected products area whenever selection changes */
function renderSelectedProducts() {
  if (selectedProductIds.size === 0) {
    selectedProductsList.innerHTML = `
      <div class="selected-placeholder">No products selected yet.</div>
    `;
    return;
  }

  const selectedProductsHtml = [...selectedProductIds]
    .map((productId) => {
      const product = getProductById(productId);

      if (!product) {
        return "";
      }

      return createSelectedProductMarkup(product);
    })
    .join("");

  selectedProductsList.innerHTML = `
    ${selectedProductsHtml}
    <button type="button" class="clear-selected-btn">Clear all</button>
  `;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found for this category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => createProductCardMarkup(product))
    .join("");
}

/* Filter products by selected category and live search term */
function applyProductFilters() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearchInput.value.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;

    const searchableText =
      `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  displayProducts(filteredProducts);
}

/* Filter and display products when category or search changes */
categoryFilter.addEventListener("change", applyProductFilters);
productSearchInput.addEventListener("input", applyProductFilters);

/* Toggle product selection directly from product cards */
productsContainer.addEventListener("click", (e) => {
  /* Keep card selection and description modal separate */
  const descriptionButton = e.target.closest(".description-btn");

  if (descriptionButton) {
    const productId = Number(descriptionButton.dataset.id);
    const product = getProductById(productId);

    if (!product) {
      return;
    }

    openProductModal(product, descriptionButton);
    return;
  }

  const clickedCard = e.target.closest(".product-card");

  if (!clickedCard) {
    return;
  }

  const productId = Number(clickedCard.dataset.id);

  const isSelected = toggleSelectedProduct(productId);
  clickedCard.classList.toggle("selected", isSelected);
  saveSelectedProductsToStorage();
  renderSelectedProducts();
});

/* Remove selected products directly from the selected list */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-selected-btn");

  if (e.target.closest(".clear-selected-btn")) {
    selectedProductIds.clear();
    saveSelectedProductsToStorage();
    renderSelectedProducts();
    clearAllProductCardSelections();
    return;
  }

  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.id);
  selectedProductIds.delete(productId);
  saveSelectedProductsToStorage();
  renderSelectedProducts();
  setProductCardSelectedState(productId, false);
});

/* Close modal on X button or outside click */
productModal.addEventListener("click", (e) => {
  const closeTarget = e.target.closest("[data-modal-close]");

  if (closeTarget) {
    closeProductModal();
  }
});

/* Generate routine from selected products */
generateRoutineButton.addEventListener("click", async () => {
  const selectedProducts = getSelectedProductsForRoutine();

  if (selectedProducts.length === 0) {
    chatWindow.textContent =
      "Please select at least one product, then click Generate Routine.";
    return;
  }

  generateRoutineButton.disabled = true;
  chatWindow.textContent = "Generating your routine...";

  try {
    const routine = await generateRoutineFromSelectedProducts(selectedProducts);
    generatedRoutineText = routine;

    /* Start a new conversation whenever a new routine is generated */
    conversationHistory.length = 0;
    conversationHistory.push({
      role: "assistant",
      content: `${routine}\n\nYou can now ask follow-up questions about this routine or beauty topics.`,
    });

    renderConversation();
  } catch (error) {
    chatWindow.textContent = `Error: ${error.message}`;
  } finally {
    generateRoutineButton.disabled = false;
  }
});

/* Load all products once so selection can stay in sync */
async function initializeProductSelection() {
  allProducts = await loadProducts();
  loadSelectedProductsFromStorage();
  renderSelectedProducts();
  applyProductFilters();
}

initializeProductSelection();

/* Chat form submission handler for follow-up Q&A */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();

  if (!question) {
    return;
  }

  if (!generatedRoutineText) {
    chatWindow.textContent =
      "Generate a routine first, then ask follow-up questions here.";
    return;
  }

  conversationHistory.push({
    role: "user",
    content: question,
  });

  renderConversation();
  userInput.value = "";
  sendButton.disabled = true;

  try {
    const answer = await getFollowUpAnswer();
    conversationHistory.push({
      role: "assistant",
      content: answer,
    });
    renderConversation();
  } catch (error) {
    conversationHistory.push({
      role: "assistant",
      content: `Error: ${error.message}`,
    });
    renderConversation();
  } finally {
    sendButton.disabled = false;
  }
});

chatToggleButton.addEventListener("click", toggleChatBoxSize);
