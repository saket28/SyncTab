var sessionList = $("#sessions");
var folderName = "SyncTab Sessions";
var rootFolderId = "";

function _log(obj) {
  console.log(obj);
}

$(function () {
  var searchBox = $("#search");
  searchBox.change(function () {
    sessionList.empty();
    showSessions(searchBox.val());
  });

  $("#saveButton").click(function () {
    sessionList.empty();
    saveSession(function () {
      showSessions();
    });
  });

  $("#saveCloseButton").click(function () {
    sessionList.empty();
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
  var bookmarkTreeNodes = chrome.bookmarks.getSubTree(rootFolderId, function (
    bookmarkTreeNodes
  ) {
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
  var list = $("<ul>");
  var i;
  for (i = 0; i < bookmarkNodes.length; i++) {
    list.append(_dumpNode(bookmarkNodes[i], query));
  }
  return list;
}

function _dumpNode(bookmarkNode, query) {
  if (bookmarkNode.title) {
    if (query && !bookmarkNode.children) {
      if (String(bookmarkNode.title).indexOf(query) == -1) {
        return $("<span></span>");
      }
    }
    var nodeSpan = $("<span>");
    // anchor
    var anchor = $("<a>");
    anchor.attr("href", bookmarkNode.url);
    anchor.text(bookmarkNode.title);
    anchor.click(function () {
      chrome.tabs.create({ url: bookmarkNode.url });
    });
    nodeSpan.append(anchor);

    // options on hover
    var optionSpan = bookmarkNode.children
      ? $('<span>[<a href="#" id="restorelink">Restore</a>]</span>')
      : $('<span>[<a href="#" id="deletelink">Delete</a>]</span>');
    nodeSpan.hover(
      function () {
        nodeSpan.append(optionSpan);
        $("#restorelink").click(function () {
          chrome.bookmarks.getSubTree(String(bookmarkNode.id), function (bookmarkTreeNodes) {
            $.each(bookmarkTreeNodes[0].children, function (x, node) {
              if (node.url) {
                chrome.tabs.create({ url: node.url });
              }
            });
          });
          chrome.bookmarks.removeTree(String(bookmarkNode.id));
          sessionList.empty();
          window.showSessions();
        });
        $("#deletelink").click(function () {
          chrome.bookmarks.remove(String(bookmarkNode.id));
          nodeSpan.parent().remove();
        });
      },
      // unhover
      function () {
        optionSpan.remove();
      }
    );
  }
  var li = $(bookmarkNode.title ? "<li>" : "<div>").append(nodeSpan);
  if (bookmarkNode.children && bookmarkNode.children.length > 0) {
    li.append(_dumpTreeNodes(bookmarkNode.children, query));
  }
  return li;
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
