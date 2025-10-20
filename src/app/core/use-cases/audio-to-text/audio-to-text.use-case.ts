import { environment } from '../../../../environments/environment';
const backendUrl = environment.backendApi.replace('/gpt', '');

interface AudioToTextResponse {
  transcription: string;
  evaluation: string;
  success: boolean;
}

export const audioToTextUseCase = async (audioFile: File): Promise<AudioToTextResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', audioFile);

    const resp = await fetch(`${backendUrl}/gpt/audio-to-text`, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      throw new Error('No se pudo procesar el audio');
    }

    const data = await resp.json();

    return {
      transcription: data.transcription,
      evaluation: data.evaluation,
      success: data.success,
    };
  } catch (error) {
    console.error('Error en audioToTextUseCase:', error);
    return {
      transcription: '',
      evaluation: 'Error al procesar el audio. Por favor, intenta de nuevo.',
      success: false,
    };
  }
};