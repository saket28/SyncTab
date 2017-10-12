var sessionList = $("#sessions");
var folderName = "SyncTab Sessions";
var rootFolderId = "";

function _log(obj) {
  console.log(obj);
}

$(function () {
  var searchBox = $("#search");
  searchBox.change(function () {
    showSessions(searchBox.val());
  });

  $("#saveButton").click(function () {
    saveSession(function () {
      showSessions();
    });
  });

  $("#saveCloseButton").click(function () {
    saveSession(function () {
      closeSession(function () {
        showSessions();
      });
    });
  });
});

function init(callback) {
  chrome.bookmarks.getTree(function (bookmarkNodes) {
    var rootNodesParentNode = bookmarkNodes[0].children[1];
    $.each(rootNodesParentNode.children, function (i, bookmarkNode) {
      if (bookmarkNode.title == folderName) {
        rootFolderId = String(bookmarkNode.id);
        _log("Found rootFolderId: " + rootFolderId);
        callback();
      }
    });
    if (rootFolderId.length == 0) {
      chrome.bookmarks.create({ index: 0, title: folderName }, function (node) {
        rootFolderId = String(node.id);
        _log("Created rootFolderId: " + rootFolderId);
        callback();
      });
    }
  });
}

function showSessions(query) {
  sessionList.empty();
  var bookmarkTreeNodes = chrome.bookmarks.getSubTree(rootFolderId, function (bookmarkTreeNodes) {
    sessionList.append(_dumpTreeNodes(bookmarkTreeNodes[0].children, query));
  });
}

function saveSession(callback) {
  chrome.bookmarks.create({ index: 0, title: _datestring(), parentId: rootFolderId }, function (sessionNode) {
    var tabs = chrome.tabs.query({ currentWindow: true }, function (tabs) {
      $.each(tabs, function (i, tab) {
        chrome.bookmarks.create({ url: tab.url, title: tab.title, parentId: sessionNode.id }, function () {
          _log("Saved " + tab.url);
        })
      });
      callback();
    });
  });
}

function closeSession(callback) {
  var tabs = chrome.tabs.query({ currentWindow: true }, function (tabs) {
    $.each(tabs, function (i, tab) {
      chrome.tabs.remove(tab.id, function () {
        _log("Closed " + tab.url);
      });
    });
    callback();
  });
}

function _dumpTreeNodes(bookmarkNodes, query) {
  $.each(bookmarkNodes, function(i, session){
    sessionList.append(_addSessionNode(session));
    $.each(session.children, function(j, tab){
      if (!query || String(tab.title).indexOf(query) != -1) {
        sessionList.append(_addTabNode(tab));
      }
    });
    sessionList.append($("<hr>"));
  });
}

function _addSessionNode(sessionNode) {
  var div = $("<h3>", { class: 'session' });
  div.append($("<a>", {"href": '#'})
   .html(sessionNode.title + " &#x279f;")
   .click(function () {
      chrome.bookmarks.getSubTree(String(sessionNode.id), function (tabNodes) {
      $.each(tabNodes[0].children, function (x, tabNode) {
        if (tabNode.url) {
          chrome.tabs.create({ url: tabNode.url });
        }
      });
      chrome.bookmarks.removeTree(String(sessionNode.id));
      window.showSessions();
    });
   })
  );
  return div;
}

function _addTabNode(tabNode) {
  var div = $("<div>", { class: 'tab' });

  div.append($("<a>", {"href": '#', "class": "tab-action"})
  .html('&#x2718;')
  .click(function () {
    chrome.bookmarks.remove(String(tabNode.id));
    window.showSessions();
  })
);

div.append($("<a>", {"href": "#"})
    .text(tabNode.title)
    .click(function () {
      chrome.tabs.create({ url: tabNode.url });
    })
  );

  return div;
}

function restoreSession(sessionId) {
  chrome.bookmarks.getSubTree(sessionId, function (bookmarkTreeNodes) {
    $.each(bookmarkTreeNodes[0].children, function (x, node) {
      if (node.url) {
        chrome.tabs.create({ url: node.url });
      }
    });
  });
  chrome.bookmarks.removeTree(sessionId);
  showSessions();
}

function _datestring() {
  var d = new Date();
  var datestring = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
  return datestring;
}

document.addEventListener("DOMContentLoaded", function () {
  init(function () {
    showSessions();
  });
});
