import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, runTransaction } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-database.js";

// Firebase configuration (using your provided URL)
const firebaseConfig = {
  databaseURL: "https://lunch-poll-db-default-rtdb.asia-southeast1.firebasedatabase.app/"
};
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const placesRef = ref(database, "places"); // Reference to the 'places' node in the database

// Page Elements
const placeForm = document.getElementById('placeForm');
const placesList = document.getElementById('placesList');
const placeInput = document.getElementById('placeInput');
const leadingPlaceDisplay = document.getElementById('leadingPlace');
const deletePollButton = document.getElementById('deletePollButton'); // Get the delete button

// Key for storing the user's vote in local storage
const USER_VOTE_KEY = 'lunchVoteUserChoice';

/**
 * Handles the form submission to add a new lunch place.
 * @param {Event} event - The form submission event.
 */
function handleAddPlace(event) {
  event.preventDefault(); // Prevent default form submission behavior (page reload)
  const placeName = placeInput.value.trim(); // Get the trimmed value from the input

  if (placeName) { // Only add if the input is not empty
    push(placesRef, { // Push a new object to the 'places' node in Firebase
      name: placeName,
      votes: 0 // Initialize votes to 0
    })
    .then(() => {
      placeInput.value = ''; // Clear the input field after successful addition
      placeInput.focus();   // Set focus back to the input field
      console.log(`Place "${placeName}" added successfully.`);
    })
    .catch((error) => {
      console.error("Error adding place: ", error);
      // Consider showing an error message to the user here
    });
  }
}

/**
 * Handles voting for a lunch place.
 * Manages vote increment/decrement using transactions and updates local storage.
 * @param {string} selectedPlaceId - The Firebase key of the place being voted for.
 */
function handleVote(selectedPlaceId) {
  const currentVoteId = localStorage.getItem(USER_VOTE_KEY); // Get the ID of the place the user previously voted for

  // If the user is clicking the same place they already voted for, do nothing
  if (selectedPlaceId === currentVoteId) {
    console.log("Already voted for this place.");
    return;
  }

  // Transaction to increment the selected place's vote count
  const selectedPlaceRef = ref(database, `places/${selectedPlaceId}/votes`);
  runTransaction(selectedPlaceRef, (currentVotes) => {
    if (currentVotes === null) {
      return 1; // Should not happen if data exists, but handles initialization
    }
    return currentVotes + 1; // Increment the votes
  })
  .then(() => {
    console.log(`Vote added for place ID: ${selectedPlaceId}`);
    // Only after successfully incrementing the new vote, decrement the old one (if exists)
    if (currentVoteId) {
      const previousVoteRef = ref(database, `places/${currentVoteId}/votes`);
      runTransaction(previousVoteRef, (currentVotes) => {
        // Check if currentVotes is null or 0 before decrementing
        if (currentVotes === null || currentVotes === 0) {
          return 0; // Can't go below 0
        }
        return currentVotes - 1; // Decrement the votes
      })
      .then(() => {
        console.log(`Previous vote removed for place ID: ${currentVoteId}`);
      })
      .catch((error) => {
        console.error(`Error decrementing vote for ${currentVoteId}: `, error);
        // Note: If this fails, the counts might be temporarily inconsistent.
        // More robust error handling/retry logic could be added.
      });
    }
    // Store the new vote ID in local storage *after* successful transaction
    localStorage.setItem(USER_VOTE_KEY, selectedPlaceId);
  })
  .catch((error) => {
    console.error(`Error incrementing vote for ${selectedPlaceId}: `, error);
    // Consider showing an error message to the user
  });
}


/**
 * Clears the list of places and the leading place display in the UI.
 */
function clearUI() {
  placesList.innerHTML = ''; // Remove all list items
  leadingPlaceDisplay.textContent = ''; // Clear the leading place text
}

/**
 * Updates the display showing the place(s) with the most votes.
 * @param {Object} places - An object containing place data { placeId: { name, votes }, ... }
 */
