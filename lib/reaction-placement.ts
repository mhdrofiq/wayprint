/**
 * Computes the position for a new reaction sticker on a polaroid card.
 *
 * Positions are in card-relative coordinates where [0, 0] is the top-left
 * corner and [1, 1] is the bottom-right. Values slightly outside [0, 1] are
 * intentional — they let the sticker overhang the card edge slightly.
 *
 * Strategy:
 *   - Sample 40 candidate positions distributed along the four edges of the
 *     image area (inside the polaroid white frame).
 *   - Each candidate is jittered: inward up to 12% of card size, outward up
 *     to 7% (creating the overhang). The emoji center never moves more than
 *     ~0.07 outside the card, so it is always at least partially visible.
 *   - Pick the candidate whose minimum distance to all existing reactions is
 *     the greatest, spreading stickers naturally around the image.
 */

export interface ReactionPosition {
  pos_x: number;
  pos_y: number;
  rotation: number;
}

interface ExistingPos {
  pos_x: number;
  pos_y: number;
}

// Polaroid image area in card-relative coordinates.
// Card is size×size with padding: 6px top/right/left, 20px bottom.
// Assuming card size = 220px (the fixed thumb size).
const IMG_L = 6 / 220;   // ≈ 0.027
const IMG_T = 6 / 220;   // ≈ 0.027
const IMG_R = 214 / 220; // ≈ 0.973
const IMG_B = 200 / 220; // ≈ 0.909

const INWARD_MAX  = 0.12; // up to 12% inward from the image edge
const OUTWARD_MAX = 0.07; // up to 7% outward (overhang off the card edge)

function rand() {
  return Math.random();
}

function clampedRand(min: number, max: number) {
  return min + rand() * (max - min);
}

/** Small random rotation, ±15 degrees, biased away from zero. */
function randomRotation(): number {
  const mag = 8 + rand() * 7; // 8–15 degrees
  return rand() < 0.5 ? -mag : mag;
}

/** Generate candidate positions along/near the perimeter of the image area. */
function generateCandidates(count: number): Array<{ px: number; py: number }> {
  const candidates: Array<{ px: number; py: number }> = [];
  const perEdge = Math.ceil(count / 4);

  // For each edge, sample perEdge candidates with jitter.
  // Jitter is perpendicular to the edge:
  //   positive = inward (toward card centre)
  //   negative = outward (overhang off card)
  // The "along" value is randomised across the full edge length.

  for (let i = 0; i < perEdge; i++) {
    const along = rand(); // 0..1 along this edge
    const jitter = clampedRand(-OUTWARD_MAX, INWARD_MAX);

    // Top edge  — y near IMG_T, inward means y increases
    candidates.push({ px: IMG_L + along * (IMG_R - IMG_L), py: IMG_T - jitter });

    // Bottom edge — y near IMG_B, inward means y decreases
    candidates.push({ px: IMG_L + along * (IMG_R - IMG_L), py: IMG_B + jitter });

    // Left edge  — x near IMG_L, inward means x increases
    candidates.push({ px: IMG_L - jitter, py: IMG_T + along * (IMG_B - IMG_T) });

    // Right edge — x near IMG_R, inward means x decreases
    candidates.push({ px: IMG_R + jitter, py: IMG_T + along * (IMG_B - IMG_T) });
  }

  return candidates;
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

export function computeReactionPosition(existing: ExistingPos[]): ReactionPosition {
  const candidates = generateCandidates(10); // 10 per edge = 40 total

  let best = candidates[0];
  let bestScore = -Infinity;

  for (const c of candidates) {
    let score: number;

    if (existing.length === 0) {
      // No existing reactions — pick randomly by assigning random score
      score = rand();
    } else {
      // Farthest-point: maximise minimum distance to all existing reactions
      score = Math.min(...existing.map((e) => distSq(c.px, c.py, e.pos_x, e.pos_y)));
    }

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return {
    pos_x: best.px,
    pos_y: best.py,
    rotation: randomRotation(),
  };
}
