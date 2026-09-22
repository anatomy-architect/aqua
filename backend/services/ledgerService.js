const db = require('../db/database');

const ledgerService = {
  /**
   * Safe financial balance transaction with invariant checks
   */
  recordTransaction: (userId, type, amount, direction, referenceType = null, referenceId = null, note = '', earningDay = null) => {
    const user = db.prepare('SELECT id, balance, lockedBalance FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new Error(`Invalid transaction amount: ${amount}`);
    }

    let newBalance = user.balance;

    if (direction === 'debit') {
      if (user.balance < numAmount) {
        throw new Error(`Insufficient available balance for debit. Current: $${user.balance}, Required: $${numAmount}`);
      }
      newBalance = Math.round((user.balance - numAmount) * 100) / 100;
    } else if (direction === 'credit') {
      newBalance = Math.round((user.balance + numAmount) * 100) / 100;
    } else {
      throw new Error(`Invalid transaction direction: ${direction}`);
    }

    // Invariant check: Balance never negative
    if (newBalance < 0) {
      throw new Error('Financial Invariant Violation: Balance cannot be negative');
    }

    // Update user balance
    db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, userId);

    // Record ledger entry
    const res = db.prepare(`
      INSERT INTO balance_transactions (userId, type, amount, direction, referenceType, referenceId, balanceAfter, earningDay, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, numAmount, direction, referenceType, referenceId, newBalance, earningDay, note);

    return {
      transactionId: res.lastInsertRowid,
      userId,
      type,
      amount: numAmount,
      direction,
      balanceAfter: newBalance,
      referenceType,
      referenceId,
      earningDay,
      note
    };
  },

  /**
   * Hold balance for pending withdrawal
   */
  holdWithdrawalBalance: (userId, withdrawalId, amount) => {
    const user = db.prepare('SELECT id, balance, lockedBalance FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');

    const numAmount = Number(amount);
    if (user.balance < numAmount) {
      throw new Error(`Insufficient available balance ($${user.balance}) for withdrawal of $${numAmount}`);
    }

    const newBalance = Math.round((user.balance - numAmount) * 100) / 100;
    const newLocked = Math.round((user.lockedBalance + numAmount) * 100) / 100;

    db.prepare('UPDATE users SET balance = ?, lockedBalance = ? WHERE id = ?').run(newBalance, newLocked, userId);

    db.prepare(`
      INSERT INTO balance_transactions (userId, type, amount, direction, referenceType, referenceId, balanceAfter, note)
      VALUES (?, 'withdrawal_hold', ?, 'debit', 'withdrawal', ?, ?, 'Funds placed on hold for BEP20 withdrawal review')
    `).run(userId, numAmount, withdrawalId, newBalance);

    return { newBalance, newLocked };
  },

  /**
   * Release hold upon withdrawal rejection
   */
  releaseWithdrawalHold: (userId, withdrawalId, amount, reason = '') => {
    const user = db.prepare('SELECT id, balance, lockedBalance FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');

    const numAmount = Number(amount);
    const newLocked = Math.max(0, Math.round((user.lockedBalance - numAmount) * 100) / 100);
    const newBalance = Math.round((user.balance + numAmount) * 100) / 100;

    db.prepare('UPDATE users SET balance = ?, lockedBalance = ? WHERE id = ?').run(newBalance, newLocked, userId);

    db.prepare(`
      INSERT INTO balance_transactions (userId, type, amount, direction, referenceType, referenceId, balanceAfter, note)
      VALUES (?, 'withdrawal_release', ?, 'credit', 'withdrawal', ?, ?, ?)
    `).run(userId, numAmount, withdrawalId, newBalance, `Hold released - Withdrawal rejected: ${reason}`);

    return { newBalance, newLocked };
  },

  /**
   * Complete withdrawal after on-chain transfer
   */
  completeWithdrawal: (userId, withdrawalId, amount, feeAmount = 0) => {
    const user = db.prepare('SELECT id, totalWithdrawn, lockedBalance FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('User not found');

    const numAmount = Number(amount);
    const newLocked = Math.max(0, Math.round((user.lockedBalance - numAmount) * 100) / 100);
    const newTotalWithdrawn = Math.round(((user.totalWithdrawn || 0) + numAmount) * 100) / 100;

    db.prepare('UPDATE users SET lockedBalance = ?, totalWithdrawn = ? WHERE id = ?').run(newLocked, newTotalWithdrawn, userId);

    if (feeAmount > 0) {
      db.prepare(`
        INSERT INTO balance_transactions (userId, type, amount, direction, referenceType, referenceId, balanceAfter, note)
        VALUES (?, 'withdrawal_fee', ?, 'debit', 'withdrawal', ?, (SELECT balance FROM users WHERE id = ?), 'BEP20 Network & Processing Fee')
      `).run(userId, Number(feeAmount), withdrawalId, userId);
    }

    return { newLocked, newTotalWithdrawn };
  },

  /**
   * Get all transactions for a user
   */
  getUserLedger: (userId, limit = 100) => {
    return db.prepare(`
      SELECT * FROM balance_transactions 
      WHERE userId = ? 
      ORDER BY id DESC 
      LIMIT ?
    `).all(userId, limit);
  }
};

module.exports = ledgerService;
