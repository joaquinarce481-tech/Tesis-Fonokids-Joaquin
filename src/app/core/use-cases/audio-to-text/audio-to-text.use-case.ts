export const audioToTextUseCase = async (audioFile: File) => {
  console.log('🚀 USE CASE EJECUTADO - Enviando con FormData');
  
  try {
    const formData = new FormData();
    formData.append('file', audioFile);

    console.log('📤 Enviando archivo:', audioFile.name, audioFile.size, 'bytes');
    console.log('📦 FormData creado correctamente');

    const resp = await fetch(`http://localhost:3000/gpt/audio-to-text`, {
      method: 'POST',
      body: formData,
    });

    console.log('📡 Respuesta recibida - Status:', resp.status);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('❌ Error del servidor:', resp.status, errorText);
      throw new Error(`Error del servidor: ${resp.status}`);
    }

    const data = await resp.json();
    console.log('✅ Datos recibidos:', data);
    
    return data;

  } catch (error) {
    console.error('❌ Error en audioToTextUseCase:', error);
    throw error;
  }
};