const BASE_URL = 'https://learning-platform-1euu.onrender.com/api/v1';
const GAME_ID = 14;

export class ApiService {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.token = params.get('token');
    this.lessonId = params.get('lessonId');
    this.sessionId = null;
  }

  get hasToken() {
    return !!this.token;
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  async fetchQuestions() {
    let url = `${BASE_URL}/student/games/${GAME_ID}/questions`;
    if (this.lessonId) {
      url += `?lessonId=${this.lessonId}`;
    }

    try {
      const response = await fetch(url, { headers: this.headers });
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
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
      });
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
      const response = await fetch(url, {
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
      });
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
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
      });
      if (!response.ok) throw new Error('Failed to complete game');
      return await response.json();
    } catch (error) {
      console.error('[API] Error completing game:', error);
      return null;
    }
  }
}

export const api = new ApiService();
