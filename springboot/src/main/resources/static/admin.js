const DEFAULT_PAGE_SIZE = 10;
const REFERENCE_PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 300;
const roleOptions = ["ADMIN", "MANAGER", "SHIPPER", "STAFF", "USER"];

function createEmptyPage() {
  return {
    items: [],
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  };
}

function createEmptySummary() {
  return {
    userCount: 0,
    storeCount: 0,
    eventCount: 0,
    categoryCount: 0,
    dishCount: 0,
    reviewCount: 0,
    newsCount: 0,
  };
}

function createInitialPages() {
  return {
    users: createEmptyPage(),
    stores: createEmptyPage(),
    storeDishes: createEmptyPage(),
    events: createEmptyPage(),
    categories: createEmptyPage(),
    dishes: createEmptyPage(),
    news: createEmptyPage(),
    reviews: createEmptyPage(),
  };
}

function createInitialFilters() {
  return {
    users: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
    stores: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
    storeDishes: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
    events: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
    categories: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
    dishes: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
    news: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
    reviews: { page: 0, size: DEFAULT_PAGE_SIZE, search: "" },
  };
}

const state = {
  token: localStorage.getItem("adminToken") || "",
  section: "users",
  summary: createEmptySummary(),
  pages: createInitialPages(),
  filters: createInitialFilters(),
  references: {
    stores: [],
    categories: [],
    dishes: [],
    users: [],
  },
  me: null,
  searchTimer: null,
};

