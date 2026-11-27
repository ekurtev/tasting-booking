export function migrate(opts: {
  databaseUrl: string;
  seed?: boolean;
  log?: (msg: string) => void;
  admin?: { email?: string; password?: string; resetPassword?: boolean };
}): Promise<void>;
