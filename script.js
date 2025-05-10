/* -------------------------------------------------
   script.js   —   hierarchical votes (<placeId>/<uid>)
-------------------------------------------------- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  set,
  remove,
} from "https://www.gstatic.com/firebasejs/9.20.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";

/* 1 — Firebase config (use the dev project you already
      have in src/firebase.js so Auth works)           */
const firebaseConfig = {
  apiKey: "AIzaSyBwCsdvs_hz6HAled6-6vCKW47qQQHL3zs",
  authDomain: "lunchvote-dev.firebaseapp.com",
  databaseURL:
    "https://lunchvote-dev-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lunchvote-dev",
  appId: "1:123456789:web:abcdef",
};

/* 2 — init */
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

/* 3 — DB refs */
const placesRef = ref(database, "places"); // names only
const votesRef  = ref(database, "votes");  // /votes/<placeId>/<uid> → true

/* 4 — DOM handles */
const placeForm           = document.getElementById("placeForm");
const placesList          = document.getElementById("placesList");
const placeInput          = document.getElementById("placeInput");
const leadingPlaceDisplay = document.getElementById("leadingPlace");
const deletePollButton    = document.getElementById("deletePollButton");

const USER_VOTE_KEY = "lunchVoteUserChoice";

/* -------------------------------------------------
   5 — Add new place (same as before)
-------------------------------------------------- */
function handleAddPlace(e) {
  e.preventDefault();
  const placeName = placeInput.value.trim();
  if (!placeName) return;
  push(placesRef, { name: placeName }).then(() => {
    placeInput.value = "";
    placeInput.focus();
  });
}

/* -------------------------------------------------
   6 — Vote  (✨ hierarchical path)
-------------------------------------------------- */
async function handleVote(selectedPlaceId) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in first (top-right button)");
    return;
  }
  const uid = user.uid;

  const currentVoteId = localStorage.getItem(USER_VOTE_KEY);
  if (selectedPlaceId === currentVoteId) return; // no change

  /* add / overwrite new vote */
  await set(ref(database, `votes/${selectedPlaceId}/${uid}`), true);

  /* delete old vote, if any */
  if (currentVoteId) {
    await remove(ref(database, `votes/${currentVoteId}/${uid}`));
  }

  localStorage.setItem(USER_VOTE_KEY, selectedPlaceId);
}

/* -------------------------------------------------
   7 — UI helpers
-------------------------------------------------- */
function clearUI() {
  placesList.innerHTML = "";
  leadingPlaceDisplay.textContent = "";
}

function computeVoteCounts(votesData = {}) {
  /* returns { placeId: count } */
  const counts = {};
  for (const placeId in votesData) {
    counts[placeId] = Object.keys(votesData[placeId]).length;
  }
  return counts;
}

/* -------------------------------------------------
   8 — Render (combines places + votes snapshots)
-------------------------------------------------- */
let placesCache = {};
let votesCache  = {};

function render() {
  clearUI();

  const voteCounts = computeVoteCounts(votesCache);
  const userVoteId = localStorage.getItem(USER_VOTE_KEY);

  const placeIds = Object.keys(placesCache);
  if (placeIds.length === 0) {
    deletePollButton.style.display = "none";
    leadingPlaceDisplay.textContent = "Add a lunch place to start the poll!";
    return;
  }
  deletePollButton.style.display = "block";

  /* sort alphabetically */
  placeIds.sort((a, b) =>
    placesCache[a].name.localeCompare(placesCache[b].name, undefined, {
      sensitivity: "base",
    })
  );

  let maxVotes = -1;
  const leading = [];

  placeIds.forEach((placeId) => {
    const place = placesCache[placeId];
    const votes = voteCounts[placeId] || 0;

    /* list item */
    const li = document.createElement("li");
    li.dataset.id = placeId;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = place.name;
    nameSpan.className = "place-name";

    const countSpan = document.createElement("span");
    countSpan.textContent = votes;
    countSpan.className = "vote-count";

    li.append(nameSpan, countSpan);

    if (placeId === userVoteId) li.classList.add("voted");
    li.addEventListener("click", () => handleVote(placeId));

    placesList.appendChild(li);

    /* leading calc */
    if (votes > maxVotes) {
      maxVotes = votes;
      leading.length = 0;
      leading.push(place.name);
    } else if (votes === maxVotes && votes !== 0) {
      leading.push(place.name);
    }
  });

  /* leading display */
  if (maxVotes <= 0) {
    leadingPlaceDisplay.textContent = "No votes cast yet.";
  } else if (leading.length === 1) {
    leadingPlaceDisplay.textContent = `Leading: ${leading[0]} (${maxVotes} vote${
      maxVotes === 1 ? "" : "s"
    })`;
  } else {
    leadingPlaceDisplay.textContent = `Tie: ${leading.join(
      ", "
    )} (${maxVotes} votes)`;
  }
}

/* -------------------------------------------------
   9 — Delete poll (names + votes)
-------------------------------------------------- */
function handleDeletePoll() {
  if (
    !confirm(
      "Are you sure you want to delete the entire poll? This cannot be undone."
    )
  )
    return;

  Promise.all([remove(placesRef), remove(votesRef)]).then(() => {
    localStorage.removeItem(USER_VOTE_KEY);
  });
}

/* -------------------------------------------------
   10 — Live listeners
-------------------------------------------------- */
onValue(placesRef, (snap) => {
  placesCache = snap.val() || {};
  render();
});

onValue(votesRef, (snap) => {
  votesCache = snap.val() || {};
  render();
});

/* -------------------------------------------------
   11 — Event wiring
-------------------------------------------------- */
placeForm.addEventListener("submit", handleAddPlace);
deletePollButton.addEventListener("click", handleDeletePoll);

/* End of script.js */
