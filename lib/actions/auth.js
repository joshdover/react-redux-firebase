'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signInWithPhoneNumber = exports.linkWithCredential = exports.reloadAuth = exports.updateEmail = exports.updateAuth = exports.updateProfile = exports.verifyPasswordResetCode = exports.confirmPasswordReset = exports.resetPassword = exports.createUser = exports.logout = exports.login = exports.init = exports.handleRedirectResult = exports.createUserProfile = exports.watchUserProfile = exports.handleProfileWatchResponse = exports.unWatchUserProfile = undefined;

var _omit2 = require('lodash/omit');

var _omit3 = _interopRequireDefault(_omit2);

var _forEach2 = require('lodash/forEach');

var _forEach3 = _interopRequireDefault(_forEach2);

var _isFunction2 = require('lodash/isFunction');

var _isFunction3 = _interopRequireDefault(_isFunction2);

var _isString2 = require('lodash/isString');

var _isString3 = _interopRequireDefault(_isString2);

var _isArray2 = require('lodash/isArray');

var _isArray3 = _interopRequireDefault(_isArray2);

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _constants = require('../constants');

var _helpers = require('../helpers');

var _auth = require('../utils/auth');

var _populate = require('../utils/populate');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var dispatchLoginError = function dispatchLoginError(dispatch, authError) {
  return dispatch({
    type: _constants.actionTypes.LOGIN_ERROR,
    authError: authError
  });
};

var unWatchUserProfile = exports.unWatchUserProfile = function unWatchUserProfile(firebase) {
  var _firebase$_ = firebase._,
      authUid = _firebase$_.authUid,
      _firebase$_$config = _firebase$_.config,
      userProfile = _firebase$_$config.userProfile,
      useFirestoreForProfile = _firebase$_$config.useFirestoreForProfile;

  if (firebase._.profileWatch) {
    if (useFirestoreForProfile && firebase.firestore) {
      firebase._.profileWatch();
    } else {
      firebase.database().ref().child(userProfile + '/' + authUid).off('value', firebase._.profileWatch);
    }
    firebase._.profileWatch = null;
  }
};

var getProfileFromSnap = function getProfileFromSnap(snap) {
  if (snap && snap.val) {
    return snap.val();
  }

  if (snap && snap.data && snap.exists) {
    return snap.data();
  }
  return null;
};

var handleProfileWatchResponse = exports.handleProfileWatchResponse = function handleProfileWatchResponse(dispatch, firebase, userProfileSnap) {
  var _firebase$_$config2 = firebase._.config,
      profileParamsToPopulate = _firebase$_$config2.profileParamsToPopulate,
      autoPopulateProfile = _firebase$_$config2.autoPopulateProfile,
      useFirestoreForProfile = _firebase$_$config2.useFirestoreForProfile;

  var profile = getProfileFromSnap(userProfileSnap);
  if (!profileParamsToPopulate || useFirestoreForProfile || !(0, _isArray3.default)(profileParamsToPopulate) && !(0, _isString3.default)(profileParamsToPopulate)) {
    if (useFirestoreForProfile && profileParamsToPopulate) {
      console.warn('Profile population is not yet supported for Firestore');
    }
    dispatch({ type: _constants.actionTypes.SET_PROFILE, profile: profile });
  } else {
    (0, _populate.promisesForPopulate)(firebase, userProfileSnap.key, profile, profileParamsToPopulate).then(function (data) {
      (0, _forEach3.default)(data, function (result, path) {
        dispatch({
          type: _constants.actionTypes.SET,
          path: path,
          data: result,
          timestamp: Date.now(),
          requesting: false,
          requested: true
        });
      });
      if (!autoPopulateProfile) {
        dispatch({ type: _constants.actionTypes.SET_PROFILE, profile: profile });
      } else {
        var populates = (0, _populate.getPopulateObjs)(profileParamsToPopulate);
        var _profile = userProfileSnap.val();
        dispatch({
          type: _constants.actionTypes.SET_PROFILE,
          profile: (0, _helpers.populate)({ profile: _profile, data: data }, 'profile', populates)
        });
      }
    }).catch(function (err) {
      dispatch({ type: _constants.actionTypes.UNAUTHORIZED_ERROR, authError: 'Error during profile population: ' + err.message });

      dispatch({ type: _constants.actionTypes.SET_PROFILE, profile: profile });
    });
  }
};

