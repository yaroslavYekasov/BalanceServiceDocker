const express = require('express');
const app = express();
const PORT = 3000;
app.use(express.json());

const mysql = require('mysql2');

const db = mysql.createPool({
    connectionLimit: 10,
    queueLimit: 0,
    host: "composite-mysql",
    user: 'express_user',
    password: '1234',
    database: 'express_db'
});
/*
db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});
*/
const rates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78
};


function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) 
    return amount;
  const rate = rates[toCurrency] / rates[fromCurrency];
  return parseFloat((amount * rate).toFixed(2));
}

// Helper to check user existence
const isUserExisting = (id, callback) => {
  db.query('SELECT COUNT(*) AS count FROM users WHERE id = ?', [id], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results[0].count > 0);
  });
};

// Fetch all users
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      res.json(results);
  });
});

// Fetch a user by ID
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      if (results.length === 0) {
          res.status(404).json({ error: 'User not found' });
      } else {
          res.json(results[0]);
      }
  });
});

// Fetch user balance
app.get('/users/:id/balance', (req, res) => {
  const id = parseInt(req.params.id);
  db.query('SELECT balance, currency FROM users WHERE id = ?', [id], (err, results) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      if (results.length === 0) {
          res.status(404).json({ error: 'User not found' });
      } else {
          const { balance, currency } = results[0];
          res.json(`${balance} ${currency}`);
      }
  });
});

app.post('/users', (req, res) => {
  const { username, email, balance, currency } = req.body;
  if (!username || !email || isNaN(balance) || !currency) {
      return res.status(400).json({ error: 'All fields are required' });
  }
  db.query('INSERT INTO users SET ?', { username, email, balance, currency }, (err, result) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      res.status(201).json({ message: 'User created successfully', id: result.insertId });
  });
});

// Deposit money
app.post('/users/:id/deposit', (req, res) => {
  const id = parseInt(req.params.id);
  const { amount } = req.body;
  if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
  }
  db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, id], (err, result) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      if (result.affectedRows === 0) {
          res.status(404).json({ error: 'User not found' });
      } else {
          db.query('INSERT INTO transactions SET ?', { user_id: id, type: 'Deposit', amount }, (err) => {
              if (err) {
                  res.status(500).json({ error: 'Transaction error' });
                  return;
              }
              res.json({ message: 'Deposit successful', amount });
          });
      }
  });
});

// Withdraw money
app.post('/users/:id/withdraw', (req, res) => {
  const id = parseInt(req.params.id);
  const { amount } = req.body;
  if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
  }
  db.query('SELECT balance FROM users WHERE id = ?', [id], (err, results) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      if (results.length === 0) {
          res.status(404).json({ error: 'User not found' });
      } else if (results[0].balance < amount) {
          res.status(400).json({ error: 'Insufficient balance' });
      } else {
          db.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, id], (err) => {
              if (err) {
                  res.status(500).json({ error: 'Database error' });
                  return;
              }
              db.query('INSERT INTO transactions SET ?', { user_id: id, type: 'Withdraw', amount }, (err) => {
                  if (err) {
                      res.status(500).json({ error: 'Transaction error' });
                      return;
                  }
                  res.json({ message: 'Withdrawal successful', amount });
              });
          });
      }
  });
});

app.get('/users/:id/transactions', (req, res) => {
  const userId = parseInt(req.params.id);
  db.query(
      `SELECT t.*, 
          (SELECT username FROM users WHERE id = t.sender_id) AS sender_name,
          (SELECT username FROM users WHERE id = t.recipient_id) AS recipient_name
      FROM transactions t 
      WHERE t.sender_id = ? OR t.recipient_id = ?`,
      [userId, userId],
      (err, results) => {
          if (err) {
              console.error('Database error:', err);
              res.status(500).json({ error: 'Database error' });
              return;
          }
          res.json(results);
      }
  );
});

app.post('/users/:id/transfer', (req, res) => {
  const senderId = parseInt(req.params.id);
  const { recipientId, amount } = req.body;

  if (!recipientId || !amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid recipient ID or amount' });
  }

  db.query('SELECT balance, currency FROM users WHERE id = ?', [senderId], (err, senderResults) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }

      if (senderResults.length === 0) {
          res.status(404).json({ error: 'Sender not found' });
          return;
      }

      if (senderResults[0].balance < amount) {
          res.status(400).json({ error: 'Insufficient balance' });
          return;
      }

      const senderCurrency = senderResults[0].currency;

      db.query('SELECT currency FROM users WHERE id = ?', [recipientId], (err, recipientResults) => {
          if (err) {
              res.status(500).json({ error: 'Database error' });
              return;
          }

          if (recipientResults.length === 0) {
              res.status(404).json({ error: 'Recipient not found' });
              return;
          }

          const recipientCurrency = recipientResults[0].currency;
          const convertedAmount = convertCurrency(amount, senderCurrency, recipientCurrency);

          db.beginTransaction(err => {
              if (err) throw err;

              // Deduct from sender
              db.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, senderId], err => {
                  if (err) {
                      return db.rollback(() => {
                          res.status(500).json({ error: 'Transaction failed' });
                      });
                  }

                  // Add to recipient
                  db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [convertedAmount, recipientId], err => {
                      if (err) {
                          return db.rollback(() => {
                              res.status(500).json({ error: 'Transaction failed' });
                          });
                      }

                      const transactionDate = new Date();

                      // Log transfer out
                      db.query(
                          'INSERT INTO transactions SET ?',
                          {
                              sender_id: senderId,
                              recipient_id: recipientId,
                              type: 'Transfer Out',
                              amount: -amount,
                              date: transactionDate
                          },
                          err => {
                              if (err) {
                                  return db.rollback(() => {
                                      res.status(500).json({ error: 'Transaction logging failed' });
                                  });
                              }

                              // Log transfer in
                              db.query(
                                  'INSERT INTO transactions SET ?',
                                  {
                                      sender_id: senderId,
                                      recipient_id: recipientId,
                                      type: 'Transfer In',
                                      amount: convertedAmount,
                                      date: transactionDate
                                  },
                                  err => {
                                      if (err) {
                                          return db.rollback(() => {
                                              res.status(500).json({ error: 'Transaction logging failed' });
                                          });
                                      }

                                      db.commit(err => {
                                          if (err) {
                                              return db.rollback(() => {
                                                  res.status(500).json({ error: 'Transaction commit failed' });
                                              });
                                          }
                                          res.json({ message: 'Transfer successful' });
                                      });
                                  }
                              );
                          }
                      );
                  });
              });
          });
      });
  });
});

// Update user
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { username, email, balance, currency } = req.body;
  const updates = { username, email, balance, currency };
  db.query('UPDATE users SET ? WHERE id = ?', [updates, id], (err, result) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      if (result.affectedRows === 0) {
          res.status(404).json({ error: 'User not found' });
      } else {
          res.json({ message: 'User updated successfully' });
      }
  });
});

// Delete user
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
      if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
      }
      if (result.affectedRows === 0) {
          res.status(404).json({ error: 'User not found' });
      } else {
          res.status(204).send();
      }
  });
});

app.listen(PORT, () => {
  console.log(`Microservice is running`);
});
