export function getAuthToken() {
  return localStorage.getItem("token") || "";
}

export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem("token");
  } else {
    localStorage.setItem("token", token);
  }
}
