const CHOICES = new Set(['granted', 'denied']);

function derivedCatalog(client) {
  const policy = client.policy ?? { purposes: [] };
  const categories = policy.categories ?? policy.catalog?.categories;
  if (Array.isArray(categories)) {
    const vendors = policy.vendors ?? policy.catalog?.vendors ?? [];
    const services = policy.services ?? policy.catalog?.services ?? [];
    const trackers = policy.trackers ?? policy.catalog?.trackers ?? [];
    return {
      projectId: policy.projectId ?? '', policyVersion: policy.policyVersion ?? '', noticeVersion: policy.noticeVersion ?? '',
      updatedAt: policy.updatedAt, privacyPolicyUrl: policy.privacyPolicyUrl, contact: localize(policy.contact, 'en'),
      categories: categories.map((category) => {
        const purposeIds = category.purposeIds?.length
          ? category.purposeIds
          : policy.purposes.filter((purpose) => purpose.categoryId === category.id).map((purpose) => purpose.id);
        const definitions = purposeIds.map((purposeId) => policy.purposes.find((purpose) => purpose.id === purposeId)).filter(Boolean);
        return { ...category, purposeIds, required: category.required ?? definitions.every((purpose) => !purpose.optional || purpose.legalBasis !== 'consent') };
      }),
      vendors,
      services: services.map((service) => ({
        ...service,
        purposeIds: service.purposeIds ?? [],
        trackerIds: service.trackerIds?.length ? service.trackerIds : trackers.filter((tracker) => tracker.serviceId === service.id).map((tracker) => tracker.id)
      })),
      trackers,
      purposes: policy.purposes,
      legacy: false
    };
  }
  const derivedCategories = new Map();
  for (const purpose of policy.purposes) {
    const id = purpose.categoryId ?? purpose.id;
    const required = !purpose.optional || purpose.legalBasis !== 'consent';
    const current = derivedCategories.get(id);
    if (current) {
      current.purposeIds.push(purpose.id);
      current.required = current.required && required;
    } else {
      derivedCategories.set(id, {
        id,
        label: purpose.label ?? purpose.activityId ?? purpose.id,
        description: purpose.description ?? '',
        required,
        purposeIds: [purpose.id]
      });
    }
  }
  return {
    projectId: policy.projectId ?? '',
    policyVersion: policy.policyVersion ?? '',
    noticeVersion: policy.noticeVersion ?? '',
    updatedAt: policy.updatedAt,
    privacyPolicyUrl: policy.privacyPolicyUrl,
    contact: localize(policy.contact, 'en'),
    categories: [...derivedCategories.values()],
    purposes: policy.purposes,
    vendors: [],
    services: [],
    trackers: [],
    legacy: true
  };
}

function localize(value, locale) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value[locale] ?? value.en ?? Object.values(value).find((entry) => typeof entry === 'string') ?? '';
}

function normalizeNamed(item, locale, key = 'name') {
  return { ...item, [key]: localize(item[key], locale), description: localize(item.description, locale) };
}

export function getDisclosureCatalog(client, locale = 'en') {
  const catalog = client.getCatalog?.() ?? derivedCatalog(client);
  return {
    ...catalog,
    categories: (Array.isArray(catalog?.categories) ? catalog.categories : []).map((category) => normalizeNamed(category, locale, 'label')),
    purposes: (Array.isArray(catalog?.purposes) ? catalog.purposes : (client.policy?.purposes ?? [])).map((purpose) => normalizeNamed(purpose, locale, 'label')),
    vendors: (Array.isArray(catalog?.vendors) ? catalog.vendors : []).map((vendor) => normalizeNamed(vendor, locale)),
    services: (Array.isArray(catalog?.services) ? catalog.services : []).map((service) => normalizeNamed(service, locale)),
    trackers: (Array.isArray(catalog?.trackers) ? catalog.trackers : []).map((tracker) => normalizeNamed(tracker, locale))
  };
}

function deriveState(category, snapshot) {
  if (category.required) return 'required';
  const states = (category.purposeIds ?? []).map((purposeId) => snapshot.choices?.[purposeId] ?? 'unset');
  if (states.length === 0 || states.every((state) => state === 'unset')) return 'unset';
  if (states.every((state) => state === 'granted')) return 'granted';
  if (states.every((state) => state === 'denied')) return 'denied';
  return 'mixed';
}

export function getCategoryRows(client, snapshot, locale = 'en') {
  return getDisclosureCatalog(client, locale).categories
    .map((category) => ({
      ...category,
      description: category.description ?? '',
      purposeIds: Array.isArray(category.purposeIds) ? category.purposeIds : [],
      state: snapshot.categoryStates?.[category.id] ?? deriveState(category, snapshot)
    }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function saveCategories(client, snapshot, categoryChoices, source) {
  if (!categoryChoices || typeof categoryChoices !== 'object' || Array.isArray(categoryChoices)) throw new TypeError('category choices must be an object');
  for (const choice of Object.values(categoryChoices)) {
    if (!CHOICES.has(choice)) throw new TypeError('category choice must be granted or denied');
  }
  if (typeof client.saveCategoryPreferences === 'function') return client.saveCategoryPreferences(categoryChoices, source);

  const rows = new Map(getCategoryRows(client, snapshot).map((category) => [category.id, category]));
  const purposeDefinitions = new Map((client.policy?.purposes ?? []).map((purpose) => [purpose.id, purpose]));
  const purposeChoices = {};
  for (const [categoryId, choice] of Object.entries(categoryChoices)) {
    const category = rows.get(categoryId);
    if (!category || category.required) throw new TypeError(`Unknown or required consent category: ${categoryId}`);
    for (const purposeId of category.purposeIds) {
      const purpose = purposeDefinitions.get(purposeId);
      if (purpose?.optional && purpose.legalBasis === 'consent') purposeChoices[purposeId] = choice;
    }
  }
  if (Object.keys(purposeChoices).length === 0) throw new TypeError('No optional consent category was provided');
  return client.savePreferences(purposeChoices, source);
}

export function setCategory(client, snapshot, categoryId, choice, source) {
  if (typeof client.setCategory === 'function') return client.setCategory(categoryId, choice, source);
  return saveCategories(client, snapshot, { [categoryId]: choice }, source);
}
