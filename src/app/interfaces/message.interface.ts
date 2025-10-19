

export interface Message {
  text: string;
  isGpt: boolean;
  audioUrl?: string;  // 👈 AGREGADO PARA TEXTO A AUDIO
  info?: {
    userScore: number;
    errors: string[];
    message: string;
  }
}