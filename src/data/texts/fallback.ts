import type { Passage } from '../../types'

// Hand-written passages. These guarantee every (language × genre) bucket has
// content even if generated data is missing — notably English nonfiction.
export const FALLBACK_PASSAGES: Passage[] = [
  {
    id: 'en-nonfiction-keyboard-friction',
    language: 'en',
    genre: 'nonfiction',
    title: 'On Typing Well',
    author: 'TypeGenius',
    difficulty: 'easy',
    text: 'A keyboard turns thought into text. The faster and more accurately you type, the less friction sits between your ideas and the screen. Like any skill, typing rewards deliberate practice: slow down to fix mistakes first, and let speed return on its own.',
  },
  {
    id: 'en-nonfiction-qwerty-history',
    language: 'en',
    genre: 'nonfiction',
    title: 'Why QWERTY?',
    author: 'TypeGenius',
    difficulty: 'medium',
    text: 'The familiar QWERTY layout was designed in the 1870s for early mechanical typewriters. Common letter pairs were spread apart so that the metal type bars were less likely to jam when struck in quick succession. The arrangement stuck, and more than a century later our fingers still trace the same paths across glass and plastic alike.',
  },
  {
    id: 'en-nonfiction-muscle-memory',
    language: 'en',
    genre: 'nonfiction',
    title: 'Muscle Memory',
    author: 'TypeGenius',
    difficulty: 'medium',
    text: 'Touch typing works because the brain offloads practiced movements to automatic circuits. At first every key is a conscious decision, slow and effortful. With repetition the motion sinks below awareness, and the hand simply knows where to go. The goal of practice is not to think faster, but to stop having to think at all.',
  },
  {
    id: 'en-nonfiction-deliberate-practice',
    language: 'en',
    genre: 'nonfiction',
    title: 'Deliberate Practice',
    author: 'TypeGenius',
    difficulty: 'hard',
    text: 'Researchers who study expertise draw a sharp line between mere repetition and deliberate practice. Simply doing a task many times tends to lock in whatever you already do, mistakes and all. Deliberate practice is different: it targets the edge of your ability, demands full attention, and feeds on immediate feedback about what went wrong. Progress comes not from comfortable rounds you already know how to win, but from the uncomfortable ones that force you to reach a little further than before.',
  },
  {
    id: 'en-nonfiction-reading-writing',
    language: 'en',
    genre: 'nonfiction',
    title: 'The Written Word',
    author: 'TypeGenius',
    difficulty: 'hard',
    text: 'Writing is one of humanity\'s strangest and most powerful inventions. It lets a single mind reach across centuries and continents, preserving thought far beyond the lifespan of the person who first had it. Every essay, letter, and line of code you type joins that long conversation. The keyboard is merely the latest tool for an old and astonishing act: turning the fleeting electricity of an idea into something that can be read, shared, and remembered.',
  },
  {
    id: 'en-nonfiction-small-gains',
    language: 'en',
    genre: 'nonfiction',
    title: 'Small Gains',
    author: 'TypeGenius',
    difficulty: 'easy',
    text: 'You do not get faster all at once. You get faster a few words at a time, on days that feel ordinary. Trust the slow accumulation of small gains, and one day the speed that once felt impossible will feel like nothing at all.',
  },
]
