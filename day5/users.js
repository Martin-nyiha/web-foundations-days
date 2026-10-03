const loadBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusText = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const API_URL = "https://jsonplaceholder.typicode.com/users";
let users = [];

function renderUsers(list) {
  usersList.textContent = "";

  for (const user of list) {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    li.append(name, email, city, company);
    usersList.append(li);
  }
}

async function loadUsers() {
  statusText.textContent = "Loading users...";
  loadBtn.disabled = true;
  usersList.textContent = "";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    users = await response.json();
    filterInput.value = "";
    renderUsers(users);
    statusText.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    users = [];
    statusText.textContent = `Could not load users: ${error.message}`;
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  if (users.length === 0) {
    return;
  }

  const term = filterInput.value.trim().toLowerCase();
  const filtered = users.filter((user) =>
    user.name.toLowerCase().includes(term)
  );

  renderUsers(filtered);

  if (filtered.length === 0) {
    statusText.textContent = "No users match your filter.";
  } else {
    statusText.textContent = `Showing ${filtered.length} of ${users.length} users.`;
  }
});