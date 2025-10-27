import { environment } from 'environments/environment';
import type { TranslateResponse } from '@interfaces/translate.response';

export const translateTextUseCase = async (prompt: string, lang: string ) => {

  try {
    const resp = await fetch(`${environment.backendApi}/gpt/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, lang }),
    });

    if (!resp.ok) throw new Error('No se pudo realizar la traducción.');

    const { message } = await resp.json() as TranslateResponse;

    return {
      ok: true,
      message: message,
    };

  } catch (error) {
    console.log(error);
    return {
      ok: false,
      message: 'No se pudo realizar la traducción.',
    };
  }
};