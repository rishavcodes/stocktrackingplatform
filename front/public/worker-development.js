/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var toPropertyKey = __webpack_require__(2);
function _defineProperty(obj, key, value) {
  key = toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
module.exports = _defineProperty, module.exports.__esModule = true, module.exports["default"] = module.exports;

/***/ }),
/* 2 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _typeof = (__webpack_require__(3)["default"]);
var toPrimitive = __webpack_require__(4);
function _toPropertyKey(arg) {
  var key = toPrimitive(arg, "string");
  return _typeof(key) === "symbol" ? key : String(key);
}
module.exports = _toPropertyKey, module.exports.__esModule = true, module.exports["default"] = module.exports;

/***/ }),
/* 3 */
/***/ ((module) => {

function _typeof(obj) {
  "@babel/helpers - typeof";

  return module.exports = _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, module.exports.__esModule = true, module.exports["default"] = module.exports, _typeof(obj);
}
module.exports = _typeof, module.exports.__esModule = true, module.exports["default"] = module.exports;

/***/ }),
/* 4 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _typeof = (__webpack_require__(3)["default"]);
function _toPrimitive(input, hint) {
  if (_typeof(input) !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (_typeof(res) !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
module.exports = _toPrimitive, module.exports.__esModule = true, module.exports["default"] = module.exports;

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var _defineProperty = __webpack_require__(1);
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
/* eslint-disable no-restricted-globals */
/**
 * Custom service worker — appended to the next-pwa generated sw.js.
 *
 * Handles two events:
 *   1. "push"             — receive a push from server, show a notification
 *   2. "notificationclick" — when admin taps the notification, focus or open
 *                            the admin panel URL provided in the payload.
 */

self.addEventListener("push", event => {
  var _payload$data;
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (_unused) {
    payload = {
      title: "TradeBox",
      body: event.data.text()
    };
  }
  const title = payload.title || "TradeBox";
  // If the server provided a ctaLabel (via data.ctaLabel), expose it as an
  // OS-level action button on the notification banner. Standard click on
  // the notification body still navigates to data.url — the action button
  // gives a labelled second tap target ("View Lead" / "View Receipt" etc.).
  const actions = (_payload$data = payload.data) !== null && _payload$data !== void 0 && _payload$data.ctaLabel ? [{
    action: "view",
    title: payload.data.ctaLabel
  }] : undefined;
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon/android-icon-192x192.png",
    badge: payload.badge || "/favicon/favicon-96x96.png",
    tag: payload.tag,
    // browser-level dedup
    requireInteraction: !!payload.requireInteraction,
    actions,
    data: _objectSpread({
      url: payload.url || "/dashboard/admin/onboarding-issues"
    }, payload.data || {})
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", event => {
  var _event$notification$d;
  event.notification.close();

  // Both the default click and the "view" action button route to the same
  // URL — the action button is purely a labelled affordance. If more action
  // types are added later (e.g. "dismiss", "mark-read"), branch on event.action.
  const targetUrl = ((_event$notification$d = event.notification.data) === null || _event$notification$d === void 0 ? void 0 : _event$notification$d.url) || "/dashboard/admin/onboarding-issues";
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    // If the admin already has the app open, focus that tab and navigate
    for (const client of allClients) {
      if ("focus" in client && "navigate" in client) {
        await client.focus();
        try {
          await client.navigate(targetUrl);
        } catch (_unused2) {
          // navigate may fail across origins; fall through to openWindow
        }
        return;
      }
    }

    // Otherwise open a new window/tab
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
})();

/******/ })()
;