var watchUserProfile = exports.watchUserProfile = function watchUserProfile(dispatch, firebase) {
  var _firebase$_2 = firebase._,
      authUid = _firebase$_2.authUid,
      _firebase$_2$config = _firebase$_2.config,
      userProfile = _firebase$_2$config.userProfile,
      useFirestoreForProfile = _firebase$_2$config.useFirestoreForProfile;

  unWatchUserProfile(firebase);

  if (userProfile) {
    if (useFirestoreForProfile && firebase.firestore) {
      firebase._.profileWatch = firebase.firestore().collection(userProfile).doc(authUid).onSnapshot(function (userProfileSnap) {
        return handleProfileWatchResponse(dispatch, firebase, userProfileSnap);
      });
    } else if (firebase.database) {
      firebase._.profileWatch = firebase.database().ref().child(userProfile + '/' + authUid).on('value', function (userProfileSnap) {
        return handleProfileWatchResponse(dispatch, firebase, userProfileSnap);
      });
    } else {
      throw new Error('Real Time Database or Firestore must be included to enable user profile');
    }
  }
};

var createUserProfile = exports.createUserProfile = function createUserProfile(dispatch, firebase, userData, profile) {
  var config = firebase._.config;

  if (!config.userProfile || !firebase.database && !firebase.firestore) {
    return Promise.resolve(userData);
  }

  if ((0, _isFunction3.default)(config.profileFactory)) {
    try {
      profile = config.profileFactory(userData, profile);
    } catch (err) {
      console.error('Error occured within profileFactory function:', err.message || err);
      return Promise.reject(err);
    }
  }
  if (config.useFirestoreForProfile) {
    return firebase.firestore().collection(config.userProfile).doc(userData.uid).get().then(function (profileSnap) {
      return !config.updateProfileOnLogin && profileSnap.exists ? profileSnap.data() : profileSnap.ref.set((0, _omit3.default)(profile, ['providerData'])).then(function () {
        return profile;
      });
    }).catch(function (err) {
      dispatch({ type: _constants.actionTypes.UNAUTHORIZED_ERROR, authError: err });
      return Promise.reject(err);
    });
  }

  return firebase.database().ref().child(config.userProfile + '/' + userData.uid).once('value').then(function (profileSnap) {
    return !config.updateProfileOnLogin && profileSnap.val() !== null ? profileSnap.val() : profileSnap.ref.update(profile).then(function () {
      return profile;
    });
  }).catch(function (err) {
    dispatch({ type: _constants.actionTypes.UNAUTHORIZED_ERROR, authError: err });
    return Promise.reject(err);
  });
};

var setupPresence = function setupPresence(dispatch, firebase) {
  if (!firebase.database || !firebase.database.ServerValue) {
    return;
  }
  var ref = firebase.database().ref();
  var _firebase$_3 = firebase._,
      _firebase$_3$config = _firebase$_3.config,
      presence = _firebase$_3$config.presence,
      sessions = _firebase$_3$config.sessions,
      authUid = _firebase$_3.authUid;

  var amOnline = ref.child('.info/connected');
  var onlineRef = ref.child((0, _isFunction3.default)(presence) ? presence(firebase.auth().currentUser, firebase) : presence).child(authUid);
  var sessionsRef = (0, _isFunction3.default)(sessions) ? sessions(firebase.auth().currentUser, firebase) : sessions;
  if (sessionsRef) {
    sessionsRef = ref.child(sessions);
  }
  amOnline.on('value', function (snapShot) {
    if (!snapShot.val()) return;

    if (sessionsRef) {
      dispatch({ type: _constants.actionTypes.SESSION_START, payload: authUid });

      var session = sessionsRef.push({
        startedAt: firebase.database.ServerValue.TIMESTAMP,
        user: authUid
      });

      if ((0, _isFunction3.default)(session.setPriority)) {
        session.setPriority(authUid);
      }
      session.child('endedAt').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP, function () {
        dispatch({ type: _constants.actionTypes.SESSION_END });
      });
    }

    onlineRef.set(true);
    onlineRef.onDisconnect().remove();
  });
};

