// In-memory user store
const users = new Map();

export function getUserByEmail(email) {
  return users.get(email);
}

export function createUser(email, hashedPassword, uid) {
  const user = { email, hashedPassword, uid };
  users.set(email, user);
  return user;
}

export function userExists(email) {
  return users.has(email);
}