const elements = {
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  tokenInput: document.getElementById("token-input"),
  loginBtn: document.getElementById("login-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  sessionBadge: document.getElementById("session-badge"),
  statusText: document.getElementById("status-text"),
  sectionTitle: document.getElementById("section-title"),
  sectionEyebrow: document.getElementById("section-eyebrow"),
  formTitle: document.getElementById("form-title"),
  tableHead: document.getElementById("table-head"),
  tableBody: document.getElementById("table-body"),
  form: document.getElementById("editor-form"),
  formFields: document.getElementById("form-fields"),
  editorId: document.getElementById("editor-id"),
  saveBtn: document.querySelector("#editor-form button[type='submit']"),
  deleteBtn: document.getElementById("delete-btn"),
  resetBtn: document.getElementById("reset-btn"),
  newItemBtn: document.getElementById("new-item-btn"),
  nav: document.getElementById("section-nav"),
  sectionSearch: document.getElementById("section-search"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  prevPageBtn: document.getElementById("prev-page-btn"),
  nextPageBtn: document.getElementById("next-page-btn"),
  pageIndicator: document.getElementById("page-indicator"),
  pageMeta: document.getElementById("page-meta"),
};

const sectionConfigs = {
  users: {
    title: "Users",
    singular: "User",
    eyebrow: "Account management",
    dataKey: "users",
    endpoint: "/api/admin/users",
    searchPlaceholder: "Search by name, email, role, store, enabled state...",
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", placeholder: "Leave blank to keep current password" },
      { name: "role", label: "Role", type: "select", required: true, options: () => roleOptions.map((value) => ({ value, label: value })) },
      { name: "workingStoreId", label: "Working store", type: "select", valueType: "number", options: () => state.references.stores.map((item) => ({ value: item.id, label: `${item.id} - ${item.name} (${safe(item.address)})` })) },
      { name: "enabled", label: "Enabled", type: "checkbox" },
    ],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "User", render: (item) => `${item.fullName}<br><small>${item.email}</small>` },
      { label: "Role", render: (item) => item.role },
      { label: "Working store", render: (item) => item.workingStoreName ? `${item.workingStoreName}<br><small>${safe(item.workingStoreAddress)}</small>` : "-" },
      { label: "Enabled", render: (item) => yesNo(item.enabled) },
      { label: "Verified", render: (item) => formatDate(item.verifiedAt) },
    ],
  },
  stores: {
    title: "Stores",
    singular: "Store",
    eyebrow: "Store catalog",
    dataKey: "stores",
    endpoint: "/api/admin/stores",
    searchPlaceholder: "Search by store name, address, contact, image path...",
    fields: [
      { name: "name", label: "Store name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "address", label: "Address", type: "text" },
      { name: "contactEmail", label: "Contact email", type: "email" },
      { name: "phoneNumber", label: "Phone number", type: "text" },
      { name: "imagePaths", label: "Image paths", type: "textarea-list", placeholder: "/uploads/stores/store-1.jpg\n/uploads/stores/store-2.jpg" },
      { name: "__storeUpload", label: "Upload images", type: "image-upload", targetField: "imagePaths", folder: "stores" },
      { name: "active", label: "Active", type: "checkbox" },
    ],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "Store", render: (item) => `${item.name}<br><small>${safe(item.address)}</small>` },
      { label: "Contact", render: (item) => `${safe(item.contactEmail)}<br><small>${safe(item.phoneNumber)}</small>` },
      { label: "Images", render: (item) => formatImagePaths(item.imagePaths) },
      { label: "Active", render: (item) => yesNo(item.active) },
    ],
  },
  events: {
    title: "Events",
    singular: "Event",
    eyebrow: "Event management",
    dataKey: "events",
    endpoint: "/api/admin/events",
    searchPlaceholder: "Search by event, store, location, date, image path...",
    fields: [
      { name: "storeId", label: "Store", type: "select", required: true, valueType: "number", options: () => state.references.stores.map((item) => ({ value: item.id, label: `${item.id} - ${item.name}` })) },
      { name: "name", label: "Event name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "location", label: "Location", type: "text" },
      { name: "imagePaths", label: "Image paths", type: "textarea-list", placeholder: "/uploads/events/event-1.jpg\n/uploads/events/event-2.jpg" },
      { name: "__eventUpload", label: "Upload images", type: "image-upload", targetField: "imagePaths", folder: "events" },
      { name: "startsAt", label: "Starts at", type: "datetime-local", required: true },
      { name: "endsAt", label: "Ends at", type: "datetime-local", required: true },
      { name: "active", label: "Active", type: "checkbox" },
    ],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "Event", render: (item) => `${item.name}<br><small>${safe(item.location)}</small>` },
      { label: "Store", render: (item) => item.storeName },
      { label: "Images", render: (item) => formatImagePaths(item.imagePaths) },
      { label: "Starts", render: (item) => formatDate(item.startsAt) },
      { label: "Ends", render: (item) => formatDate(item.endsAt) },
      { label: "Active", render: (item) => yesNo(item.active) },
    ],
  },
  categories: {
    title: "Categories",
    singular: "Category",
    eyebrow: "Category management",
    dataKey: "categories",
    endpoint: "/api/admin/categories",
    searchPlaceholder: "Search by category, store, description, image path...",
    fields: [
      { name: "storeId", label: "Store", type: "select", required: true, valueType: "number", options: () => state.references.stores.map((item) => ({ value: item.id, label: `${item.id} - ${item.name}` })) },
      { name: "name", label: "Category name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "imagePaths", label: "Image paths", type: "textarea-list", placeholder: "/uploads/categories/category-1.jpg\n/uploads/categories/category-2.jpg" },
      { name: "__categoryUpload", label: "Upload images", type: "image-upload", targetField: "imagePaths", folder: "categories" },
      { name: "active", label: "Active", type: "checkbox" },
    ],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "Category", render: (item) => `${item.name}<br><small>${safe(item.description)}</small>` },
      { label: "Store", render: (item) => item.storeName },
      { label: "Images", render: (item) => formatImagePaths(item.imagePaths) },
      { label: "Active", render: (item) => yesNo(item.active) },
    ],
  },
  dishes: {
    title: "Dishes",
    singular: "Dish",
    eyebrow: "Menu management",
    dataKey: "dishes",
    endpoint: "/api/admin/dishes",
    searchPlaceholder: "Search by dish, category, store, price, image path...",
    fields: [
      { name: "name", label: "Dish name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "price", label: "Price", type: "number", required: true, step: "0.01", min: "0" },
      { name: "categoryId", label: "Category", type: "select", required: true, valueType: "number", options: () => state.references.categories.map((item) => ({ value: item.id, label: `${item.id} - ${item.storeName} / ${item.name}` })) },
      { name: "imagePaths", label: "Image paths", type: "textarea-list", placeholder: "/uploads/dishes/dish-1.jpg\n/uploads/dishes/dish-2.jpg" },
      { name: "__dishUpload", label: "Upload images", type: "image-upload", targetField: "imagePaths", folder: "dishes" },
      { name: "available", label: "Available", type: "checkbox" },
    ],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "Dish", render: (item) => `${item.name}<br><small>${safe(item.description)}</small>` },
      { label: "Store", render: (item) => item.storeName },
      { label: "Category", render: (item) => item.categoryName },
      { label: "Images", render: (item) => formatImagePaths(item.imagePaths) },
      { label: "Price", render: (item) => formatPrice(item.price) },
      { label: "Available", render: (item) => yesNo(item.available) },
    ],
  },
  storeDishes: {
    title: "Store Dishes",
    singular: "Store Dish",
    eyebrow: "Store inventory and overrides",
    dataKey: "storeDishes",
    endpoint: "/api/admin/store-dishes",
    searchPlaceholder: "Search by store, dish, category, quantity, or price override...",
    fields: [
      { name: "storeId", label: "Store", type: "select", required: true, valueType: "number", options: () => state.references.stores.map((item) => ({ value: item.id, label: `${item.id} - ${item.name}` })) },
      { name: "dishId", label: "Dish", type: "select", required: true, valueType: "number", options: () => state.references.dishes.map((item) => ({ value: item.id, label: `${item.id} - ${item.name}` })) },
      { name: "quantity", label: "Quantity", type: "number", required: true, min: "0", step: "1" },
      { name: "priceOverride", label: "Price override", type: "number", min: "0", step: "0.01" },
      { name: "available", label: "Available", type: "checkbox" },
    ],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "Store", render: (item) => item.storeName },
      { label: "Dish", render: (item) => `${item.dishName}<br><small>${safe(item.categoryName)}</small>` },
      { label: "Base", render: (item) => formatPrice(item.basePrice) },
      { label: "Override", render: (item) => item.priceOverride != null ? formatPrice(item.priceOverride) : "-" },
      { label: "Effective", render: (item) => formatPrice(item.effectivePrice) },
      { label: "Qty", render: (item) => item.quantity },
      { label: "Available", render: (item) => yesNo(item.available) },
    ],
  },
  reviews: {
    title: "Reviews",
    singular: "Review",
    eyebrow: "User feedback management",
    dataKey: "reviews",
    endpoint: "/api/admin/reviews",
    searchPlaceholder: "Search by buyer, target, rating, title, or comment...",
    readOnly: true,
    fields: [],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "User", render: (item) => `${safe(item.userName)}<br><small>${item.userEmail}</small>` },
      { label: "Target", render: (item) => `${item.targetType}<br><small>${item.targetLabel}</small>` },
      { label: "Target images", render: (item) => formatImagePaths(item.targetImagePaths) },
      { label: "Rating", render: (item) => `${item.rating}/5` },
    ],
  },
  news: {
    title: "News",
    singular: "News Article",
    eyebrow: "Newsroom management",
    dataKey: "news",
    endpoint: "/api/admin/news",
    searchPlaceholder: "Search by title, slug, summary, content, tag, or store...",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", placeholder: "Leave blank to auto-generate from title" },
      { name: "summary", label: "Summary", type: "textarea", required: true },
      { name: "content", label: "Content", type: "textarea", required: true },
      { name: "relatedStoreId", label: "Related store", type: "select", valueType: "number", options: () => state.references.stores.map((item) => ({ value: item.id, label: `${item.id} - ${item.name}` })) },
      { name: "tags", label: "Tags", type: "textarea-list", placeholder: "launch\nairport\ncommunity" },
      { name: "imagePaths", label: "Image paths", type: "textarea-list", placeholder: "/uploads/news/article-1.jpg\n/uploads/news/article-2.jpg" },
      { name: "__newsUpload", label: "Upload images", type: "image-upload", targetField: "imagePaths", folder: "news" },
      { name: "featured", label: "Featured", type: "checkbox" },
      { name: "published", label: "Published", type: "checkbox" },
      { name: "publishedAt", label: "Published at", type: "datetime-local" },
    ],
    columns: [
      { label: "ID", render: (item) => item.id },
      { label: "Article", render: (item) => `${item.title}<br><small>${safe(item.summary)}</small>` },
      { label: "Store", render: (item) => item.relatedStoreName || "-" },
      { label: "Tags", render: (item) => formatList(item.tags) },
      { label: "Images", render: (item) => formatImagePaths(item.imagePaths) },
      { label: "Published at", render: (item) => formatDate(item.publishedAt) },
      { label: "Featured", render: (item) => yesNo(item.featured) },
      { label: "Published", render: (item) => yesNo(item.published) },
    ],
  },
};

