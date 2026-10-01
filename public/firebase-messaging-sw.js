/**
 * Synnera FCM background service worker (separate from /sw.js).
 * Path must remain: /firebase-messaging-sw.js
 *
 * Config is public Firebase web config (same as NEXT_PUBLIC_*).
 * Received from the page via postMessage { type: "FCM_CONFIG", config }
 * and persisted in IndexedDB so background pushes work after SW restarts.
 */
/* eslint-disable no-undef */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js"
);

var FCM_IDB_NAME = "synnera-fcm";
var FCM_IDB_STORE = "config";
var FCM_IDB_KEY = "firebaseConfig";
var DEFAULT_ICON = "/synnera-icon-192.png";
var DEFAULT_BADGE = "/synnera-icon-192.png";

var messagingInstance = null;
var initPromise = null;

function openIdb() {
  return new Promise(function (resolve, reject) {
    try {
      var req = indexedDB.open(FCM_IDB_NAME, 1);
      req.onerror = function () {
        reject(req.error);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(FCM_IDB_STORE)) {
          db.createObjectStore(FCM_IDB_STORE);
        }
      };
    } catch (e) {
      reject(e);
    }
  });
}

function saveConfig(config) {
  return openIdb().then(function (db) {
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(FCM_IDB_STORE, "readwrite");
        tx.objectStore(FCM_IDB_STORE).put(config, FCM_IDB_KEY);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  });
}

function loadConfig() {
  return openIdb()
    .then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(FCM_IDB_STORE, "readonly");
          var req = tx.objectStore(FCM_IDB_STORE).get(FCM_IDB_KEY);
          req.onsuccess = function () {
            resolve(req.result || null);
          };
          req.onerror = function () {
            reject(req.error);
          };
        } catch (e) {
          reject(e);
        }
      });
    })
    .catch(function () {
      return null;
    });
}

function isValidConfig(config) {
  return (
    config &&
    typeof config === "object" &&
    config.apiKey &&
    config.projectId &&
    config.messagingSenderId &&
    config.appId
  );
}

function setupBackgroundHandler() {
  if (!messagingInstance) return;
  try {
    messagingInstance.onBackgroundMessage(function (payload) {
      var notification = (payload && payload.notification) || {};
      var data = (payload && payload.data) || {};
      var title =
        notification.title || data.title || data.notificationTitle || "Synnera";
      var body =
        notification.body || data.body || data.notificationBody || "";
      var icon = notification.icon || data.icon || DEFAULT_ICON;
      var image = notification.image || data.image;
      var link =
        (data && (data.link || data.click_action)) ||
        (payload.fcmOptions && payload.fcmOptions.link) ||
        "/";

      var options = {
        body: body,
        icon: icon,
        badge: DEFAULT_BADGE,
        data: Object.assign({}, data, { link: link }),
        tag: (data && data.orderId) || (data && data.type) || "synnera-fcm",
        renotify: true,
      };
      if (image) options.image = image;

      return self.registration.showNotification(title, options);
    });
  } catch (e) {
    console.warn("[FCM SW] onBackgroundMessage setup failed", e);
  }
}

function initFirebase(config) {
  if (!isValidConfig(config)) {
    return Promise.resolve(false);
  }
  if (messagingInstance) {
    return Promise.resolve(true);
  }
  if (initPromise) return initPromise;

  initPromise = Promise.resolve()
    .then(function () {
      try {
        if (typeof firebase === "undefined") {
          console.error("[FCM SW] firebase compat not loaded");
          return false;
        }
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(config);
        }
        messagingInstance = firebase.messaging();
        setupBackgroundHandler();
        return saveConfig(config)
          .catch(function (e) {
            console.warn("[FCM SW] saveConfig failed", e);
          })
          .then(function () {
            return true;
          });
      } catch (e) {
        console.error("[FCM SW] init failed", e);
        messagingInstance = null;
        return false;
      }
    })
    .finally(function () {
      initPromise = null;
    });

  return initPromise;
}

function ensureInit() {
  if (messagingInstance) return Promise.resolve(true);
  return loadConfig().then(function (stored) {
    if (isValidConfig(stored)) {
      return initFirebase(stored);
    }
    return false;
  });
}

self.addEventListener("message", function (event) {
  var data = event.data || {};
  if (data.type === "FCM_CONFIG" && data.config) {
    initFirebase(data.config);
  }
});

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    ensureInit()
      .catch(function () {})
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = (event.notification && event.notification.data) || {};
  var link = data.link || data.click_action || "/";
  if (typeof link !== "string" || !link) link = "/";

  // Prefer same-origin relative paths
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url && "focus" in client) {
            try {
              client.focus();
              if (client.navigate) {
                return client.navigate(link);
              }
              return client.postMessage({ type: "FCM_NAVIGATE", link: link });
            } catch (e) {
              /* continue */
            }
          }
        }
        if (self.clients.openWindow) {
          var origin = self.location.origin || "";
          var url =
            link.indexOf("http") === 0
              ? link
              : origin + (link.charAt(0) === "/" ? link : "/" + link);
          return self.clients.openWindow(url);
        }
      }
    )
  );
});

self.addEventListener("push", function () {
  // Firebase messaging handles push when initialized; ensure config loaded
  ensureInit().catch(function () {});
});

// Best-effort init from stored config as soon as script loads
ensureInit().catch(function () {});
