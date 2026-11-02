import { randomUUID } from 'crypto';

// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';

global.crypto = global.crypto ?? {};
global.crypto.randomUUID = global.crypto.randomUUID ?? randomUUID;
