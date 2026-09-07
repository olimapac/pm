export const DEMO_USERNAME = "user";
export const DEMO_PASSWORD = "password";

export const checkCredentials = (username: string, password: string) =>
  username === DEMO_USERNAME && password === DEMO_PASSWORD;
