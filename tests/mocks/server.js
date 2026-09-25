import { setupServer } from 'msw/node';
import { npointHandlers } from './handlers.js';

export const server = setupServer(...npointHandlers);
