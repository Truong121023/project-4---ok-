export const sectionTabs = [
  { key: "users", label: "User" },
  { key: "stores", label: "Stores" },
  { key: "events", label: "Events" },
  { key: "categories", label: "Categories" },
  { key: "dishes", label: "Core dishes" },
  { key: "storeDishes", label: "Store dishes" },
  { key: "news", label: "News" },
  { key: "promotions", label: "Promotions" },
  { key: "userLevels", label: "User levels" },
  { key: "orders", label: "Orders" },
  { key: "reviews", label: "Reviews" },
  { key: "feedbacks", label: "Feedback" },
];

export function toBooleanString(value) {
  return value ? "true" : "false";
}

export function fromBooleanString(value) {
  return value === "true";
}

export function toIdString(value) {
  return value === undefined || value === null ? "" : String(value);
}

export function requiresWorkingStoreRole(role) {
  return ["MANAGER", "SHIPPER", "STAFF"].includes(role);
}

export function toImagePaths(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item));
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

export function toDateTimeInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function toTimeInput(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function toApiTime(value) {
  if (!value) {
    return "";
  }

  const normalized = String(value).trim();
  return normalized.length === 5 ? `${normalized}:00` : normalized;
}

function toApiDateTime(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return normalized;
  }

  return date.toISOString();
}

function toTagArray(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function toContentSectionImagePaths(section) {
  const imagePaths = toImagePaths(section?.imagePaths);
  return imagePaths.length ? imagePaths : toImagePaths(section?.imagePath);
}

function toContentSections(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => {
      const imagePaths = toContentSectionImagePaths(section);

      return {
        title: String(section?.title ?? "").trim(),
        content: String(section?.content ?? "").trim(),
        imagePath: imagePaths[0] ?? "",
        imagePaths,
      };
    })
    .filter((section) => section.title || section.content || section.imagePaths.length);
}

export function createEmptyDraft(sectionKey, collections) {
  switch (sectionKey) {
    case "users":
      return {
        fullName: "",
        email: "",
        password: "",
        role: "USER",
        workingStoreId: "",
        enabled: "true",
      };
    case "stores":
      return {
        name: "",
        slug: "",
        description: "",
        address: "",
        contactEmail: "",
        phoneNumber: "",
        latitude: "",
        longitude: "",
        area: "",
        positionLabel: "",
        hoursText: "",
        openTime: "",
        closeTime: "",
        personality: "",
        designSignature: "",
        franchiseMood: "",
        specialty: "",
        highlightSummary: "",
        highlightTagsText: "",
        serviceTagsText: "",
        imagePaths: [],
        sections: [],
        active: "true",
      };
    case "events":
      return {
        storeId: toIdString(collections.stores[0]?.id),
        name: "",
        slug: "",
        description: "",
        location: "",
        scheduleText: "",
        highlightSummary: "",
        highlightTagsText: "",
        capacity: "",
        bookedCount: "0",
        featuredDishIdsText: "",
        imagePaths: [],
        sections: [],
        startsAt: "",
        endsAt: "",
        active: "true",
      };
    case "categories":
      return {
        storeId: toIdString(collections.stores[0]?.id),
        name: "",
        description: "",
        imagePaths: [],
        sortOrder: "1",
        active: "true",
      };
    case "dishes":
      return {
        name: "",
        description: "",
        note: "",
        price: "",
        status: "ACTIVE",
        available: "true",
        franchiseRequired: "false",
        franchiseNote: "",
        highlightSummary: "",
        highlightTagsText: "",
        imagePaths: [],
        sections: [],
        categoryId: toIdString(collections.categories[0]?.id),
        active: "true",
      };
    case "storeDishes":
      return {
        storeId: toIdString(collections.stores[0]?.id),
        dishId: toIdString(collections.dishes[0]?.id),
        quantity: "0",
        available: "true",
        priceOverride: "",
      };
    case "news":
      return {
        title: "",
        slug: "",
        summary: "",
        content: "",
        relatedStoreId: toIdString(collections.stores[0]?.id),
        tagsText: "",
        imagePaths: [],
        sections: [],
        featured: "false",
        published: "true",
        publishedAt: "",
      };
    case "orders":
      return {
        paymentStatus: "PENDING",
        status: "PENDING",
        deliveringShipperId: "",
        _originalPaymentStatus: "PENDING",
        _originalStatus: "PENDING",
        _originalDeliveringShipperId: "",
      };
    case "promotions":
      return {
        name: "",
        code: "",
        description: "",
        scope: "ORDER",
        discountType: "PERCENT",
        discountTarget: "ITEMS",
        discountValue: "",
        minOrderAmount: "",
        maxDiscountAmount: "",
        creditCost: "",
        usageLimit: "",
        startsAt: "",
        endsAt: "",
        applicableDishIdsText: "",
        eligibleUserLevelIdsText: "",
        active: "true",
      };
    case "userLevels":
      return {
        storeId: "",
        code: "",
        name: "",
        minMembershipPoints: "",
        active: "true",
      };
    case "reviews":
      return {
        approved: "false",
      };
    default:
      return {};
  }
}

