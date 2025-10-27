

export interface Message {
  id?: string;
  text: string;
  isGpt: boolean;
  audioUrl?: string; 
  emojis?: string; // 👈 NUEVO
  decorativeText?: string; // 👈 AGREGADO PARA TEXTO A AUDIO
  info?: {
    userScore: number;
    errors: string[];
    message: string;
  }
}