function safe(value) {
  return value ?? "-";
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function formatDateInput(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
}

function formatImagePaths(values) {
  if (!Array.isArray(values) || !values.length) {
    return "-";
  }
  return values
    .map((value) => `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`)
    .join("<br>");
}

function formatList(values) {
  if (!Array.isArray(values) || !values.length) {
    return "-";
  }
  return values.join(", ");
}

function getAccessibleSections() {
  if (!state.me) {
    return Object.keys(sectionConfigs);
  }
  if (state.me.role === "MANAGER") {
    return ["reviews"];
  }
  return Object.keys(sectionConfigs);
}

function isSectionAccessible(section) {
  return getAccessibleSections().includes(section);
}

function getSingularLabel(config) {
  return config.singular || config.title.replace(/s$/, "");
}

function parseListValue(value) {
  if (!value) {
    return [];
  }
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function stringifyListValue(values) {
  if (!Array.isArray(values) || !values.length) {
    return "";
  }
  return values.join("\n");
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.style.color = isError ? "var(--warn)" : "var(--muted)";
}

function getToken() {
  return elements.tokenInput.value.trim();
}

function setToken(token) {
  state.token = token || "";
  elements.tokenInput.value = state.token;
  if (state.token) {
    localStorage.setItem("adminToken", state.token);
  } else {
    localStorage.removeItem("adminToken");
  }
}

async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(options.headers || {}),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  const response = await fetch(path, { ...options, headers });
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed: ${response.status}`);
  }
  return payload;
}

function buildListPath(section) {
  const config = sectionConfigs[section];
  const filter = state.filters[section];
  const params = new URLSearchParams({
    page: String(filter.page),
    size: String(filter.size),
  });
  if (filter.search.trim()) {
    params.set("search", filter.search.trim());
  }
  return `${config.endpoint}?${params.toString()}`;
}

function renderSummary() {
  document.getElementById("count-users").textContent = state.summary.userCount;
  document.getElementById("count-stores").textContent = state.summary.storeCount;
  document.getElementById("count-events").textContent = state.summary.eventCount;
  document.getElementById("count-categories").textContent = state.summary.categoryCount;
  document.getElementById("count-dishes").textContent = state.summary.dishCount;
  document.getElementById("count-reviews").textContent = state.summary.reviewCount;
  document.getElementById("count-news").textContent = state.summary.newsCount;
}

function renderSectionNav() {
  elements.nav.querySelectorAll("button[data-section]").forEach((button) => {
    const accessible = isSectionAccessible(button.dataset.section);
    button.hidden = !accessible;
    button.disabled = !accessible;
    button.classList.toggle("is-active", button.dataset.section === state.section);
  });
}

function renderSectionControls() {
  const config = sectionConfigs[state.section];
  const filter = state.filters[state.section];
  elements.sectionSearch.value = filter.search;
  elements.sectionSearch.placeholder = config.searchPlaceholder || "Search current section";
}

function renderForm() {
  const config = sectionConfigs[state.section];
  elements.sectionTitle.textContent = config.title;
  elements.sectionEyebrow.textContent = config.eyebrow;
  elements.formTitle.textContent = `${elements.editorId.value ? "Edit" : "Create"} ${getSingularLabel(config)}`;
  elements.formFields.innerHTML = "";
  elements.saveBtn.disabled = Boolean(config.readOnly);
  elements.newItemBtn.disabled = Boolean(config.readOnly);
  elements.resetBtn.disabled = false;

  if (config.readOnly) {
    const selectedReview = (state.pages[config.dataKey].items || []).find((item) => String(item.id) === elements.editorId.value);
    elements.formTitle.textContent = selectedReview ? `Review #${selectedReview.id}` : "Review details";
    elements.formFields.innerHTML = selectedReview ? `
      <div class="readonly-note">
        <p><strong>User:</strong> ${safe(selectedReview.userName)} / ${selectedReview.userEmail}</p>
        <p><strong>Target:</strong> ${selectedReview.targetType} / ${selectedReview.targetLabel}</p>
        <p><strong>Rating:</strong> ${selectedReview.rating}/5</p>
        <p><strong>Title:</strong> ${safe(selectedReview.title)}</p>
        <p><strong>Comment:</strong> ${safe(selectedReview.comment)}</p>
      </div>
    ` : `
      <div class="readonly-note">
        <p>Reviews are created by logged-in <strong>USER</strong> accounts through <code>/api/user/reviews</code>.</p>
        <p><strong>ADMIN</strong> and <strong>MANAGER</strong> can view and delete reviews here.</p>
      </div>
    `;
    elements.deleteBtn.disabled = !elements.editorId.value;
    return;
  }

  config.fields.forEach((field) => {
    if (field.type === "checkbox") {
      const row = document.createElement("label");
      row.className = "checkbox-row";
      row.innerHTML = `
        <input type="checkbox" id="field-${field.name}">
        <span>${field.label}</span>
      `;
      elements.formFields.appendChild(row);
      return;
    }

    const wrapper = document.createElement("label");
    wrapper.innerHTML = `<span>${field.label}</span>`;
    let control;

    if (field.type === "textarea" || field.type === "textarea-list") {
      control = document.createElement("textarea");
      control.rows = field.type === "textarea-list" ? 5 : 4;
    } else if (field.type === "image-upload") {
      wrapper.className = "upload-field";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.multiple = true;
      fileInput.accept = "image/*";
      fileInput.id = `field-${field.name}`;

      const uploadButton = document.createElement("button");
      uploadButton.type = "button";
      uploadButton.textContent = "Upload selected images";
      uploadButton.dataset.action = "upload-images";
      uploadButton.dataset.inputId = fileInput.id;
      uploadButton.dataset.targetField = field.targetField;
      uploadButton.dataset.folder = field.folder;

      wrapper.appendChild(fileInput);
      wrapper.appendChild(uploadButton);
      elements.formFields.appendChild(wrapper);
      return;
    } else if (field.type === "select") {
      control = document.createElement("select");
      const options = field.options();
      control.innerHTML = `<option value="">Select ${field.label}</option>` +
        options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
    } else {
      control = document.createElement("input");
      control.type = field.type;
      if (field.step) control.step = field.step;
      if (field.min) control.min = field.min;
      if (field.max) control.max = field.max;
    }

    control.id = `field-${field.name}`;
    control.placeholder = field.placeholder || "";
    control.required = Boolean(field.required);
    wrapper.appendChild(control);
    elements.formFields.appendChild(wrapper);
  });

  elements.deleteBtn.disabled = !elements.editorId.value;
}