var handleAuthStateChange = function handleAuthStateChange(dispatch, firebase, authData) {
  var config = firebase._.config;

  if (!authData) {
    if ((0, _isFunction3.default)(config.onAuthStateChanged)) {
      firebase._.config.onAuthStateChanged(authData, firebase, dispatch);
    }
    dispatch({
      type: _constants.actionTypes.AUTH_EMPTY_CHANGE,
      preserve: config.preserveOnEmptyAuthChange
    });
  } else {
    firebase._.authUid = authData.uid;
    if (config.presence) {
      setupPresence(dispatch, firebase);
    }

    watchUserProfile(dispatch, firebase);

    dispatch({
      type: _constants.actionTypes.LOGIN,
      auth: authData,
      preserve: config.preserveOnLogin
    });

    if ((0, _isFunction3.default)(config.onAuthStateChanged)) {
      config.onAuthStateChanged(authData, firebase, dispatch);
    }
  }
};

var handleRedirectResult = exports.handleRedirectResult = function handleRedirectResult(dispatch, firebase, authData) {
  if (typeof firebase._.config.onRedirectResult === 'function') {
    firebase._.config.onRedirectResult(authData, firebase, dispatch);
  }
  if (authData && authData.user) {
    var user = authData.user;


    firebase._.authUid = user.uid;
    watchUserProfile(dispatch, firebase);

    dispatch({
      type: _constants.actionTypes.LOGIN,
      auth: user,
      preserve: firebase._.config.preserveOnLogin
    });

    createUserProfile(dispatch, firebase, user, {
      email: user.email,
      displayName: user.providerData[0].displayName || user.email,
      avatarUrl: user.providerData[0].photoURL,
      providerData: user.providerData,
      credential: authData.credential
    });
  }
};

var init = exports.init = function init(dispatch, firebase) {
  if (!firebase.auth) {
    return;
  }
  dispatch({ type: _constants.actionTypes.AUTHENTICATION_INIT_STARTED });

  firebase.auth().onAuthStateChanged(function (authData) {
    return handleAuthStateChange(dispatch, firebase, authData);
  });

  if (firebase._.config.enableRedirectHandling && (0, _isFunction3.default)(firebase.auth().getRedirectResult) && typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.indexOf('http') !== -1) {
    firebase.auth().getRedirectResult().then(function (authData) {
      return handleRedirectResult(dispatch, firebase, authData);
    }).catch(function (error) {
      dispatchLoginError(dispatch, error);
      return Promise.reject(error);
    });
  }

  firebase.auth().currentUser;

  dispatch({ type: _constants.actionTypes.AUTHENTICATION_INIT_FINISHED });
};
var login = exports.login = function login(dispatch, firebase, credentials) {
  var _firebase$auth;

  if (firebase._.config.resetBeforeLogin) {
    dispatchLoginError(dispatch, null);
  }

  var _getLoginMethodAndPar = (0, _auth.getLoginMethodAndParams)(firebase, credentials),
      method = _getLoginMethodAndPar.method,
      params = _getLoginMethodAndPar.params;

  return (_firebase$auth = firebase.auth())[method].apply(_firebase$auth, _toConsumableArray(params)).then(function (userData) {
    if (!userData) return Promise.resolve(null);

    if (method === 'signInWithEmailAndPassword') {
      return { user: userData };
    }

    if (method === 'signInWithCustomToken') {
      if (!firebase._.config.updateProfileOnLogin) {
        return { user: userData };
      }
      return createUserProfile(dispatch, firebase, userData, credentials.profile);
    }

    var user = userData.user || userData;
    var credential = userData.credential || {};

    return createUserProfile(dispatch, firebase, user, {
      email: user.email,
      displayName: user.providerData[0].displayName || user.email,
      avatarUrl: user.providerData[0].photoURL,
      providerData: user.providerData,
      credential: credential
    }).then(function (profile) {
      return _extends({ profile: profile }, userData);
    });
  }).catch(function (err) {
    dispatchLoginError(dispatch, err);
    return Promise.reject(err);
  });
};

var logout = exports.logout = function logout(dispatch, firebase) {
  return firebase.auth().signOut().then(function () {
    dispatch({
      type: _constants.actionTypes.LOGOUT,
      preserve: firebase._.config.preserveOnLogout
    });
    firebase._.authUid = null;
    unWatchUserProfile(firebase);
    return firebase;
  });
};

