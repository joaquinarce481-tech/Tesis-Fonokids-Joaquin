const backendUrl = 'http://localhost:3000';

export const assistantPageUseCase = async (prompt: string) => {
  try {
    const resp = await fetch(`${backendUrl}/gpt/assistant-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!resp.ok) {
      throw new Error('No se pudo realizar la petición');
    }

    const data = await resp.json();

    return {
      ok: true,
      content: data.content,
      role: data.role,
    };
  } catch (error) {
    console.error('Error en assistantPageUseCase:', error);
    return {
      ok: false,
      content: 'No se pudo procesar la solicitud. Por favor, intenta nuevamente.',
    };
  }
};