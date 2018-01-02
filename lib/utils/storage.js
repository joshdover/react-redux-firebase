"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var deleteFile = exports.deleteFile = function deleteFile(firebase, _ref) {
  var path = _ref.path,
      dbPath = _ref.dbPath;
  return firebase.storage().ref(path).delete().then(function () {
    return !dbPath || !firebase.database ? { path: path } : firebase.database().ref(dbPath).remove().then(function () {
      return { path: path, dbPath: dbPath };
    });
  });
};