export function hydrateSectionDraft(sectionKey, entity) {
  switch (sectionKey) {
    case "users":
      return {
        fullName: entity.fullName ?? "",
        email: entity.email ?? "",
        password: "",
        role: entity.role ?? "USER",
        workingStoreId: toIdString(entity.workingStoreId),
        enabled: toBooleanString(entity.enabled),
      };
    case "stores":
      return {
        name: entity.name ?? "",
        slug: entity.slug ?? "",
        description: entity.description ?? "",
        address: entity.address ?? "",
        contactEmail: entity.contactEmail ?? "",
        phoneNumber: entity.phoneNumber ?? "",
        latitude:
          entity.latitude === undefined || entity.latitude === null ? "" : String(entity.latitude),
        longitude:
          entity.longitude === undefined || entity.longitude === null ? "" : String(entity.longitude),
        area: entity.area ?? "",
        positionLabel: entity.positionLabel ?? "",
        hoursText: entity.hoursText ?? entity.hours ?? "",
        openTime: toTimeInput(entity.openTime),
        closeTime: toTimeInput(entity.closeTime),
        personality: entity.personality ?? "",
        designSignature: entity.designSignature ?? "",
        franchiseMood: entity.franchiseMood ?? "",
        specialty: entity.specialty ?? "",
        highlightSummary: entity.highlightSummary ?? "",
        highlightTagsText: Array.isArray(entity.highlightTags) ? entity.highlightTags.join(", ") : "",
        serviceTagsText: Array.isArray(entity.serviceTags) ? entity.serviceTags.join(", ") : "",
        imagePaths: toImagePaths(entity.imagePaths ?? entity.imagePath),
        sections: toContentSections(entity.sections),
        active: toBooleanString(entity.active),
      };
    case "events":
      return {
        storeId: toIdString(entity.storeId),
        name: entity.name ?? "",
        slug: entity.slug ?? entity.eventSlug ?? "",
        description: entity.description ?? "",
        location: entity.location ?? "",
        scheduleText: entity.scheduleText ?? entity.schedule ?? "",
        highlightSummary: entity.highlightSummary ?? "",
        highlightTagsText: Array.isArray(entity.highlightTags) ? entity.highlightTags.join(", ") : "",
        capacity:
          entity.capacity === undefined || entity.capacity === null ? "" : String(entity.capacity),
        bookedCount:
          entity.bookedCount === undefined || entity.bookedCount === null
            ? "0"
            : String(entity.bookedCount),
        featuredDishIdsText: Array.isArray(entity.featuredDishIds)
          ? entity.featuredDishIds.join(", ")
          : "",
        imagePaths: toImagePaths(entity.imagePaths ?? entity.imagePath),
        sections: toContentSections(entity.sections),
        startsAt: toDateTimeInput(entity.startsAt),
        endsAt: toDateTimeInput(entity.endsAt),
        active: toBooleanString(entity.active),
      };
    case "categories":
      return {
        storeId: toIdString(entity.storeId),
        name: entity.name ?? "",
        description: entity.description ?? "",
        imagePaths: toImagePaths(entity.imagePaths ?? entity.imagePath),
        sortOrder:
          entity.sortOrder === undefined || entity.sortOrder === null ? "1" : String(entity.sortOrder),
        active: toBooleanString(entity.active),
      };
    case "dishes":
      return {
        name: entity.name ?? "",
        description: entity.description ?? "",
        note: entity.note ?? "",
        price: entity.price ?? "",
        status: entity.status ?? "ACTIVE",
        available: toBooleanString(entity.available),
        franchiseRequired: toBooleanString(entity.franchiseRequired),
        franchiseNote: entity.franchiseNote ?? "",
        highlightSummary: entity.highlightSummary ?? "",
        highlightTagsText: Array.isArray(entity.highlightTags) ? entity.highlightTags.join(", ") : "",
        imagePaths: toImagePaths(entity.imagePaths ?? entity.imagePath),
        sections: toContentSections(entity.sections),
        categoryId: toIdString(entity.categoryId),
        active: toBooleanString(entity.active),
      };
    case "storeDishes":
      return {
        storeId: toIdString(entity.storeId),
        dishId: toIdString(entity.dishId),
        quantity: String(entity.quantity ?? 0),
        available: toBooleanString(entity.available),
        priceOverride:
          entity.priceOverride === undefined || entity.priceOverride === null
            ? ""
            : String(entity.priceOverride),
      };
    case "news":
      return {
        title: entity.title ?? "",
        slug: entity.slug ?? "",
        summary: entity.summary ?? "",
        content: entity.content ?? "",
        relatedStoreId: toIdString(entity.relatedStoreId),
        tagsText: Array.isArray(entity.tags) ? entity.tags.join(", ") : "",
        imagePaths: toImagePaths(entity.imagePaths ?? entity.imagePath),
        sections: toContentSections(entity.sections),
        featured: toBooleanString(entity.featured),
        published: toBooleanString(entity.published),
        publishedAt: toDateTimeInput(entity.publishedAt),
      };
    case "orders":
      return {
        paymentStatus: entity.paymentStatus ?? "PENDING",
        status: entity.status ?? "PENDING",
        deliveringShipperId: toIdString(entity.deliveringShipperId),
        _originalPaymentStatus: entity.paymentStatus ?? "PENDING",
        _originalStatus: entity.status ?? "PENDING",
        _originalDeliveringShipperId: toIdString(entity.deliveringShipperId),
      };
    case "promotions":
      return {
        name: entity.name ?? "",
        code: entity.code ?? "",
        description: entity.description ?? "",
        scope: entity.scope ?? "ORDER",
        discountType: entity.discountType ?? "PERCENT",
        discountTarget: entity.discountTarget ?? "ITEMS",
        discountValue:
          entity.discountValue === undefined || entity.discountValue === null
            ? ""
            : String(entity.discountValue),
        minOrderAmount:
          entity.minOrderAmount === undefined ||
          entity.minOrderAmount === null
            ? entity.minimumOrderAmount === undefined || entity.minimumOrderAmount === null
              ? ""
              : String(entity.minimumOrderAmount)
            : String(entity.minOrderAmount),
        maxDiscountAmount:
          entity.maxDiscountAmount === undefined ||
          entity.maxDiscountAmount === null
            ? entity.maximumDiscountAmount === undefined || entity.maximumDiscountAmount === null
              ? ""
              : String(entity.maximumDiscountAmount)
            : String(entity.maxDiscountAmount),
        creditCost:
          entity.creditCost === undefined || entity.creditCost === null
            ? ""
            : String(entity.creditCost),
        usageLimit:
          entity.usageLimit === undefined || entity.usageLimit === null
            ? ""
            : String(entity.usageLimit),
        startsAt: toDateTimeInput(entity.startsAt),
        endsAt: toDateTimeInput(entity.endsAt),
        applicableDishIdsText: Array.isArray(entity.applicableDishIds)
          ? entity.applicableDishIds.join(", ")
          : Array.isArray(entity.promotionDishIds)
            ? entity.promotionDishIds.join(", ")
            : "",
        eligibleUserLevelIdsText: Array.isArray(entity.eligibleUserLevelIds)
          ? entity.eligibleUserLevelIds.join(", ")
          : "",
        active: toBooleanString(entity.active),
      };
    case "userLevels":
      return {
        storeId: toIdString(entity.storeId),
        code: entity.code ?? "",
        name: entity.name ?? "",
        minMembershipPoints:
          entity.minMembershipPoints === undefined || entity.minMembershipPoints === null
            ? entity.minCreditPoints === undefined || entity.minCreditPoints === null
              ? entity.minPaidAmount === undefined || entity.minPaidAmount === null
                ? ""
                : String(entity.minPaidAmount)
              : String(entity.minCreditPoints)
            : String(entity.minMembershipPoints),
        active: toBooleanString(entity.active),
      };
    case "reviews":
      return {
        approved: toBooleanString(entity.approved),
      };
    default:
      return entity;
  }
}

