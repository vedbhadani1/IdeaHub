import { cleanEnv, str, port } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const config = cleanEnv(process.env, {
  DATABASE_URL: str({ desc: 'PostgreSQL connection string' }),
  JWT_SECRET: str({ desc: 'Secret key for signing JWTs' }),
  PORT: port({ default: 4000, desc: 'API port' }),
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  REDIS_URL: str({ default: 'redis://localhost:6379' }),
});
