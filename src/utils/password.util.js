// src/utils/password.util.js
const bcrypt = require('bcrypt');

module.exports = {
  hashPassword: async (plain) => {
    // Function name: hashPassword
    const saltRounds = 10;
    return bcrypt.hash(plain, saltRounds);
  },

  comparePassword: async (plain, hash) => {
    // Function name: comparePassword
    return bcrypt.compare(plain, hash);
  }
};
