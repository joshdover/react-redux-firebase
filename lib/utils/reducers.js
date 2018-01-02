'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.recursiveUnset = exports.combineReducers = undefined;

var _unset2 = require('lodash/fp/unset');

var _unset3 = _interopRequireDefault(_unset2);

var _size2 = require('lodash/size');

var _size3 = _interopRequireDefault(_size2);

var _replace2 = require('lodash/replace');

var _replace3 = _interopRequireDefault(_replace2);

var _get2 = require('lodash/get');

var _get3 = _interopRequireDefault(_get2);

exports.pathToArr = pathToArr;
exports.getSlashStrPath = getSlashStrPath;
exports.getDotStrPath = getDotStrPath;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function pathToArr(path) {
  return path ? path.split(/\//).filter(function (p) {
    return !!p;
  }) : [];
}

function getSlashStrPath(path) {
  return pathToArr(path).join('/');
}

function getDotStrPath(path) {
  return pathToArr(path).join('.');
}

var combineReducers = exports.combineReducers = function combineReducers(reducers) {
  return function () {
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var action = arguments[1];
    return Object.keys(reducers).reduce(function (nextState, key) {
      nextState[key] = reducers[key](state[key], action);
      return nextState;
    }, {});
  };
};

var recursiveUnset = exports.recursiveUnset = function recursiveUnset(path, obj) {
  var isRecursiveCall = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (!path) {
    return obj;
  }

  if ((0, _size3.default)((0, _get3.default)(obj, path)) > 0 && isRecursiveCall) {
    return obj;
  }

  var objectWithRemovedKey = (0, _unset3.default)(path, obj);
  var newPath = path.match(/\./) ? (0, _replace3.default)(path, /\.[^.]*$/, '') : '';
  return recursiveUnset(newPath, objectWithRemovedKey, true);
};