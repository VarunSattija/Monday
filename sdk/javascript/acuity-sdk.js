/**
 * Acuity Professional SDK for JavaScript / TypeScript / Node.js
 * ==============================================================
 *
 * Official client for the Acuity Work Management API. Mirrors the
 * shape of `monday-sdk-js` (api / storage / listen / get) so existing
 * monday.com app code can be ported with minimal changes.
 *
 * USAGE — Node.js (npm)
 * ---------------------
 *   const acuitySdk = require('./acuity-sdk.js');
 *   const acuity = acuitySdk({ token: 'ak_xxxxx' });
 *
 *   const boards = await acuity.api.boards.list();
 *   const item = await acuity.api.items.create('<board_id>', {
 *     name: 'Candidate: Jane Doe',
 *     column_values: { '<col_id>': 'jane@example.com' },
 *   });
 *
 * USAGE — Browser (script tag)
 * ----------------------------
 *   <script src="https://<your-host>/api/sdk/javascript/cdn"></script>
 *   <script>
 *     const acuity = window.acuitySdk({ token: 'ak_xxxxx' });
 *     acuity.api.boards.list().then(console.log);
 *   </script>
 *
 * Live events
 * -----------
 *   acuity.listen('<board_id>', (evt) => console.log('change:', evt));
 *
 * Storage (key-value)
 * -------------------
 *   await acuity.storage.set('lastRunAt', Date.now());
 *   const ts = await acuity.storage.get('lastRunAt');
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.acuitySdk = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var DEFAULT_API_URL = (typeof window !== 'undefined' && window.ACUITY_API_URL)
    || (typeof process !== 'undefined' && process.env && process.env.ACUITY_API_URL)
    || 'https://acuity-team-hub.preview.emergentagent.com/api';

  function AcuityError(message, status, body) {
    var e = new Error(message);
    e.name = 'AcuityError';
    e.status = status;
    e.body = body;
    return e;
  }

  function makeClient(opts) {
    var token = opts.token
      || (typeof process !== 'undefined' && process.env && process.env.ACUITY_API_TOKEN);
    var apiUrl = (opts.apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
    var fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) {
      try { fetchFn = require('node-fetch'); } catch (_) { /* node 18+ has global fetch */ }
    }
    if (!fetchFn) {
      throw AcuityError('No fetch implementation found. Provide opts.fetch or upgrade to Node 18+.');
    }

    function request(method, path, body) {
      if (!token && path.indexOf('/auth/') !== 0) {
        return Promise.reject(AcuityError('Token is required. Pass { token: "ak_..." }'));
      }
      var headers = { 'Content-Type': 'application/json', 'User-Agent': 'acuity-sdk-js/' + VERSION };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      return fetchFn(apiUrl + path, {
        method: method,
        headers: headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }).then(function (resp) {
        if (!resp.ok) {
          return resp.text().then(function (txt) {
            var parsed = null;
            try { parsed = JSON.parse(txt); } catch (_) {}
            var msg = (parsed && parsed.detail) ? parsed.detail : txt || ('HTTP ' + resp.status);
            throw AcuityError('HTTP ' + resp.status + ': ' + msg, resp.status, parsed || txt);
          });
        }
        var ct = resp.headers && resp.headers.get && resp.headers.get('content-type');
        if (ct && ct.indexOf('application/json') !== -1) return resp.json();
        return resp.text();
      });
    }

    // --- API namespace (server-side data access) ---
    var api = {
      whoami: function () { return request('GET', '/api-keys/whoami'); },
      boards: {
        list: function () { return request('GET', '/v1/boards'); },
        get: function (boardId) { return request('GET', '/v1/boards/' + boardId); },
      },
      items: {
        create: function (boardId, payload) {
          if (!payload || !payload.name) {
            return Promise.reject(AcuityError("'name' is required"));
          }
          return request('POST', '/v1/boards/' + boardId + '/items', {
            name: payload.name,
            group_id: payload.group_id,
            column_values: payload.column_values || {},
          });
        },
      },
    };

    // --- Storage (key-value) ---
    var storage = {
      get: function (key) {
        return request('GET', '/v1/storage/' + encodeURIComponent(key))
          .then(function (r) { return r ? r.value : null; });
      },
      set: function (key, value) {
        return request('PUT', '/v1/storage/' + encodeURIComponent(key), { value: value });
      },
      delete: function (key) {
        return request('DELETE', '/v1/storage/' + encodeURIComponent(key));
      },
      keys: function () {
        return request('GET', '/v1/storage')
          .then(function (rows) { return (rows || []).map(function (r) { return r.key; }); });
      },
    };

    // --- Events / listen (WebSocket) ---
    function listen(boardId, callback) {
      var WSImpl = (typeof WebSocket !== 'undefined') ? WebSocket : null;
      if (!WSImpl) {
        try { WSImpl = require('ws'); } catch (_) {}
      }
      if (!WSImpl) {
        throw AcuityError("WebSocket implementation missing. In Node, run: npm install ws");
      }
      var wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/board/' + boardId;
      var ws = new WSImpl(wsUrl);
      ws.onmessage = function (evt) {
        var data;
        try { data = JSON.parse(evt.data); } catch (_) { data = { raw: evt.data }; }
        callback(data);
      };
      return {
        close: function () { try { ws.close(); } catch (_) {} },
        socket: ws,
      };
    }

    // --- Auth helper (password-based login w/ optional 2FA) ---
    function login(email, password, totp) {
      return fetchFn(apiUrl + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      }).then(function (r) { return r.json(); }).then(function (body) {
        if (body.requires_2fa) {
          if (!totp) throw AcuityError('2FA is enabled — pass the 6-digit code as 3rd arg');
          return fetchFn(apiUrl + '/auth/2fa/verify-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challenge_token: body.challenge_token, code: totp }),
          }).then(function (r) { return r.json(); });
        }
        return body;
      });
    }

    return {
      version: VERSION,
      apiUrl: apiUrl,
      setToken: function (t) { token = t; },
      api: api,
      storage: storage,
      listen: listen,
      auth: { login: login },
    };
  }

  function init(opts) {
    return makeClient(opts || {});
  }

  init.version = VERSION;
  return init;
}));
