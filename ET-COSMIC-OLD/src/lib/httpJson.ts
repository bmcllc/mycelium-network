/** Parse JSON de respostas fetch com mensagem útil se vier HTML (proxy/404). */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const hint = text.startsWith("<!") ? " (resposta HTML — URL ou proxy incorreto?)" : "";
    throw new Error(`${res.status} ${res.statusText}${hint}`);
  }
}
