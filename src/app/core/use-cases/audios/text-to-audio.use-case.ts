import { environment } from 'environments/environment';

export const textToAudioUseCase = async ( prompt:string, voice: string ) => {

  try {

    const resp = await fetch(`${ environment.backendApi }/gpt/text-to-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, voice })
    });

    if ( !resp.ok ) throw new Error('No se pudo generar el audio');

    const data = await resp.json();

    return {
      ok: true,
      message: data.decorativeText || prompt,
      audioUrl: data.audioUrl, // 👈 YA VIENE COMPLETA DEL BACKEND
      emojis: data.emojis || '🎯',
      decorativeText: data.decorativeText || prompt,
    }

  } catch (error) {
    console.log(error);
    return {
      ok: false,
      message: 'No se pudo generar el audio',
      audioUrl: '',
      emojis: '❌',
      decorativeText: 'Error',
    }
  }

}