function buildPayload() {
  const config = sectionConfigs[state.section];
  const payload = {};

  config.fields.forEach((field) => {
    const input = document.getElementById(`field-${field.name}`);
    if (field.type === "checkbox") {
      payload[field.name] = input.checked;
      return;
    }

    if (field.type === "image-upload") {
      return;
    }

    const rawValue = input.value;
    if (field.type === "datetime-local") {
      payload[field.name] = rawValue ? new Date(rawValue).toISOString() : null;
      return;
    }

    if (field.type === "textarea-list") {
      payload[field.name] = parseListValue(rawValue);
      return;
    }

    if (field.type === "number" || field.valueType === "number") {
      payload[field.name] = rawValue === "" ? null : Number(rawValue);
      return;
    }

    payload[field.name] = rawValue === "" ? null : rawValue.trim();
  });

  return payload;
}

function resetForm() {
  elements.editorId.value = "";
  renderForm();
}

function fillForm(item) {
  const config = sectionConfigs[state.section];
  elements.editorId.value = item.id;
  renderForm();

  config.fields.forEach((field) => {
    const input = document.getElementById(`field-${field.name}`);
    if (field.type === "checkbox") {
      input.checked = Boolean(item[field.name]);
    } else if (field.type === "image-upload") {
      input.value = "";
    } else if (field.type === "datetime-local") {
      input.value = formatDateInput(item[field.name]);
    } else if (field.type === "textarea-list") {
      input.value = stringifyListValue(item[field.name]);
    } else {
      input.value = item[field.name] ?? "";
    }
  });

  elements.formTitle.textContent = `Edit ${getSingularLabel(config)}`;
  elements.deleteBtn.disabled = false;
}