export function serializeSectionDraft(sectionKey, draft) {
  switch (sectionKey) {
    case "users":
      return {
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        password: draft.password?.trim() || undefined,
        role: draft.role,
        workingStoreId:
          requiresWorkingStoreRole(draft.role) && draft.workingStoreId
            ? Number(draft.workingStoreId)
            : null,
        enabled: fromBooleanString(draft.enabled),
      };
    case "stores":
      return {
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim(),
        address: draft.address.trim(),
        contactEmail: draft.contactEmail.trim(),
        phoneNumber: draft.phoneNumber.trim(),
        latitude: toNullableNumber(draft.latitude),
        longitude: toNullableNumber(draft.longitude),
        area: draft.area.trim(),
        positionLabel: draft.positionLabel.trim(),
        hoursText: draft.hoursText.trim(),
        openTime: toApiTime(draft.openTime),
        closeTime: toApiTime(draft.closeTime),
        personality: draft.personality.trim(),
        designSignature: draft.designSignature.trim(),
        franchiseMood: draft.franchiseMood.trim(),
        specialty: draft.specialty.trim(),
        highlightSummary: draft.highlightSummary.trim(),
        highlightTags: toTagArray(draft.highlightTagsText),
        serviceTags: toTagArray(draft.serviceTagsText),
        imagePaths: toImagePaths(draft.imagePaths),
        sections: toContentSections(draft.sections),
        active: fromBooleanString(draft.active),
      };
    case "events":
      return {
        storeId: Number(draft.storeId),
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim(),
        location: draft.location.trim(),
        scheduleText: draft.scheduleText.trim(),
        highlightSummary: draft.highlightSummary.trim(),
        highlightTags: toTagArray(draft.highlightTagsText),
        capacity: toNullableNumber(draft.capacity),
        bookedCount: toNullableNumber(draft.bookedCount),
        featuredDishIds: String(draft.featuredDishIdsText ?? "")
          .split(",")
          .map((value) => Number(String(value).trim()))
          .filter((value) => Number.isFinite(value)),
        imagePaths: toImagePaths(draft.imagePaths),
        sections: toContentSections(draft.sections),
        startsAt: toApiDateTime(draft.startsAt),
        endsAt: toApiDateTime(draft.endsAt),
        active: fromBooleanString(draft.active),
      };
    case "categories":
      return {
        storeId: Number(draft.storeId),
        name: draft.name.trim(),
        description: draft.description.trim(),
        imagePaths: toImagePaths(draft.imagePaths),
        sortOrder: toNullableNumber(draft.sortOrder) ?? 1,
        active: fromBooleanString(draft.active),
      };
    case "dishes":
      return {
        name: draft.name.trim(),
        description: draft.description.trim(),
        note: draft.note.trim(),
        price: Number(draft.price),
        status: draft.status,
        available: fromBooleanString(draft.available),
        franchiseRequired: fromBooleanString(draft.franchiseRequired),
        franchiseNote: draft.franchiseNote.trim() || null,
        highlightSummary: draft.highlightSummary.trim(),
        highlightTags: toTagArray(draft.highlightTagsText),
        categoryId: Number(draft.categoryId),
        imagePaths: toImagePaths(draft.imagePaths),
        sections: toContentSections(draft.sections),
        active: fromBooleanString(draft.active),
      };
    case "storeDishes":
      return {
        storeId: Number(draft.storeId),
        dishId: Number(draft.dishId),
        quantity: Number(draft.quantity),
        available: fromBooleanString(draft.available),
        priceOverride: toNullableNumber(draft.priceOverride),
      };
    case "news":
      return {
        title: draft.title.trim(),
        slug: draft.slug.trim() || undefined,
        summary: draft.summary.trim(),
        content: draft.content.trim(),
        relatedStoreId: draft.relatedStoreId ? Number(draft.relatedStoreId) : null,
        tags: toTagArray(draft.tagsText),
        imagePaths: toImagePaths(draft.imagePaths),
        sections: toContentSections(draft.sections),
        featured: fromBooleanString(draft.featured),
        published: fromBooleanString(draft.published),
        publishedAt: toApiDateTime(draft.publishedAt),
      };
    case "orders":
      {
        const payload = {};
        const deliveringShipperId = draft.deliveringShipperId
          ? Number(draft.deliveringShipperId)
          : null;

        if (draft.paymentStatus !== draft._originalPaymentStatus) {
          payload.paymentStatus = draft.paymentStatus;
        }

        if (draft.status !== draft._originalStatus) {
          payload.status = draft.status;
        }

        if (draft.paymentStatus === "PENDING" && draft.paymentStatus !== draft._originalPaymentStatus) {
          payload.deliveringShipperId = null;
          return payload;
        }

        if (draft.status === "PREPARING") {
          payload.deliveringShipperId = null;
          return payload;
        }

        if (draft.status === "READY_FOR_SHIPPER") {
          payload.deliveringShipperId = deliveringShipperId;
          return payload;
        }

        if (draft.deliveringShipperId !== draft._originalDeliveringShipperId) {
          payload.deliveringShipperId = deliveringShipperId;
        }

        return payload;
      }
    case "promotions":
      {
        const minOrderAmount = toNullableNumber(draft.minOrderAmount);
        const maxDiscountAmount = toNullableNumber(draft.maxDiscountAmount);
        const creditCost = toNullableNumber(draft.creditCost);
        const applicableDishIds = String(draft.applicableDishIdsText ?? "")
          .split(",")
          .map((value) => Number(String(value).trim()))
          .filter((value) => Number.isFinite(value));
        const eligibleUserLevelIds = String(draft.eligibleUserLevelIdsText ?? "")
          .split(",")
          .map((value) => Number(String(value).trim()))
          .filter((value) => Number.isFinite(value));

      return {
        name: draft.name.trim() || undefined,
        code: draft.code.trim(),
        description: draft.description.trim(),
        scope: draft.scope,
        discountType: draft.discountType,
        discountTarget: draft.discountTarget || "ITEMS",
        discountValue: Number(draft.discountValue),
        minOrderAmount,
        minimumOrderAmount: minOrderAmount,
        maxDiscountAmount,
        maximumDiscountAmount: maxDiscountAmount,
        creditCost,
        usageLimit: toNullableNumber(draft.usageLimit),
        startsAt: toApiDateTime(draft.startsAt),
        endsAt: toApiDateTime(draft.endsAt),
        applicableDishIds,
        promotionDishIds: applicableDishIds,
        eligibleUserLevelIds,
        active: fromBooleanString(draft.active),
      };
      }
    case "userLevels":
      return {
        storeId: draft.storeId ? Number(draft.storeId) : null,
        code: draft.code.trim(),
        name: draft.name.trim(),
        minMembershipPoints: Number(draft.minMembershipPoints),
        active: fromBooleanString(draft.active),
      };
    case "reviews":
      return {
        approved: fromBooleanString(draft.approved),
      };
    default:
      return draft;
  }
}

