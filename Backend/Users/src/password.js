const bcrypt = require("bcrypt");

module.exports.hashPassword = async (password) => {
  try {
    /*SALTING AND HASHING*/

    //generate a salt
    const salt = await bcrypt.genSalt(10);

    //generate a password hash(salt+hash)
    const passwordHash = await bcrypt.hash(password, salt);

    //reassign hashed version over original plain text password
    return passwordHash;
  } catch (error) {
    return error;
  }
};

module.exports.matchPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch(err) {
    throw new Error(err);
  }
};