initializeFireBase();
const DATABASE = firebase.database();
const ROOT_REF = DATABASE.ref();
let userRef = null;
const HOME_PAGE = "https://64e65675ecae4d10b77d3bce--chipper-genie-d5a8fa.netlify.app/"

function initializeFireBase() {
    // The Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    let firebaseConfig = {
        apiKey: "AIzaSyDNoxennmAjR3Yjh9Rpe4ahpHv0zYcdO9Y",
        authDomain: "simple-imdb-search.firebaseapp.com",
        databaseURL: "https://simple-imdb-search.firebaseio.com",
        projectId: "simple-imdb-search",
        storageBucket: "simple-imdb-search.appspot.com",
        messagingSenderId: "875771108342",
        appId: "1:875771108342:web:63ed0e9505a5ac087b45d7",
        measurementId: "G-NZGQ93J58S"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
}

// FirebaseUI config.
let uiConfig = {
  callbacks: {
    /*
       uiShown: function() {
    // The widget is rendered.
    // Hide the loader.
    document.getElementById('loader').style.display = 'none';
  }

     */
  },
    // signInSuccess: function(currentUser, credential, redirectUrl) {
    //     return false; //this will stop the signinsuccessurl from being used
    //     },
   // signInSuccessUrl: HOME_PAGE,
    signInOptions: [
        // Leave the lines as is for the providers you want to offer your users.
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
    ],
    // tosUrl and privacyPolicyUrl accept either url string or a callback
    // function.
    // Terms of service url/callback.
    tosUrl: '<your-tos-url>',
    // Privacy policy url/callback.
    privacyPolicyUrl: function() {
        window.location.assign('<your-privacy-policy-url>');
    }
};

// Initialize the FirebaseUI Widget using Firebase.
let ui = new firebaseui.auth.AuthUI(firebase.auth());
// The start method will wait until the DOM is loaded.

ui.start('#firebaseui-signup-container', uiConfig);

function convertAccount(){
  // Temp variable to hold the anonymous user data if needed.
  let data = null;
  // Hold a reference to the anonymous current user.
  let anonymousUser = firebase.auth().currentUser;

  // Initialize the FirebaseUI Widget using Firebase.

  ui.start('#convert-acc-registration', {
    // Whether to upgrade anonymous users should be explicitly provided.
    // The user must already be signed in anonymously before FirebaseUI is
    // rendered.
    autoUpgradeAnonymousUsers: true,
    signInSuccessUrl: HOME_PAGE,
    signInOptions: [
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
    ],
    callbacks: {
      // signInFailure callback must be provided to handle merge conflicts which
      // occur when an existing credential is linked to an anonymous user.
      signInFailure: function(error) {
        // For merge conflicts, the error.code will be
        // 'firebaseui/anonymous-upgrade-merge-conflict'.
        if (error.code != 'firebaseui/anonymous-upgrade-merge-conflict') {
          return Promise.resolve();
        }
        // The credential the user tried to sign in with.
        let cred = error.credential;
        // Copy data from anonymous user to permanent user and delete anonymous
        // user.
        // ...
        // Finish sign-in after data is copied.
        return firebase.auth().signInWithCredential(cred);
      }
    }
  });

}

firebase.auth().onAuthStateChanged(firebaseUser => {
    // if the user signs out or in
    // define firebaseUser properties
    // pass firebaseUser to main.js (front end)
    // this fun will also fire when the initial state is determined (on page load or such)

    if (firebaseUser) {
        // User is signed in.
        let uid = firebaseUser.uid;
        userRef = ROOT_REF.child(`users/${uid}/`);

        authStateChanged(firebaseUser);
        readFavouriteMoviesList().then(function(snapshot){

            let hide = "hide";
            handleSidebarLoadingAnimation(hide);

            // this designs will make the sidebar load faster
            // because we only readFavouriteMoviesList once
            // previously called handlePlaceholder and popFavMovList in two separate lines

            // determine if list empty or not --> pass result to handlePlaceholderSpan
            let statusOfList = null;
            if (snapshot.hasChildren()) {
                statusOfList = "notEmpty";
                handlePlaceholderSpan(statusOfList);
            } else if (!snapshot.hasChildren()) {
                statusOfList = "empty";
                handlePlaceholderSpan(statusOfList);
            }

            populateFavouriteMoviesList(snapshot);

        });

        let statusOfList = "unknown";
        handlePlaceholderSpan(statusOfList)

    } else {
        // User is signed out.
        authStateChanged(firebaseUser);
    }
}, function(error) {
    console.log(error);
});

async function readFavouriteMoviesList() {
    //this fun reads the current users branch (root/users/uid/)
    //then returns a promise with a snapshot of the movie-list

    let uid = firebase.auth().currentUser.uid;
    let movieListRef = DATABASE.ref(`users/${uid}`);
    return movieListRef.once("value").then(function (snapshot) {
        return snapshot;
    });

}

function deleteFromFavouriteMovies(imdbID) {
    const movieRef = userRef.child(imdbID);
    movieRef.remove();
}

function firebaseSignOut() {
    //this fun is called when user signs out
    //it signs out, and then redirects user to homepage
    //redirected needed to reset firebaseui div
    firebase.auth().signOut();

  firebase.auth().signOut().then(() => {
    window.location = HOME_PAGE;
  }).catch((error) => {
    console.log(error);
  });
}

async function getFirebaseAuth() {
    return firebase.auth();
}

async function checkIfUserBranchHasChildren() {
    // this fun checks if users list of fav movies is empty

    // limitations: if the user hasn't added any movie at any point, there is no branch created for user
    // this might cause issues at some point

    let boolean;
    return readFavouriteMoviesList().then(function (snapshot) {
        if (snapshot.hasChildren()) {
            boolean = true;
            return boolean;
        } else {
            // no children
            boolean = false;
            return boolean;
        }
    });

}

function pushFavouriteMovie(entryFromAJAX) {
    // what this fun does:
    //   if branch exists
    //       add selected movie
    //   if no branch for currentUser.uid exists
    //     create branch after currentUser.uid, add the selected movie and its title/year/rating

    let uid = firebase.auth().currentUser.uid;
    let newFavouriteMovieRef = ROOT_REF.child("users/" + uid + "/" + entryFromAJAX.imdbID);
    newFavouriteMovieRef.set({
        title: entryFromAJAX.Title,
        year: entryFromAJAX.Year,
        rating: entryFromAJAX.imdbRating
    });

}

async function checkIfMovieAlreadyInFavourites(entryFromAJAX) {
    let boolean = null;
    return readFavouriteMoviesList().then(function (snapshot) {
        if (snapshot.hasChild(entryFromAJAX.imdbID)){
            boolean = true;
            return boolean;
        } else {
            boolean = false;
            return boolean;
        }
    });
}
