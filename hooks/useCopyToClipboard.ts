'use client';

import { useState } from 'react';
import { copyText } from '@/lib/copy-to-clipboard';

// How long the "copied" confirmation stays up.
const COPIED_MS = 1500;

/** Copies text and flips `copied` on briefly so the button can confirm it. */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  }

  return { copied, setCopied, copy };
}
