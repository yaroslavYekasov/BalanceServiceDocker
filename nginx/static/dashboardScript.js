document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("id");
    const baseUrl = "http://balance.denisenko.loc";

    if (!userId) {
        document.body.innerHTML = "<h1>User ID not provided in the URL.</h1>";
        return;
    }

    fetch(`${baseUrl}/users/${userId}`)
    .then(response => response.json())
    .then(user => {
        document.getElementById("username").textContent = user.username;
        document.getElementById("email").textContent = user.email;
        document.getElementById("balance").textContent = `${user.balance} ${user.currency}`;
        return fetch(`${baseUrl}/users/${userId}/transactions`);
    })
    .then(response => response.json())
    .then(transactions => {
        const transactionsList = document.getElementById("transactions");
        transactionsList.innerHTML = "";

        transactions.forEach(transaction => {
            if (transaction.type === "Transfer In" && transaction.recipient_id !== parseInt(userId)) {
                // Skip `Transfer In` transactions unless they are to the current user
                return;
            }

            const li = document.createElement("li");
            li.className = "transaction-item";

            let transactionDetails = `
                <div><strong>Type:</strong> ${transaction.type}</div>
                <div><strong>Date:</strong> ${new Date(transaction.date).toLocaleString()}</div>
            `;

            if (transaction.type === "Transfer Out" || transaction.type === "Transfer In") {
                const relatedUserId = transaction.type === "Transfer Out" ? transaction.recipient_id : transaction.sender_id;

                fetch(`${baseUrl}/users/${relatedUserId}`)
                    .then(response => response.json())
                    .then(relatedUser => {
                        transactionDetails += `
                            <div><strong>${transaction.type === "Transfer Out" ? "To:" : "From:"}</strong> ${relatedUser.username} (#${relatedUser.id})</div>
                            <div><strong>Amount:</strong> ${transaction.amount < 0 ? "" : "+"}${transaction.amount}</div>
                        `;
                        li.innerHTML = transactionDetails;
                        transactionsList.appendChild(li);
                    })
                    .catch(() => {
                        transactionDetails += `
                            <div><strong>${transaction.type === "Transfer Out" ? "To:" : "From:"}</strong> Unknown (#${relatedUserId})</div>
                            <div><strong>Amount:</strong> ${transaction.amount < 0 ? "" : "+"}${transaction.amount}</div>
                        `;
                        li.innerHTML = transactionDetails;
                        transactionsList.appendChild(li);
                    });
            } else {
                transactionDetails += `<div><strong>Amount:</strong> ${transaction.amount < 0 ? "" : "+"}${transaction.amount}</div>`;
                li.innerHTML = transactionDetails;
                transactionsList.appendChild(li);
            }
        });
    })
    .catch(error => {
        console.error("Error fetching data:", error);
        document.body.innerHTML = `<h1>${error.message}</h1>`;
    });

    document.getElementById("transferForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const recipientId = document.getElementById("recipientId").value;
        const amount = parseFloat(document.getElementById("amount").value);

        fetch(`${baseUrl}/users/${userId}/transfer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ recipientId, amount }),
        })
            .then(response => {
                if (!response.ok) throw new Error("Transfer failed");
                return response.json();
            })
            .then(data => {
                document.getElementById("transferMessage").innerHTML = "<strong style='color: green;'>Transfer Successful!</strong>";
                setTimeout(() => location.reload(), 1000);
            })
            .catch(error => {
                console.error("Error transferring money:", error);
                document.getElementById("transferMessage").innerHTML = "<strong style='color: red;'>Transfer Failed. Please try again.</strong>";
            });
    });
});
