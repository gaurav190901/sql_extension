// Runs in the page's MAIN world (declared in manifest with "world": "MAIN").
// Content scripts live in an isolated world and cannot see window.monaco or
// the page's fetch/XHR, so this bridge exposes what they need via DOM events.
// All payloads are JSON strings so they cross the world boundary reliably.
(function () {
  if (window.__sqlTrackerBridge) return;
  window.__sqlTrackerBridge = true;

  function emit(name, data) {
    window.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(data) }));
  }

  // ---------- Editor reading ----------
  function readMonaco() {
    var m = window.monaco;
    if (!m || !m.editor) return null;
    try {
      // Prefer the editor the user is typing in
      var editors = m.editor.getEditors ? m.editor.getEditors() : [];
      var focused = editors.filter(function (e) { return e.hasTextFocus && e.hasTextFocus(); })[0];
      var model = focused && focused.getModel();

      if (!model) {
        var models = m.editor.getModels();
        // Prefer an SQL-language model, otherwise the largest one
        model = models.filter(function (x) { return /sql/i.test(langOf(x)); })[0] ||
          models.slice().sort(function (a, b) { return b.getValueLength() - a.getValueLength(); })[0];
      }
      if (!model) return null;
      return { code: model.getValue(), language: langOf(model) };
    } catch (e) {
      return null;
    }
  }

  function langOf(model) {
    try {
      return model.getLanguageId ? model.getLanguageId() : model.getModeId();
    } catch (e) {
      return "";
    }
  }

  function readCodeMirror() {
    var el = document.querySelector(".CodeMirror");
    if (el && el.CodeMirror) {
      var cm = el.CodeMirror;
      return { code: cm.getValue(), language: String(cm.getOption("mode") || "") };
    }
    var cm6 = document.querySelector(".cm-content");
    if (cm6 && cm6.cmView && cm6.cmView.view) {
      return { code: cm6.cmView.view.state.doc.toString(), language: "" };
    }
    return null;
  }

  window.addEventListener("sql-tracker-get-code", function () {
    emit("sql-tracker-code", readMonaco() || readCodeMirror() || { code: "", language: "" });
  });

  // ---------- LeetCode submission capture ----------
  // POST /problems/<slug>/submit/  body: { lang, typed_code, ... } -> { submission_id }
  // GET  /submissions/detail/<id>/check/ -> { state: "SUCCESS", status_msg: "Accepted", ... }
  if (!/(^|\.)leetcode\.com$/.test(location.hostname)) return;

  var pending = {}; // submission_id -> { slug, lang, code }
  var reported = {};

  function onSubmit(url, reqBody, resText) {
    var slugMatch = url.match(/\/problems\/([^/]+)\/submit\/?/);
    if (!slugMatch) return;
    try {
      var req = JSON.parse(reqBody || "{}");
      var res = JSON.parse(resText || "{}");
      if (res.submission_id) {
        pending[res.submission_id] = { slug: slugMatch[1], lang: req.lang || "", code: req.typed_code || "" };
      }
    } catch (e) {}
  }

  function onCheck(url, resText) {
    var idMatch = url.match(/\/submissions\/detail\/(\d+)\/check\/?/);
    if (!idMatch) return;
    var id = idMatch[1];
    var sub = pending[id];
    if (!sub || reported[id]) return;
    try {
      var res = JSON.parse(resText || "{}");
      if (res.state !== "SUCCESS") return; // still pending
      delete pending[id];
      if (res.status_msg === "Accepted") {
        reported[id] = true;
        emit("sql-tracker-accepted", { slug: sub.slug, lang: sub.lang, code: sub.code, submissionId: id });
      }
    } catch (e) {}
  }

  function inspect(url, reqBody, resText) {
    if (!url) return;
    if (url.indexOf("/submit") !== -1) onSubmit(url, reqBody, resText);
    else if (url.indexOf("/check") !== -1) onCheck(url, resText);
  }

  // fetch
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var body = init && typeof init.body === "string" ? init.body : "";
      var p = origFetch.apply(this, arguments);
      if (/\/submit\/?|\/check\/?/.test(url)) {
        p.then(function (r) {
          r.clone().text().then(function (t) { inspect(url, body, t); }).catch(function () {});
        }).catch(function () {});
      }
      return p;
    };
  }

  // XHR
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__sqlTrackerUrl = String(url || "");
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    var xhr = this;
    var url = xhr.__sqlTrackerUrl || "";
    if (/\/submit\/?|\/check\/?/.test(url)) {
      xhr.addEventListener("load", function () {
        try {
          if (xhr.responseType === "" || xhr.responseType === "text") {
            inspect(url, typeof body === "string" ? body : "", xhr.responseText);
          } else if (xhr.responseType === "json") {
            inspect(url, typeof body === "string" ? body : "", JSON.stringify(xhr.response));
          }
        } catch (e) {}
      });
    }
    return origSend.apply(this, arguments);
  };
})();
