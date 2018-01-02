'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateProfileOnFirestore = exports.updateProfileOnRTDB = exports.createAuthIsReady = exports.authIsReady = exports.getLoginMethodAndParams = undefined;

var _isFunction2 = require('lodash/isFunction');

var _isFunction3 = _interopRequireDefault(_isFunction2);

var _isString2 = require('lodash/isString');

var _isString3 = _interopRequireDefault(_isString2);

var _isArray2 = require('lodash/isArray');

var _isArray3 = _interopRequireDefault(_isArray2);

var _capitalize2 = require('lodash/capitalize');

var _capitalize3 = _interopRequireDefault(_capitalize2);

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createAuthProvider = function createAuthProvider(firebase, providerName, scopes) {
  var provider = new firebase.auth[(0, _capitalize3.default)(providerName) + 'AuthProvider']();

  var customAuthParameters = firebase._.config.customAuthParameters;

  if (customAuthParameters && customAuthParameters[providerName]) {
    provider.setCustomParameters(customAuthParameters[providerName]);
  }

  if (providerName.toLowerCase() === 'twitter' || !(0, _isFunction3.default)(provider.addScope)) {
    return provider;
  }

  provider.addScope('email');

  if (scopes) {
    if ((0, _isArray3.default)(scopes)) {
      scopes.forEach(function (scope) {
        provider.addScope(scope);
      });
    }
    if ((0, _isString3.default)(scopes)) {
      provider.addScope(scopes);
    }
  }

  return provider;
};

var getLoginMethodAndParams = exports.getLoginMethodAndParams = function getLoginMethodAndParams(firebase, creds) {
  var email = creds.email,
      password = creds.password,
      provider = creds.provider,
      type = creds.type,
      token = creds.token,
      scopes = creds.scopes,
      credential = creds.credential;

  if (credential) {
    return { method: 'signInWithCredential', params: [credential] };
  }
  if (provider) {
    if (_constants.supportedAuthProviders.indexOf(provider.toLowerCase()) === -1) {
      throw new Error(provider + ' is not a valid Auth Provider');
    }
    if (token) {
      throw new Error('provider with token no longer supported, use credential parameter instead');
    }
    var authProvider = createAuthProvider(firebase, provider, scopes);
    if (type === 'popup') {
      return { method: 'signInWithPopup', params: [authProvider] };
    }
    return { method: 'signInWithRedirect', params: [authProvider] };
  }
  if (token) {
    return { method: 'signInWithCustomToken', params: [token] };
  }
  return { method: 'signInWithEmailAndPassword', params: [email, password] };
};

var isAuthReady = function isAuthReady(store, stateName) {
  var state = store.getState();
  var firebaseState = stateName ? state[stateName] : state;
  var firebaseAuthState = firebaseState && firebaseState.auth;
  if (!firebaseAuthState) {
    throw new Error('The Firebase auth state could not be found in the store under the attribute \'' + (stateName ? stateName + '.' : '') + 'auth\'. Make sure your react-redux-firebase reducer is correctly set in the store');
  }
  return firebaseState.auth.isLoaded;
};

var authIsReady = exports.authIsReady = function authIsReady(store) {
  var stateName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'firebase';
  return new Promise(function (resolve) {
    if (isAuthReady(store, stateName)) {
      resolve();
    } else {
      var unsubscribe = store.subscribe(function () {
        if (isAuthReady(store, stateName)) {
          unsubscribe();
          resolve();
        }
      });
    }
  });
};

var createAuthIsReady = exports.createAuthIsReady = function createAuthIsReady(store, config) {
  return (0, _isFunction3.default)(config.authIsReady) ? config.authIsReady(store, config) : authIsReady(store, config.firebaseStateName);
};

var updateProfileOnRTDB = exports.updateProfileOnRTDB = function updateProfileOnRTDB(firebase, profileUpdate) {
  var database = firebase.database,
      _firebase$_ = firebase._,
      config = _firebase$_.config,
      authUid = _firebase$_.authUid;

  var profileRef = database().ref(config.userProfile + '/' + authUid);
  return profileRef.update(profileUpdate).then(function () {
    return profileRef.once('value');
  });
};

var updateProfileOnFirestore = exports.updateProfileOnFirestore = function updateProfileOnFirestore(firebase, profileUpdate) {
  var firestore = firebase.firestore,
      _firebase$_2 = firebase._,
      config = _firebase$_2.config,
      authUid = _firebase$_2.authUid;

  var profileRef = firestore().doc(config.userProfile + '/' + authUid);
  return profileRef.update(profileUpdate).then(function () {
    return profileRef.get();
  });
};