function updateLeadingPlace(places) {
  if (!places || Object.keys(places).length === 0) {
    leadingPlaceDisplay.textContent = 'No places added yet.';
    return;
  }

  let leadingPlaces = [];
  let maxVotes = -1;

  // Find the maximum vote count
  for (const placeId in places) {
    if (places[placeId].votes > maxVotes) {
      maxVotes = places[placeId].votes;
    }
  }

  // Collect all places with the maximum vote count
  for (const placeId in places) {
    if (places[placeId].votes === maxVotes) {
      leadingPlaces.push(places[placeId].name);
    }
  }

  // Display the result
  if (maxVotes === 0 && leadingPlaces.length === Object.keys(places).length) {
    leadingPlaceDisplay.textContent = 'No votes cast yet.';
  } else if (leadingPlaces.length === 1) {
    leadingPlaceDisplay.textContent = `Leading: ${leadingPlaces[0]} (${maxVotes} vote${maxVotes !== 1 ? 's' : ''})`;
  } else if (leadingPlaces.length > 1) {
    leadingPlaceDisplay.textContent = `Tie: ${leadingPlaces.join(', ')} (${maxVotes} vote${maxVotes !== 1 ? 's' : ''})`;
  } else {
     // This case should ideally not be reached if there are places
     leadingPlaceDisplay.textContent = 'Calculating lead...';
  }
}

/**
 * Renders the list of lunch places in the UI based on data from Firebase.
 * @param {Object} places - An object containing place data { placeId: { name, votes }, ... }
 */
function renderPlaces(places) {
  clearUI(); // Clear the existing list first

  const userVoteId = localStorage.getItem(USER_VOTE_KEY); // Get the user's current vote

  if (places && Object.keys(places).length > 0) {
    // If there are places, show the delete button
    deletePollButton.style.display = 'block';

    // Sort places alphabetically by name for consistent display order
    const sortedPlaceIds = Object.keys(places).sort((a, b) => {
        const nameA = places[a].name.toLowerCase();
        const nameB = places[b].name.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });


    sortedPlaceIds.forEach(placeId => {
      const place = places[placeId];
      if (!place) return; // Skip if place data is missing for some reason

      const li = document.createElement('li');
      li.dataset.id = placeId; // Store the Firebase key (ID) in a data attribute

      const placeNameSpan = document.createElement('span');
      placeNameSpan.textContent = place.name;
      placeNameSpan.className = 'place-name'; // Add class for potential styling

      const voteCountSpan = document.createElement('span');
      voteCountSpan.textContent = place.votes || 0; // Display votes, default to 0 if undefined
      voteCountSpan.className = 'vote-count'; // Add class for styling

      li.appendChild(placeNameSpan);
      li.appendChild(voteCountSpan);


      // Add 'voted' class if this is the place the user voted for
      if (placeId === userVoteId) {
        li.classList.add('voted');
      }

      // Add click listener to handle voting
      li.addEventListener('click', () => handleVote(placeId));

      placesList.appendChild(li); // Add the list item to the unordered list
    });

    updateLeadingPlace(places); // Update the leading place display
  } else {
    // If there are no places, hide the delete button and clear the leading display
    deletePollButton.style.display = 'none';
    leadingPlaceDisplay.textContent = 'Add a lunch place to start the poll!';
  }
}

/**
 * Handles the deletion of the entire poll.
 */
function handleDeletePoll() {
  // Confirmation dialog before deleting
  if (confirm("Are you sure you want to delete the entire poll? This cannot be undone.")) {
    remove(placesRef) // Remove the entire 'places' node from Firebase
      .then(() => {
        localStorage.removeItem(USER_VOTE_KEY); // Clear the user's vote from local storage
        console.log("Poll deleted successfully.");
        // UI will be cleared automatically by the onValue listener detecting empty data
      })
      .catch((error) => {
        console.error("Error deleting poll: ", error);
        // Consider showing an error message to the user
      });
  }
}

// --- Event Listeners ---

// Listen for form submission to add a new place
placeForm.addEventListener('submit', handleAddPlace);

// Listen for clicks on the delete poll button
deletePollButton.addEventListener('click', handleDeletePoll);

// Listen for real-time changes in the 'places' node in Firebase
onValue(placesRef, (snapshot) => {
  const placesData = snapshot.val(); // Get the data from the snapshot
  renderPlaces(placesData); // Re-render the list whenever data changes
}, (error) => {
   console.error("Error fetching data: ", error);
   // Handle potential errors, e.g., display an error message on the page
   placesList.innerHTML = '<li>Error loading data. Please check console.</li>';
   leadingPlaceDisplay.textContent = 'Error loading data.';
   deletePollButton.style.display = 'none'; // Hide delete button on error
});