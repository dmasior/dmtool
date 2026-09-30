// Keep asynchronous fetches separate from synchronous session/state updates.
export function createModelRefresh({ fetchModels, getSession, onSuccess }) {
  let requestId = 0;

  return {
    invalidate() {
      requestId += 1;
    },
    async refresh() {
      const id = ++requestId;
      const { token, generation } = getSession();
      if (!token) return;

      const isCurrent = () => {
        const session = getSession();
        return id === requestId && token === session.token && generation === session.generation;
      };

      let models;
      try {
        models = await fetchModels(token);
      } catch (error) {
        if (isCurrent()) throw error;
        return;
      }

      // Only the latest request in the same session can change or persist state.
      if (isCurrent()) return onSuccess(models, token);
    },
  };
}
