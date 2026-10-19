// Word bank for Typing Dojo.
// Source: dwyl/english-words (Unlicense), filtered to unique lowercase a-z words
// between 3 and 10 letters. The split modules keep individual GitHub files manageable.
import { WORDS_1 } from './word-bank-1.js';
import { WORDS_2 } from './word-bank-2.js';
import { WORDS_3 } from './word-bank-3.js';
import { WORDS_4 } from './word-bank-4.js';
import { WORDS_5 } from './word-bank-5.js';

export const WORDS = Object.freeze([
  ...WORDS_1, ...WORDS_2, ...WORDS_3, ...WORDS_4, ...WORDS_5,
]);
export const WORD_COUNT = WORDS.length;
