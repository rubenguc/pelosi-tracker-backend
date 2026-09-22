declare module "*.pdf" {
  const content: ArrayBuffer;
  export default content;
}


import type { D1Database, Queue } from '@cloudflare/workers-types';

declare global {
  type Env = {
    DB: D1Database;
    PDF_QUEUE: Queue;
  };
}

export {};
