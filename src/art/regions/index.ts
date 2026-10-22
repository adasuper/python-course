// Every region's art, in region order. The art index adds it to the shared sheets.
import { art as r2 } from './r2';
import { art as r3 } from './r3';
import { art as r4 } from './r4';
import { art as r5 } from './r5';
import { art as r6 } from './r6';
import type { RegionArt } from './types';

export type { RegionArt } from './types';

export const REGION_ART: RegionArt[] = [r2, r3, r4, r5, r6];
