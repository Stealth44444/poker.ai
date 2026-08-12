export type PersonaStyle = 'aggressive' | 'tight' | 'loose' | 'bluffer';

export interface Persona {
  id: string;
  name: string;
  style: PersonaStyle;
  description: string;
}

export const PERSONAS: Persona[] = [
  { id: 'ai1', name: 'Ace', style: 'aggressive', description: 'Bets and raises often to pressure opponents. Rarely just calls.' },
  { id: 'ai2', name: 'Rocky', style: 'tight', description: 'Only plays strong hands. Folds quickly when unsure.' },
  { id: 'ai3', name: 'Marina', style: 'loose', description: 'Plays a wide range of hands and stays in pots to see more cards.' },
  { id: 'ai4', name: 'Duke', style: 'bluffer', description: 'Frequently bets with weak hands to represent strength.' },
  { id: 'ai5', name: 'Sable', style: 'aggressive', description: 'Applies constant pressure with big bets, especially in position.' },
  { id: 'ai6', name: 'Willow', style: 'tight', description: 'Patient and conservative, waits for premium hands before committing chips.' },
  { id: 'ai7', name: 'Diesel', style: 'loose', description: 'Enjoys action and calls down with a wide range of hands.' },
  { id: 'ai8', name: 'Nova', style: 'bluffer', description: 'Mixes in well-timed bluffs to keep opponents guessing.' },
  { id: 'ai9', name: 'Reed', style: 'aggressive', description: 'Raises frequently to build big pots when holding decent cards.' },
];
