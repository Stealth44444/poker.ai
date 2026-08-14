export type PersonaStyle = 'aggressive' | 'tight' | 'loose' | 'bluffer';

export interface Persona {
  id: string;
  name: string;
  style: PersonaStyle;
  description: string;
}

export const PERSONAS: Persona[] = [
  { id: 'ai1', name: 'Ace', style: 'aggressive', description: 'Bets and raises more often than most to pressure opponents, but backs off to a call or fold once a hand clearly is not worth the escalating cost.' },
  { id: 'ai2', name: 'Rocky', style: 'tight', description: 'Only plays strong hands. Folds quickly when unsure.' },
  { id: 'ai3', name: 'Marina', style: 'loose', description: 'Plays a wide range of hands and stays in pots to see more cards.' },
  { id: 'ai4', name: 'Duke', style: 'bluffer', description: 'Occasionally bets with a weak hand to represent strength, but picks spots carefully rather than turning a bluff into a costly all-in.' },
  { id: 'ai5', name: 'Sable', style: 'aggressive', description: 'Applies pressure with bigger bets when holding a genuine edge, especially in position, but does not chase a raising war without the hand to back it up.' },
  { id: 'ai6', name: 'Willow', style: 'tight', description: 'Patient and conservative, waits for premium hands before committing chips.' },
  { id: 'ai7', name: 'Diesel', style: 'loose', description: 'Enjoys action and calls down with a wide range of hands.' },
  { id: 'ai8', name: 'Nova', style: 'bluffer', description: 'Mixes in occasional, well-timed bluffs to keep opponents guessing, without letting a bluff escalate into a costly all-in.' },
  { id: 'ai9', name: 'Reed', style: 'aggressive', description: 'Raises to build big pots when holding decent cards, but reads resistance and stops reraising a hand that is not strong enough to justify it.' },
];
