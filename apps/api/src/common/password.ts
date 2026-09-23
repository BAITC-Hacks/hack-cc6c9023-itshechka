// bcryptjs 2.x does not ship TypeScript declarations. Keep the untyped
// boundary in one small adapter so the rest of the application stays strict.
const bcrypt: {
  hash(value: string, rounds: number): Promise<string>;
  compare(value: string, digest: string): Promise<boolean>;
} = require("bcryptjs");

export const hashPassword = (value: string) => bcrypt.hash(value, 12);
export const verifyPassword = (value: string, digest: string) => bcrypt.compare(value, digest);
