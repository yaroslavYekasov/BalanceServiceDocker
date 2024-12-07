const baseUrl = "http://balance.denisenko.loc";

let editMode = false;
let editUserId = null;

function fetchUsers() {
    fetch(`${baseUrl}/users`)
        .then(response => response.json())
        .then(users => {
            const tableBody = document.querySelector("#usersTable tbody");
            tableBody.innerHTML = "";
            users.forEach(user => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.balance}</td>
                    <td>${user.currency}</td>
                    <td>
                        <button class="edit-btn" title="Edit User" onclick="editUser(${user.id}, '${user.username}', '${user.email}', ${user.balance}, '${user.currency}')">✏️</button>
                        <button class="delete-btn" title="Delete User" onclick="deleteUser(${user.id})">🗑️</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        });
}

document.getElementById("userForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const balance = parseFloat(document.getElementById("balance").value);
    const currency = document.getElementById("currency").value;

    if (editMode) {
        fetch(`${baseUrl}/users/${editUserId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, balance, currency })
        })
            .then(() => {
                resetForm();
                fetchUsers();
            });
    } else {
        fetch(`${baseUrl}/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, balance, currency })
        })
            .then(() => {
                resetForm();
                fetchUsers();
            });
    }
});

function deleteUser(userId) {
    fetch(`${baseUrl}/users/${userId}`, { method: "DELETE" })
        .then(() => fetchUsers());
}

function editUser(id, username, email, balance, currency) {
    editMode = true;
    editUserId = id;

    document.getElementById("formHeader").textContent = "Edit User";
    document.getElementById("username").value = username;
    document.getElementById("email").value = email;
    document.getElementById("balance").value = balance;
    document.getElementById("currency").value = currency;

    document.querySelector(".action-btn").textContent = "Update User";
    document.getElementById("cancelEdit").style.display = "inline-block";
}

document.getElementById("cancelEdit").addEventListener("click", resetForm);

function resetForm() {
    editMode = false;
    editUserId = null;

    document.getElementById("formHeader").textContent = "Add User";
    document.getElementById("userForm").reset();

    document.querySelector(".action-btn").textContent = "Add User";
    document.getElementById("cancelEdit").style.display = "none";
}

fetchUsers();
