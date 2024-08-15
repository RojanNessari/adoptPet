document.addEventListener("DOMContentLoaded", function() {
  // Function to update date and time
  function updateDateTime() {
    const dateElement = document.getElementById("time");
    const now = new Date();
    const formattedDate = now.toLocaleString();
    dateElement.textContent = formattedDate;
  }

  // Update date and time immediately and every second
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Toggle heart icon


  // Function to update breed options based on selected pet type
  function updateBreedOptions(petType, breedSelect) {
    const dogBreeds = [
      { value: "labrador", text: "Labrador" },
      { value: "poodle", text: "Poodle" },
      { value: "goldenRetriever", text: "Golden Retriever" },
      { value: "bulldog", text: "Bulldog" }
    ];

    const catBreeds = [
      { value: "siamese", text: "Siamese" },
      { value: "persian", text: "Persian" },
      { value: "maineCoon", text: "Maine Coon" },
      { value: "ragdoll", text: "Ragdoll" }
    ];

    // Clear current breed options
    breedSelect.innerHTML = '<option value="noMatter">Doesn\'t matter</option>';

    // Populate breed options based on selected pet type
    let selectedBreeds = [];
    if (petType === "dog") {
      selectedBreeds = dogBreeds;
    } else if (petType === "cat") {
      selectedBreeds = catBreeds;
    }

    selectedBreeds.forEach(function(breed) {
      const option = document.createElement("option");
      option.value = breed.value;
      option.text = breed.text;
      breedSelect.appendChild(option);
    });
  }

  // Attach event listeners to update breed options when pet type changes
  const petTypeRadioButtons = document.querySelectorAll('input[name="petType"]');
  petTypeRadioButtons.forEach(radio => {
    radio.addEventListener("change", function() {
      const breedSelect = document.getElementById("breed");
      updateBreedOptions(this.value, breedSelect);
    });
  });

  // Handle the form submission for the give away form
  const giveAwayForm = document.getElementById('giveAwayForm');
  if (giveAwayForm) {
    giveAwayForm.addEventListener('submit', function(event) {
      event.preventDefault(); // Prevent default form submission

      // Collect form data
      const formData = new FormData(giveAwayForm);

      // Send data via fetch
      fetch('/giveAway', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData.entries())),
        headers: {
          'Content-Type': 'application/json'
        }
      })
          .then(response => response.json())
          .then(data => {
            if (data.error) {
              alert(data.error);
            } else {
              alert(data.message);
              giveAwayForm.reset(); // Reset the form on success
            }
          })
          .catch(error => {
            console.error('Error:', error);
            alert('There was an error registering your pet. Please try again.');
          });
    });
  }
});
