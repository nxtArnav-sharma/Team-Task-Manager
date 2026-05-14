// No specific helpers requested yet, but creating the file as per structure.
// Can be used for common formatting or logic.

const formatUserResponse = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

module.exports = {
  formatUserResponse
};
