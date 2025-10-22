const backendUrl = 'http://localhost:3000';

export const prosConsStreamUseCase = async (prompt: string, abortSignal: AbortSignal) => {
  try {
    const resp = await fetch(`${backendUrl}/gpt/pros-cons-discusser-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal: abortSignal,
    });

    if (!resp.ok) {
      throw new Error('No se pudo realizar la consulta');
    }

    if (!resp.body) {
      throw new Error('No se recibió respuesta del servidor');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();

    return {
      async *[Symbol.asyncIterator]() {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          yield {
            choices: [{
              delta: {
                content: buffer
              }
            }]
          };
        }
      }
    };

  } catch (error) {
    console.error('Error en prosConsStreamUseCase:', error);
    throw error;
  }
};