var createUser = exports.createUser = function createUser(dispatch, firebase, _ref, profile) {
  var email = _ref.email,
      password = _ref.password,
      signIn = _ref.signIn;

  dispatchLoginError(dispatch, null);

  if (!email || !password) {
    var error = new Error('Email and Password are required to create user');
    dispatchLoginError(dispatch, error);
    return Promise.reject(error);
  }

  return firebase.auth().createUserWithEmailAndPassword(email, password).then(function (userData) {
    return firebase.auth().currentUser || !!signIn && signIn === false ? createUserProfile(dispatch, firebase, userData, profile || { email: email }) : login(dispatch, firebase, { email: email, password: password }).then(function () {
      return createUserProfile(dispatch, firebase, userData, profile || { email: email });
    }).catch(function (err) {
      if (err) {
        switch (err.code) {
          case 'auth/user-not-found':
            dispatchLoginError(dispatch, new Error('The specified user account does not exist.'));
            break;
          default:
            dispatchLoginError(dispatch, err);
        }
      }
      return Promise.reject(err);
    });
  }).catch(function (err) {
    dispatchLoginError(dispatch, err);
    return Promise.reject(err);
  });
};

var resetPassword = exports.resetPassword = function resetPassword(dispatch, firebase, email) {
  dispatchLoginError(dispatch, null);
  return firebase.auth().sendPasswordResetEmail(email).catch(function (err) {
    if (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          dispatchLoginError(dispatch, new Error('The specified user account does not exist.'));
          break;
        default:
          dispatchLoginError(dispatch, err);
      }
      return Promise.reject(err);
    }
  });
};

var confirmPasswordReset = exports.confirmPasswordReset = function confirmPasswordReset(dispatch, firebase, code, password) {
  dispatchLoginError(dispatch, null);
  return firebase.auth().confirmPasswordReset(code, password).catch(function (err) {
    if (err) {
      switch (err.code) {
        case 'auth/expired-action-code':
          dispatchLoginError(dispatch, new Error('The action code has expired.'));
          break;
        case 'auth/invalid-action-code':
          dispatchLoginError(dispatch, new Error('The action code is invalid.'));
          break;
        case 'auth/user-disabled':
          dispatchLoginError(dispatch, new Error('The user is disabled.'));
          break;
        case 'auth/user-not-found':
          dispatchLoginError(dispatch, new Error('The user is not found.'));
          break;
        case 'auth/weak-password':
          dispatchLoginError(dispatch, new Error('The password is not strong enough.'));
          break;
        default:
          dispatchLoginError(dispatch, err);
      }
      return Promise.reject(err);
    }
  });
};

var verifyPasswordResetCode = exports.verifyPasswordResetCode = function verifyPasswordResetCode(dispatch, firebase, code) {
  dispatchLoginError(dispatch, null);
  return firebase.auth().verifyPasswordResetCode(code).catch(function (err) {
    if (err) {
      dispatchLoginError(dispatch, err);
    }
    return Promise.reject(err);
  });
};

var updateProfile = exports.updateProfile = function updateProfile(dispatch, firebase, profileUpdate) {
  var config = firebase._.config;

  dispatch({
    type: _constants.actionTypes.PROFILE_UPDATE_START,
    payload: profileUpdate
  });

  var updatePromise = config.useFirestoreForProfile ? _auth.updateProfileOnFirestore : _auth.updateProfileOnRTDB;
  return updatePromise(firebase, profileUpdate).then(function (snap) {
    dispatch({
      type: _constants.actionTypes.PROFILE_UPDATE_SUCCESS,
      payload: config.useFirestoreForProfile ? snap.data() : snap.val()
    });
    return snap;
  }).catch(function (error) {
    dispatch({ type: _constants.actionTypes.PROFILE_UPDATE_ERROR, error: error });
    return Promise.reject(error);
  });
};

var updateAuth = exports.updateAuth = function updateAuth(dispatch, firebase, authUpdate, updateInProfile) {
  dispatch({ type: _constants.actionTypes.AUTH_UPDATE_START, payload: authUpdate });

  if (!firebase.auth().currentUser) {
    var error = new Error('User must be logged in to update auth.');
    dispatch({ type: _constants.actionTypes.AUTH_UPDATE_ERROR, payload: error });
    return Promise.reject(error);
  }

  return firebase.auth().currentUser.updateProfile(authUpdate).then(function (payload) {
    dispatch({
      type: _constants.actionTypes.AUTH_UPDATE_SUCCESS,
      payload: firebase.auth().currentUser
    });
    if (updateInProfile) {
      return updateProfile(dispatch, firebase, authUpdate);
    }
    return payload;
  }).catch(function (error) {
    dispatch({ type: _constants.actionTypes.AUTH_UPDATE_ERROR, error: error });
    return Promise.reject(error);
  });
};