function renderTable() {
  const config = sectionConfigs[state.section];
  const page = state.pages[config.dataKey];
  const items = page.items || [];

  elements.tableHead.innerHTML = `
    <tr>
      ${config.columns.map((column) => `<th>${column.label}</th>`).join("")}
      <th>Actions</th>
    </tr>
  `;

  if (!items.length) {
    elements.tableBody.innerHTML = `<tr><td colspan="${config.columns.length + 1}">No items found.</td></tr>`;
    return;
  }

  elements.tableBody.innerHTML = items
    .map((item) => `
      <tr>
        ${config.columns.map((column) => `<td>${column.render(item)}</td>`).join("")}
        <td>${renderActionButtons(item, config)}</td>
      </tr>
    `)
    .join("");
}

function renderActionButtons(item, config) {
  if (config.dataKey === "reviews") {
    return `
      <div class="table-actions">
        <button type="button" class="ghost" data-action="edit" data-id="${item.id}">View</button>
        <button type="button" class="danger" data-action="delete" data-id="${item.id}">Delete</button>
      </div>
    `;
  }

  return `
    <div class="table-actions">
      <button type="button" class="ghost" data-action="edit" data-id="${item.id}">Edit</button>
      <button type="button" class="danger" data-action="delete" data-id="${item.id}">Delete</button>
    </div>
  `;
}

