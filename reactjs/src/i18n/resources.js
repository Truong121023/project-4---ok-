import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viMenu from './locales/vi/menu.json';
import viCheckout from './locales/vi/checkout.json';
import viOrders from './locales/vi/orders.json';
import viAccount from './locales/vi/account.json';
import viAdmin from './locales/vi/admin.json';
import viEmployee from './locales/vi/employee.json';
import viEvents from './locales/vi/events.json';
import viNews from './locales/vi/news.json';
import viReviews from './locales/vi/reviews.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enMenu from './locales/en/menu.json';
import enCheckout from './locales/en/checkout.json';
import enOrders from './locales/en/orders.json';
import enAccount from './locales/en/account.json';
import enAdmin from './locales/en/admin.json';
import enEmployee from './locales/en/employee.json';
import enEvents from './locales/en/events.json';
import enNews from './locales/en/news.json';
import enReviews from './locales/en/reviews.json';

export const resources = {
  vi: {
    common: viCommon,
    auth: viAuth,
    menu: viMenu,
    checkout: viCheckout,
    orders: viOrders,
    account: viAccount,
    admin: viAdmin,
    employee: viEmployee,
    events: viEvents,
    news: viNews,
    reviews: viReviews,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    menu: enMenu,
    checkout: enCheckout,
    orders: enOrders,
    account: enAccount,
    admin: enAdmin,
    employee: enEmployee,
    events: enEvents,
    news: enNews,
    reviews: enReviews,
  },
};

export const NAMESPACES = [
  'common',
  'auth',
  'menu',
  'checkout',
  'orders',
  'account',
  'admin',
  'employee',
  'events',
  'news',
  'reviews',
];

export const DEFAULT_NS = 'common';
export const SUPPORTED_LANGS = ['vi', 'en'];
export const STORAGE_KEY = 'kamatcha.lang';