var updateEmail = exports.updateEmail = function updateEmail(dispatch, firebase, newEmail, updateInProfile) {
  dispatch({ type: _constants.actionTypes.EMAIL_UPDATE_START, payload: newEmail });

  if (!firebase.auth().currentUser) {
    var error = new Error('User must be logged in to update email.');
    dispatch({ type: _constants.actionTypes.EMAIL_UPDATE_ERROR, error: error });
    return Promise.reject(error);
  }

  return firebase.auth().currentUser.updateEmail(newEmail).then(function (payload) {
    dispatch({ type: _constants.actionTypes.EMAIL_UPDATE_SUCCESS, payload: newEmail });
    if (updateInProfile) {
      return updateProfile(dispatch, firebase, { email: newEmail });
    }
    return payload;
  }).catch(function (error) {
    dispatch({ type: _constants.actionTypes.EMAIL_UPDATE_ERROR, error: error });
    return Promise.reject(error);
  });
};

var reloadAuth = exports.reloadAuth = function reloadAuth(dispatch, firebase) {
  dispatch({ type: _constants.actionTypes.AUTH_RELOAD_START });

  if (!firebase.auth().currentUser) {
    var error = new Error('User must be logged in to reload auth.');
    dispatch({ type: _constants.actionTypes.AUTH_RELOAD_ERROR, error: error });
    return Promise.reject(error);
  }

  return firebase.auth().currentUser.reload().then(function () {
    var auth = firebase.auth().currentUser;
    dispatch({ type: _constants.actionTypes.AUTH_RELOAD_SUCCESS, payload: auth });
    return auth;
  }).catch(function (error) {
    dispatch({ type: _constants.actionTypes.AUTH_RELOAD_ERROR, error: error });
    return Promise.reject(error);
  });
};

var linkWithCredential = exports.linkWithCredential = function linkWithCredential(dispatch, firebase, credential) {
  dispatch({ type: _constants.actionTypes.AUTH_LINK_START });

  if (!firebase.auth().currentUser) {
    var error = new Error('User must be logged in to link with credential.');
    dispatch({ type: _constants.actionTypes.AUTH_LINK_ERROR, error: error });
    return Promise.reject(error);
  }

  return firebase.auth().currentUser.linkWithCredential(credential).then(function (auth) {
    dispatch({ type: _constants.actionTypes.AUTH_LINK_SUCCESS, payload: auth });
    return auth;
  }).catch(function (error) {
    dispatch({ type: _constants.actionTypes.AUTH_LINK_ERROR, error: error });
    return Promise.reject(error);
  });
};

var signInWithPhoneNumber = exports.signInWithPhoneNumber = function signInWithPhoneNumber(firebase, dispatch) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  var _firebase$auth2;

  dispatch({ type: _constants.actionTypes.UNLOAD_PROFILE });

  return (_firebase$auth2 = firebase.auth()).signInWithPhoneNumber.apply(_firebase$auth2, args).then(function (confirmationResult) {
    return _extends({}, confirmationResult, {
      confirm: function confirm(code) {
        return confirmationResult.confirm(code).then(function (userData) {
          var user = userData.user || userData;

          return createUserProfile(dispatch, firebase, user, {
            email: user.email,
            displayName: user.providerData[0].displayName || user.email,
            avatarUrl: user.providerData[0].photoURL,
            providerData: user.providerData
          }).then(function (profile) {
            return _extends({ profile: profile }, userData);
          });
        });
      }
    });
  }).catch(function (err) {
    dispatchLoginError(dispatch, err);
    return Promise.reject(err);
  });
};

exports.default = {
  dispatchLoginError: dispatchLoginError,
  unWatchUserProfile: unWatchUserProfile,
  watchUserProfile: watchUserProfile,
  init: init,
  createUserProfile: createUserProfile,
  login: login,
  logout: logout,
  createUser: createUser,
  resetPassword: resetPassword,
  confirmPasswordReset: confirmPasswordReset,
  verifyPasswordResetCode: verifyPasswordResetCode,
  updateAuth: updateAuth,
  updateProfile: updateProfile,
  updateEmail: updateEmail,
  reloadAuth: reloadAuth,
  signInWithPhoneNumber: signInWithPhoneNumber
};