export function buildSectionConfigs({
  storeOptions,
  categoryOptions,
  dishOptions,
  reviewUserOptions,
  workingStoreOptions,
  reviewTargetOptions,
  activeUserRole,
  activeReviewTargetType,
  isEditingUser,
  availableUserRoles,
  lockWorkingStoreId,
}) {
  const userNeedsWorkingStore = requiresWorkingStoreRole(activeUserRole);
  const userRoleOptions =
    Array.isArray(availableUserRoles) && availableUserRoles.length
      ? availableUserRoles.map((role) => ({ value: role, label: role }))
      : [
          { value: "ADMIN", label: "ADMIN" },
          { value: "MANAGER", label: "MANAGER" },
          { value: "SHIPPER", label: "SHIPPER" },
          { value: "STAFF", label: "STAFF" },
          { value: "USER", label: "USER" },
        ];
  const lockedWorkingStoreOptions =
    lockWorkingStoreId && userNeedsWorkingStore
      ? (() => {
          const matchedOption = workingStoreOptions.find(
            (option) => String(option.value) === String(lockWorkingStoreId),
          );

          return matchedOption
            ? [matchedOption]
            : [{ value: String(lockWorkingStoreId), label: "Current manager store" }];
        })()
      : workingStoreOptions;

  return {
    users: {
      title: "User management",
      description:
        "Create, update, and manage employee or customer accounts in the system.",
      detailPath: (id) => `/api/admin/users/${id}`,
      createPath: "/api/admin/users",
      updatePath: (id) => `/api/admin/users/${id}`,
      deletePath: (id) => `/api/admin/users/${id}`,
      fields: [
        { name: "fullName", label: "Full name", required: true, placeholder: "Alex Nguyen" },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
          placeholder: "email@example.com",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: !isEditingUser,
          placeholder: isEditingUser ? "Leave blank to keep the current password" : "Enter a password",
          description: isEditingUser
            ? "If left blank while updating the account, the current password is kept."
            : undefined,
        },
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          options: userRoleOptions,
        },
        {
          name: "workingStoreId",
          label: "Assigned store",
          type: "select",
          required: userNeedsWorkingStore,
          disabled: !userNeedsWorkingStore || Boolean(lockWorkingStoreId),
          options: userNeedsWorkingStore
            ? lockedWorkingStoreOptions
            : [{ value: "", label: "Not required" }],
          description: userNeedsWorkingStore
            ? lockWorkingStoreId
              ? "This account will be locked to the current store."
              : "This role must be assigned to a store."
            : "This role does not need a specific store assignment.",
        },
        {
          name: "enabled",
          label: "Enabled",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
      ],
    },
    stores: {
      title: "Store management",
      description: "Manage branch details, images, operating hours, and store identity.",
      detailPath: (id) => `/api/admin/stores/${id}`,
      createPath: "/api/admin/stores",
      updatePath: (id) => `/api/admin/stores/${id}`,
      deletePath: (id) => `/api/admin/stores/${id}`,
      fields: [
        { name: "name", label: "Store name", required: true, placeholder: "Kamatcha ..." },
        {
          name: "slug",
          label: "Slug",
          placeholder: "kamatcha-nguyen-hue",
          description: "Optional. Leave blank to let the backend normalize the slug from the store name.",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Store description",
        },
        { name: "address", label: "Address", placeholder: "88 Nguyen Hue" },
        {
          name: "contactEmail",
          label: "Contact email",
          type: "email",
          placeholder: "store@kamatcha.vn",
        },
        {
          name: "phoneNumber",
          label: "Phone number",
          placeholder: "0901234567",
        },
        {
          name: "latitude",
          label: "Latitude",
          type: "number",
          step: "0.000001",
          placeholder: "10.7769",
        },
        {
          name: "longitude",
          label: "Longitude",
          type: "number",
          step: "0.000001",
          placeholder: "106.7009",
        },
        {
          name: "area",
          label: "Area",
          placeholder: "District 1",
        },
        {
          name: "positionLabel",
          label: "Position label",
          placeholder: "Near the walking street",
        },
        {
          name: "hoursText",
          label: "Hours text",
          placeholder: "Open 08:00 - 22:00",
        },
        {
          name: "openTime",
          label: "Open time",
          type: "time",
          step: "1",
          placeholder: "08:00",
        },
        {
          name: "closeTime",
          label: "Close time",
          type: "time",
          step: "1",
          placeholder: "22:00",
        },
        {
          name: "personality",
          label: "Store personality",
          placeholder: "Refined, minimal",
        },
        {
          name: "designSignature",
          label: "Design signature",
          placeholder: "Light wood and hanging lanterns",
        },
        {
          name: "franchiseMood",
          label: "Franchise atmosphere",
          placeholder: "City-center mood",
        },
        {
          name: "specialty",
          label: "Featured item",
          placeholder: "Light-sugar matcha latte",
        },
        {
          name: "highlightSummary",
          label: "Highlight summary",
          type: "textarea",
          placeholder: "Quiet space, good for studying and light meetups",
        },
        {
          name: "highlightTagsText",
          label: "Highlight tags",
          placeholder: "quiet, study, meetup",
          description: "Nhap cac tag, cach nhau bang dau phay.",
        },
        {
          name: "serviceTagsText",
          label: "Service tags",
          placeholder: "wifi, takeaway, delivery",
          description: "Nhap cac dich vu, cach nhau bang dau phay.",
        },
        {
          name: "imagePaths",
          label: "Store gallery",
          type: "image-gallery",
          description: "Upload store images. The first image is prioritized for display.",
          uploadFolder: "stores",
        },
        {
          name: "sections",
          label: "Story sections",
          type: "content-sections",
          description:
            "Build the long-form store content shown on the storefront. Keep the array in display order; each block supports title, content, and an optional image gallery.",
          uploadFolder: "stores",
        },
        {
          name: "active",
          label: "Active",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
      ],
    },
    events: {
      title: "Event management",
      description: "Manage events per store, including schedules and image galleries.",
      detailPath: (id) => `/api/admin/events/${id}`,
      createPath: "/api/admin/events",
      updatePath: (id) => `/api/admin/events/${id}`,
      deletePath: (id) => `/api/admin/events/${id}`,
      fields: [
        {
          name: "storeId",
          label: "Store",
          type: "select",
          required: true,
          options: storeOptions,
          description: "Choose the store hosting this event.",
        },
        { name: "name", label: "Event name", required: true, placeholder: "Acoustic Night" },
        {
          name: "slug",
          label: "Slug",
          placeholder: "acoustic-night-nguyen-hue",
          description: "Optional. Leave blank to let the backend generate a unique slug from the name.",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Event details",
        },
        { name: "location", label: "Location", placeholder: "Kamatcha Nguyen Hue" },
        {
          name: "scheduleText",
          label: "Schedule text",
          placeholder: "Every Saturday",
        },
        {
          name: "highlightSummary",
          label: "Highlight summary",
          type: "textarea",
          placeholder: "Gentle workshop, relaxed vibe",
        },
        {
          name: "highlightTagsText",
          label: "Highlight tags",
          placeholder: "workshop, calm",
          description: "Nhap cac tag, cach nhau bang dau phay.",
        },
        {
          name: "capacity",
          label: "Capacity",
          type: "number",
          min: "0",
          step: "1",
          placeholder: "20",
        },
        {
          name: "bookedCount",
          label: "Booked",
          type: "number",
          min: "0",
          step: "1",
          placeholder: "2",
        },
        {
          name: "featuredDishIdsText",
          label: "Featured dish IDs",
          type: "textarea",
          placeholder: "100, 101",
          description: "Enter featured item IDs separated by commas.",
        },
        {
          name: "imagePaths",
          label: "Event gallery",
          type: "image-gallery",
          description: "Upload event images. The first image is prioritized for display.",
          uploadFolder: "events",
        },
        {
          name: "sections",
          label: "Story sections",
          type: "content-sections",
          description:
            "Use these sections for the event detail storytelling blocks. The order here is the order users see on the page, and each section can include multiple images.",
          uploadFolder: "events",
        },
        { name: "startsAt", label: "Starts at", type: "datetime-local", required: true },
        { name: "endsAt", label: "Ends at", type: "datetime-local", required: true },
        {
          name: "active",
          label: "Active",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
      ],
    },
    categories: {
      title: "Category management",
      // description: "Arrange item groups per store so the menu stays clear and easy to manage.",
      detailPath: (id) => `/api/admin/categories/${id}`,
      createPath: "/api/admin/categories",
      updatePath: (id) => `/api/admin/categories/${id}`,
      deletePath: (id) => `/api/admin/categories/${id}`,
      fields: [
        {
          name: "storeId",
          label: "Store",
          type: "select",
          required: true,
          options: storeOptions,
          description: "Choose the store this category belongs to.",
        },
        { name: "name", label: "Category name", required: true, placeholder: "Matcha Signature" },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          required: true,
          placeholder: "Category description",
        },
        {
          name: "imagePaths",
          label: "Category gallery",
          type: "image-gallery",
          description: "Upload illustration images for this category.",
          uploadFolder: "categories",
        },
        {
          name: "sortOrder",
          label: "Display order",
          type: "number",
          min: "0",
          step: "1",
          placeholder: "1",
        },
        {
          name: "active",
          label: "Active",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
      ],
    },
    dishes: {
      title: "Core dish management",
      // description:
      //   "Manage core brand menu items, descriptions, base prices, and showcase content.",
      detailPath: (id) => `/api/admin/dishes/${id}`,
      createPath: "/api/admin/dishes",
      updatePath: (id) => `/api/admin/dishes/${id}`,
      deletePath: (id) => `/api/admin/dishes/${id}`,
      fields: [
        { name: "name", label: "Dish name", required: true, placeholder: "Matcha Latte Cloud" },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          required: true,
          placeholder: "Dish description",
        },
        {
          name: "note",
          label: "Short note",
          placeholder: "Less sugar",
        },
        {
          name: "price",
          label: "Base price",
          type: "number",
          required: true,
          min: "0",
          step: "0.01",
          placeholder: "65000",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "ACTIVE", label: "ACTIVE" },
            { value: "INACTIVE", label: "INACTIVE" },
          ],
        },
        {
          name: "available",
          label: "Available",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
        {
          name: "franchiseRequired",
          label: "Franchise required",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
        {
          name: "franchiseNote",
          label: "Franchise note",
          placeholder: "Only sold at franchise stores",
        },
        {
          name: "categoryId",
          label: "Category",
          type: "select",
          required: true,
          options: categoryOptions,
          description: "This category helps users see the right menu group.",
        },
        {
          name: "highlightSummary",
          label: "Highlight summary",
          type: "textarea",
          placeholder: "Light and low-sugar",
        },
        {
          name: "highlightTagsText",
          label: "Highlight tags",
          placeholder: "light, low-sugar",
          description: "Nhap cac tag, cach nhau bang dau phay.",
        },
        {
          name: "imagePaths",
          label: "Dish gallery",
          type: "image-gallery",
          description: "Upload item images. The first image is prioritized for display.",
          uploadFolder: "dishes",
        },
        {
          name: "sections",
          label: "Story sections",
          type: "content-sections",
          description:
            "Add the detailed dish content blocks used on the storefront, including optional section image galleries.",
          uploadFolder: "dishes",
        },
        {
          name: "active",
          label: "Active",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
      ],
    },
    storeDishes: {
      title: "Store dish management",
      // description:
      //   "Manage stock, availability, and the live selling price of each item per store.",
      detailPath: (id) => `/api/admin/store-dishes/${id}`,
      createPath: "/api/admin/store-dishes",
      updatePath: (id) => `/api/admin/store-dishes/${id}`,
      deletePath: (id) => `/api/admin/store-dishes/${id}`,
      fields: [
        {
          name: "storeId",
          label: "Store",
          type: "select",
          required: true,
          options: storeOptions,
          description: "Each item only needs to be added once per store.",
        },
        {
          name: "dishId",
          label: "Core dish",
          type: "select",
          required: true,
          options: dishOptions,
          description: "Choose the item to sell in this store.",
        },
        {
          name: "quantity",
          label: "Stock",
          type: "number",
          required: true,
          min: "0",
          step: "1",
          placeholder: "12",
        },
        {
          name: "available",
          label: "Available",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
        {
          name: "priceOverride",
          label: "Store price",
          type: "number",
          min: "0",
          step: "0.01",
          placeholder: "Leave blank to use the base price",
        },
      ],
    },
    news: {
      title: "News management",
      // description:
      //   "Publish news, feature articles, and editorial content linked to the store.",
      detailPath: (id) => `/api/admin/news/${id}`,
      createPath: "/api/admin/news",
      updatePath: (id) => `/api/admin/news/${id}`,
      deletePath: (id) => `/api/admin/news/${id}`,
      fields: [
        {
          name: "title",
          label: "Title",
          required: true,
          placeholder: "Kamatcha Airport Hub opens",
        },
        {
          name: "slug",
          label: "Slug",
          placeholder: "kamatcha-airport-hub-opens",
          description: "Optional. Leave blank to let the backend normalize the slug from the article title.",
        },
        {
          name: "summary",
          label: "Summary",
          type: "textarea",
          required: true,
          placeholder: "The new branch is ready to welcome guests downtown.",
        },
        {
          name: "content",
          label: "Content",
          type: "textarea",
          required: true,
          placeholder: "Kamatcha officially opened a new airport-area location...",
        },
        {
          name: "relatedStoreId",
          label: "Related store",
          type: "select",
          options: storeOptions,
        },
        {
          name: "tagsText",
          label: "Tags",
          placeholder: "launch, new-branch",
          description: "Nhap cac tag, cach nhau bang dau phay.",
        },
        {
          name: "imagePaths",
          label: "News gallery",
          type: "image-gallery",
          description: "Upload images for this article.",
          uploadFolder: "news",
        },
        {
          name: "sections",
          label: "Article sections",
          type: "content-sections",
          description:
            "Compose the long-form article blocks. Send the final array in the same order you want readers to see, with optional multi-image galleries per section.",
          uploadFolder: "news",
        },
        {
          name: "featured",
          label: "Featured",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
        {
          name: "published",
          label: "Published",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
        {
          name: "publishedAt",
          label: "Published at",
          type: "datetime-local",
        },
      ],
    },
    userLevels: {
      title: "User level management",
      // description:
      //   "Set membership milestones per store to calculate customer levels.",
      detailPath: (id) => `/api/admin/user-levels/${id}`,
      createPath: "/api/admin/user-levels",
      updatePath: (id) => `/api/admin/user-levels/${id}`,
      deletePath: (id) => `/api/admin/user-levels/${id}`,
      fields: [
        {
          name: "storeId",
          label: "Store",
          type: "select",
          required: false,
          options: [{ value: "", label: "Global level" }, ...storeOptions],
          description: "De trong neu day la membership level ap dung toan he thong.",
        },
        {
          name: "code",
          label: "Level code",
          required: true,
          placeholder: "SILVER",
        },
        {
          name: "name",
          label: "Level name",
          required: true,
          placeholder: "Silver",
        },
        {
          name: "minMembershipPoints",
          label: "Minimum membership points",
          type: "number",
          required: true,
          min: "0",
          step: "0.01",
          placeholder: "300",
        },
        {
          name: "active",
          label: "Active",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
      ],
    },
    orders: {
      title: "Order management",
      // description:
      //   "Handle orders, payment statuses, invoices, and QR scan history in one place.",
      detailPath: (id) => `/api/admin/orders/${id}`,
      updatePath: (id) => `/api/admin/orders/${id}/status`,
      fields: [],
    },
    promotions: {
      title: "Promotion management",
      // description:
      //   "Create promo codes and configure eligibility rules for orders or items.",
      detailPath: (id) => `/api/admin/promotions/${id}`,
      createPath: "/api/admin/promotions",
      updatePath: (id) => `/api/admin/promotions/${id}`,
      deletePath: (id) => `/api/admin/promotions/${id}`,
      fields: [
        {
          name: "name",
          label: "Promotion name",
          placeholder: "Matcha lovers discount",
          description: "Optional. If left blank, the backend can fall back to the promotion code.",
        },
        {
          name: "code",
          label: "Promotion code",
          required: true,
          placeholder: "MATCHA10",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          required: true,
          placeholder: "10% off matcha orders",
        },
        {
          name: "scope",
          label: "Scope",
          type: "select",
          required: true,
          options: [
            { value: "ORDER", label: "ORDER" },
            { value: "DISH", label: "DISH" },
          ],
        },
        {
          name: "discountType",
          label: "Discount type",
          type: "select",
          required: true,
          options: [
            { value: "PERCENT", label: "PERCENT" },
            { value: "FIXED_AMOUNT", label: "FIXED_AMOUNT" },
          ],
        },
        {
          name: "discountTarget",
          label: "Discount target",
          type: "select",
          required: true,
          options: [
            { value: "ITEMS", label: "ITEMS" },
            { value: "SHIPPING", label: "SHIPPING" },
            { value: "BOTH", label: "BOTH" },
          ],
        },
        {
          name: "discountValue",
          label: "Discount value",
          type: "number",
          required: true,
          min: "0",
          step: "0.01",
          placeholder: "10",
        },
        {
          name: "minOrderAmount",
          label: "Minimum order",
          type: "number",
          min: "0",
          step: "0.01",
          placeholder: "100000",
        },
        {
          name: "maxDiscountAmount",
          label: "Maximum discount",
          type: "number",
          min: "0",
          step: "0.01",
          placeholder: "30000",
        },
        {
          name: "creditCost",
          label: "Credit cost",
          type: "number",
          min: "0",
          step: "1",
          placeholder: "50",
        },
        {
          name: "usageLimit",
          label: "Usage limit",
          type: "number",
          min: "0",
          step: "1",
          placeholder: "100",
        },
        {
          name: "startsAt",
          label: "Starts at",
          type: "datetime-local",
          required: true,
        },
        {
          name: "endsAt",
          label: "Ends at",
          type: "datetime-local",
          required: true,
        },
        {
          name: "applicableDishIdsText",
          label: "Signature dish IDs",
          type: "textarea",
          placeholder: "10, 11, 12",
          description:
            "Optional. Enter SIGNATURE dishId values separated by commas. Leave blank when scope ORDER should cover all signature items across every store.",
        },
        {
          name: "eligibleUserLevelIdsText",
          label: "Eligible user level IDs",
          type: "textarea",
          placeholder: "5, 6",
          description:
            "Optional. Limit the promotion to specific global membership levels by userLevelId.",
        },
        {
          name: "active",
          label: "Active",
          type: "select",
          required: true,
          options: [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ],
        },
      ],
    },
    reviews: {
      title: "Review management",
      // description:
      //   "Review submitted content and remove reviews that need moderation.",
      detailPath: (id) => `/api/admin/reviews/${id}`,
      deletePath: (id) => `/api/admin/reviews/${id}`,
      fields: [
        {
          name: "approved",
          label: "Display status",
          type: "select",
          options: [
            { value: "false", label: "Hidden" },
            { value: "true", label: "Visible" },
          ],
        },
        {
          name: "targetType",
          label: "Target type",
          type: "select",
          options: [
            { value: "STORE", label: "STORE" },
            { value: "EVENT", label: "EVENT" },
            { value: "DISH", label: "DISH" },
          ],
        },
        {
          name: "targetId",
          label: "Target",
          type: "select",
          options: reviewTargetOptions?.[activeReviewTargetType] ?? [],
          description: "Used to quickly identify what is being reviewed.",
        },
        {
          name: "userId",
          label: "Submitted by",
          type: "select",
          options: reviewUserOptions ?? [],
        },
      ],
    },
    feedbacks: {
      title: "Feedback management",
      // description:
      //   "Review customer feedback, reply, and handle cases that need intervention.",
      detailPath: (id) => `/api/admin/feedbacks/${id}`,
      deletePath: (id) => `/api/admin/feedbacks/${id}`,
      fields: [],
    },
  };
}
