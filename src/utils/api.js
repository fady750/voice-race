const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://learning-platform-1euu.onrender.com';
const BASE_URL = `${API_URL}/api/v1`;
const GAME_ID = 14;

let latestToken = null;

const refreshAccessToken = async () => {
  try {
    let refreshRes = await fetch(`${BASE_URL}/student/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: "{}"
    });

    if (!refreshRes.ok) {
      refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: "{}"
      });
    }

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const newToken = refreshData?.data?.accessToken || refreshData?.data?.token || refreshData?.accessToken || refreshData?.token;
      if (newToken) {
        console.log("Token refreshed successfully.");
        latestToken = newToken;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('token')) urlParams.set('token', newToken);
        if (urlParams.has('accesstoken')) urlParams.set('accesstoken', newToken);
        const newUrl = window.location.pathname + '?' + urlParams.toString();
        window.history.replaceState(null, '', newUrl);

        return newToken;
      }
    } else {
      console.error("Token refresh failed on both endpoints with status", refreshRes.status);
    }
  } catch (err) {
    console.error("Error during token refresh", err);
  }
  return null;
};

const apiFetch = async (url, options = {}, initialToken = null) => {
  if (!latestToken && initialToken) {
    latestToken = initialToken;
  }
  if (!latestToken && !initialToken) {
    await refreshAccessToken();
  }

  const currentToken = latestToken || initialToken;
  const fetchOptions = { ...options };
  if (currentToken) {
    fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${currentToken}` };
  }

  let res = await fetch(url, fetchOptions);

  if (res.status === 401) {
    console.warn("401 Unauthorized encountered. Attempting to refresh token...");
    const newToken = await refreshAccessToken();
    if (newToken) {
      fetchOptions.headers = { ...(fetchOptions.headers || {}), Authorization: `Bearer ${newToken}` };
      res = await fetch(url, fetchOptions);
    }
  }
  
  return res;
};

export class ApiService {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.token = params.get('token');
    this.lessonId = params.get('lessonId');
    this.sessionId = null;
    
    if (!this.token && !latestToken) {
      refreshAccessToken();
    }
  }

  get hasToken() {
    return true; // Token logic is now handled internally, so game can start even if token is not initially present in URL
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
    };
  }

  async fetchQuestions() {
    let url = `${BASE_URL}/student/games/${GAME_ID}/questions`;
    if (this.lessonId) {
      url += `?lessonId=${this.lessonId}`;
    }

    try {
      const response = await apiFetch(url, { headers: this.headers }, this.token);
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();
      return data.data?.questions || [];
    } catch (error) {
      console.error('[API] Error fetching questions:', error);
      return [];
    }
  }

  async startGameSession() {
    let url = `${BASE_URL}/student/games/${GAME_ID}/sessions`;
    if (this.lessonId) {
      url += `?lessonId=${this.lessonId}`;
    }

    try {
      const response = await apiFetch(url, {
        method: 'POST',
        headers: this.headers,
      }, this.token);
      if (!response.ok) throw new Error('Failed to start session');
      const data = await response.json();
      if (data.id) {
        this.sessionId = data.id;
      }
      return data;
    } catch (error) {
      console.error('[API] Error starting session:', error);
      return null;
    }
  }

  async submitAnswer(questionId, selectedAnswer, timeTaken) {
    if (!this.sessionId) return null;

    const url = `${BASE_URL}/student/games/sessions/${this.sessionId}/submit-answers`;
    try {
      const response = await apiFetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          answers: [
            {
              questionId,
              selectedAnswer,
              timeTaken
            }
          ]
        })
      }, this.token);
      if (!response.ok) throw new Error('Failed to submit answer');
      return await response.json();
    } catch (error) {
      console.error('[API] Error submitting answer:', error);
      return null;
    }
  }

  async completeGame() {
    if (!this.sessionId) return null;

    const url = `${BASE_URL}/student/games/sessions/${this.sessionId}/complete`;
    try {
      const response = await apiFetch(url, {
        method: 'POST',
        headers: this.headers,
      }, this.token);
      if (!response.ok) throw new Error('Failed to complete game');
      return await response.json();
    } catch (error) {
      console.error('[API] Error completing game:', error);
      return null;
    }
  }
}

export const api = new ApiService();