function renderPagination() {
  const config = sectionConfigs[state.section];
  const page = state.pages[config.dataKey];
  const totalPages = page.totalPages > 0 ? page.totalPages : 1;
  const start = page.totalItems === 0 ? 0 : page.page * page.size + 1;
  const end = page.totalItems === 0 ? 0 : Math.min(page.totalItems, start + page.items.length - 1);

  elements.pageIndicator.textContent = `Page ${page.page + 1} / ${totalPages}`;
  elements.pageMeta.textContent = `Showing ${start}-${end} of ${page.totalItems} item(s)`;
  elements.prevPageBtn.disabled = !page.hasPrevious;
  elements.nextPageBtn.disabled = !page.hasNext;
}

async function fetchSummary() {
  state.summary = await apiRequest("/api/admin/summary");
}

async function fetchReferenceData() {
  const [storesPage, categoriesPage, dishesPage, usersPage] = await Promise.all([
    apiRequest(`/api/admin/stores?page=0&size=${REFERENCE_PAGE_SIZE}`),
    apiRequest(`/api/admin/categories?page=0&size=${REFERENCE_PAGE_SIZE}`),
    apiRequest(`/api/admin/dishes?page=0&size=${REFERENCE_PAGE_SIZE}`),
    apiRequest(`/api/admin/users?page=0&size=${REFERENCE_PAGE_SIZE}`),
  ]);
  state.references.stores = storesPage.items || [];
  state.references.categories = categoriesPage.items || [];
  state.references.dishes = dishesPage.items || [];
  state.references.users = usersPage.items || [];
}

async function fetchSectionPage(section = state.section) {
  const config = sectionConfigs[section];
  let page = await apiRequest(buildListPath(section));
  if (!page.items?.length && page.page > 0) {
    state.filters[section].page = Math.max(page.page - 1, 0);
    page = await apiRequest(buildListPath(section));
  }
  state.pages[config.dataKey] = page;
}

function renderCurrentSection() {
  renderSectionNav();
  renderSectionControls();
  renderForm();
  renderTable();
  renderPagination();
}

function resetAdminState() {
  state.me = null;
  state.summary = createEmptySummary();
  state.pages = createInitialPages();
  state.filters = createInitialFilters();
  state.references = { stores: [], categories: [], dishes: [], users: [] };
  window.clearTimeout(state.searchTimer);
  state.searchTimer = null;
}

async function loadAdminData() {
  if (!getToken()) {
    setStatus("Please login as ADMIN or MANAGER first.", true);
    return;
  }

  try {
    const me = await apiRequest("/api/auth/me");
    state.me = me.user;
    if (!["ADMIN", "MANAGER"].includes(state.me.role)) {
      throw new Error("Current account is not ADMIN or MANAGER");
    }

    if (!isSectionAccessible(state.section)) {
      state.section = getAccessibleSections()[0];
    }

    if (state.me.role === "ADMIN") {
      await Promise.all([fetchSummary(), fetchReferenceData(), fetchSectionPage(state.section)]);
    } else {
      state.summary = createEmptySummary();
      state.references = { stores: [], categories: [], dishes: [], users: [] };
      await fetchSectionPage(state.section);
    }
    elements.editorId.value = "";
    renderSummary();
    renderCurrentSection();
    elements.sessionBadge.textContent = `Logged in as ${state.me.fullName} (${state.me.email}) - ${state.me.role}`;
    setStatus("Admin data refreshed successfully.");
  } catch (error) {
    resetAdminState();
    renderSummary();
    renderCurrentSection();
    elements.sessionBadge.textContent = "No active admin session";
    setStatus(error.message, true);
  }
}

async function refreshCurrentSection(successMessage) {
  if (state.me?.role === "ADMIN") {
    await Promise.all([fetchSummary(), fetchReferenceData(), fetchSectionPage(state.section)]);
  } else {
    await fetchSectionPage(state.section);
  }
  renderSummary();
  renderCurrentSection();
  if (successMessage) {
    setStatus(successMessage);
  }
}

async function login() {
  try {
    const payload = {
      email: elements.loginEmail.value.trim(),
      password: elements.loginPassword.value,
    };

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.message || "Login failed");
    }

    setToken(body.accessToken);
    elements.loginPassword.value = "";
    await loadAdminData();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function logout() {
  try {
    if (getToken()) {
      await apiRequest("/api/auth/logout", { method: "POST" });
    }
  } catch (error) {
    console.warn(error);
  } finally {
    setToken("");
    resetAdminState();
    renderSummary();
    renderCurrentSection();
    resetForm();
    elements.sessionBadge.textContent = "No active admin session";
    setStatus("Logged out.");
  }
}

async function saveCurrentItem(event) {
  event.preventDefault();
  const config = sectionConfigs[state.section];
  if (config.readOnly) {
    setStatus("This section is view/delete only.", true);
    return;
  }
  const id = elements.editorId.value;
  const method = id ? "PUT" : "POST";
  const path = id ? `${config.endpoint}/${id}` : config.endpoint;

  try {
    await apiRequest(path, {
      method,
      body: JSON.stringify(buildPayload()),
    });
    resetForm();
    await refreshCurrentSection(`${config.title} saved successfully.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function deleteCurrentItem() {
  const id = elements.editorId.value;
  if (!id) {
    return;
  }

  const config = sectionConfigs[state.section];
  if (!window.confirm(`Delete this ${config.title.slice(0, -1).toLowerCase()}?`)) {
    return;
  }

  try {
    await apiRequest(`${config.endpoint}/${id}`, { method: "DELETE" });
    resetForm();
    await refreshCurrentSection(`${config.title} item deleted.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function handleTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const config = sectionConfigs[state.section];
  const items = state.pages[config.dataKey].items || [];
  const item = items.find((entry) => String(entry.id) === button.dataset.id);
  if (!item) {
    return;
  }

  if (button.dataset.action === "edit") {
    fillForm(item);
  }

  if (button.dataset.action === "delete") {
    elements.editorId.value = item.id;
    deleteCurrentItem();
  }
}

async function handleUploadClick(event) {
  const button = event.target.closest("button[data-action='upload-images']");
  if (!button) {
    return;
  }

  if (!getToken()) {
    setStatus("Please login as ADMIN first.", true);
    return;
  }

  const input = document.getElementById(button.dataset.inputId);
  const targetInput = document.getElementById(`field-${button.dataset.targetField}`);
  if (!input || !targetInput || !input.files.length) {
    setStatus("Please choose at least one image to upload.", true);
    return;
  }

  const formData = new FormData();
  Array.from(input.files).forEach((file) => formData.append("files", file));
  formData.append("folder", button.dataset.folder || "misc");

  try {
    const response = await apiRequest("/api/admin/uploads/images", {
      method: "POST",
      body: formData,
    });
    const merged = [...parseListValue(targetInput.value), ...(response.paths || [])];
    targetInput.value = stringifyListValue([...new Set(merged)]);
    input.value = "";
    setStatus(`Uploaded ${response.paths?.length || 0} image(s) successfully.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function switchSection(section) {
  if (!isSectionAccessible(section)) {
    setStatus("This section is not available for the current role.", true);
    return;
  }
  state.section = section;
  elements.editorId.value = "";
  renderCurrentSection();

  if (!getToken()) {
    return;
  }

  try {
    await fetchSectionPage(section);
    renderCurrentSection();
    setStatus(`${sectionConfigs[section].title} loaded.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function queueSearch() {
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(async () => {
    if (!getToken()) {
      return;
    }

    try {
      state.filters[state.section].page = 0;
      elements.editorId.value = "";
      await fetchSectionPage(state.section);
      renderCurrentSection();
      setStatus(`Filtered ${sectionConfigs[state.section].title.toLowerCase()}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }, SEARCH_DEBOUNCE_MS);
}

async function changePage(direction) {
  if (!getToken()) {
    return;
  }

  const filter = state.filters[state.section];
  filter.page = Math.max(filter.page + direction, 0);

  try {
    elements.editorId.value = "";
    await fetchSectionPage(state.section);
    renderCurrentSection();
  } catch (error) {
    setStatus(error.message, true);
  }
}

elements.nav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-section]");
  if (!button) {
    return;
  }
  switchSection(button.dataset.section);
});

elements.form.addEventListener("submit", saveCurrentItem);
elements.deleteBtn.addEventListener("click", deleteCurrentItem);
elements.resetBtn.addEventListener("click", resetForm);
elements.newItemBtn.addEventListener("click", resetForm);
elements.loginBtn.addEventListener("click", login);
elements.logoutBtn.addEventListener("click", logout);
elements.refreshBtn.addEventListener("click", loadAdminData);
elements.tableBody.addEventListener("click", handleTableClick);
elements.formFields.addEventListener("click", handleUploadClick);
elements.sectionSearch.addEventListener("input", (event) => {
  state.filters[state.section].search = event.target.value;
  queueSearch();
});
elements.clearSearchBtn.addEventListener("click", async () => {
  state.filters[state.section].search = "";
  state.filters[state.section].page = 0;
  elements.sectionSearch.value = "";
  if (!getToken()) {
    return;
  }
  try {
    elements.editorId.value = "";
    await fetchSectionPage(state.section);
    renderCurrentSection();
    setStatus("Search cleared.");
  } catch (error) {
    setStatus(error.message, true);
  }
});
elements.prevPageBtn.addEventListener("click", () => changePage(-1));
elements.nextPageBtn.addEventListener("click", () => changePage(1));

setToken(state.token);
renderSummary();
renderCurrentSection();
if (state.token) {
  loadAdminData();
}
