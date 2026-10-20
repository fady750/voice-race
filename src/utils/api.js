const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://learning-platform-1euu.onrender.com';
const BASE_URL = `${API_URL}/api/v1`;
const GAME_ID = 14;

let latestToken = null;
let currentAuthType = null; // 'student' | 'user'
let userProfile = null;
let userProfilePromise = null;
const profileSubscribers = [];

export const onUserProfileChange = (callback) => {
  if (typeof callback !== 'function') return () => {};
  profileSubscribers.push(callback);
  if (userProfile) {
    callback(userProfile);
  }
  return () => {
    const idx = profileSubscribers.indexOf(callback);
    if (idx !== -1) profileSubscribers.splice(idx, 1);
  };
};

export const getUserProfile = () => userProfile;

const notifyProfileSubscribers = (profile) => {
  userProfile = profile;
  profileSubscribers.forEach((cb) => {
    try {
      cb(profile);
    } catch (e) {
      console.error('[Auth] Error in profile subscriber callback:', e);
    }
  });
};

export const fetchUserProfile = async (token = null, forcedAuthType = null) => {
  const effectiveToken = token || latestToken;
  if (!effectiveToken) return null;

  if (userProfilePromise) {
    return userProfilePromise;
  }

  userProfilePromise = (async () => {
    try {
      const authTypeToUse = forcedAuthType || currentAuthType;

      // 1. If student refresh was used -> call GET /auth/me/child
      if (authTypeToUse === 'student') {
        try {
          const res = await fetch(`${BASE_URL}/auth/me/child`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${effectiveToken}`,
              'Accept': 'application/json'
            },
            credentials: 'include'
          });

          if (res.ok) {
            const json = await res.json();
            const child = json?.data?.child;
            if (child) {
              const avatarUrl = child?.currentAvatar?.avatarUrl || child?.profileImage || null;
              const accessoryUrl = child?.currentAccessory?.accessoryUrl || null;
              const name = child?.firstName || child?.username || null;

              const profile = {
                avatarUrl,
                accessoryUrl,
                profileImage: child?.profileImage || null,
                name,
                role: child?.role || 'STUDENT',
                authType: 'student'
              };
              notifyProfileSubscribers(profile);
              return profile;
            }
          }
        } catch (err) {
          console.error('[Auth] Error fetching child profile from /auth/me/child:', err);
        }
      }

      // 2. If user/supervisor refresh was used -> call GET /auth/me
      if (authTypeToUse === 'user') {
        try {
          const res = await fetch(`${BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${effectiveToken}`,
              'Accept': 'application/json'
            },
            credentials: 'include'
          });

          if (res.ok) {
            const json = await res.json();
            const user = json?.data?.user;
            if (user) {
              const avatarUrl = user?.profileImage || null;
              const name = user?.firstName || null;

              const profile = {
                avatarUrl,
                accessoryUrl: null,
                profileImage: user?.profileImage || null,
                name,
                role: user?.role || 'USER',
                authType: 'user'
              };
              notifyProfileSubscribers(profile);
              return profile;
            }
          }
        } catch (err) {
          console.error('[Auth] Error fetching user profile from /auth/me:', err);
        }
      }

      // 3. Fallback when authType is not yet determined (e.g. token came from URL):
      // Try /auth/me/child first
      try {
        const studentRes = await fetch(`${BASE_URL}/auth/me/child`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${effectiveToken}`,
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (studentRes.ok) {
          const json = await studentRes.json();
          const child = json?.data?.child;
          if (child) {
            currentAuthType = 'student';
            const avatarUrl = child?.currentAvatar?.avatarUrl || child?.profileImage || null;
            const accessoryUrl = child?.currentAccessory?.accessoryUrl || null;
            const name = child?.firstName || child?.username || null;

            const profile = {
              avatarUrl,
              accessoryUrl,
              profileImage: child?.profileImage || null,
              name,
              role: child?.role || 'STUDENT',
              authType: 'student'
            };
            notifyProfileSubscribers(profile);
            return profile;
          }
        }
      } catch (err) {
        // Fallback to /auth/me below
      }

      // Try /auth/me
      try {
        const userRes = await fetch(`${BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${effectiveToken}`,
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (userRes.ok) {
          const json = await userRes.json();
          const user = json?.data?.user;
          if (user) {
            currentAuthType = 'user';
            const avatarUrl = user?.profileImage || null;
            const name = user?.firstName || null;

            const profile = {
              avatarUrl,
              accessoryUrl: null,
              profileImage: user?.profileImage || null,
              name,
              role: user?.role || 'USER',
              authType: 'user'
            };
            notifyProfileSubscribers(profile);
            return profile;
          }
        }
      } catch (err) {
        console.error('[Auth] Error fetching fallback user profile:', err);
      }

      return null;
    } finally {
      userProfilePromise = null;
    }
  })();

  return userProfilePromise;
};

const refreshAccessToken = async () => {
  try {
    let authType = 'student';
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
      authType = 'user';
    }

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const newToken = refreshData?.data?.accessToken || refreshData?.data?.token || refreshData?.accessToken || refreshData?.token;
      if (newToken) {
        console.log(`[Auth] Token refreshed successfully via ${authType} endpoint.`);
        latestToken = newToken;
        currentAuthType = authType;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('token')) urlParams.set('token', newToken);
        if (urlParams.has('accesstoken')) urlParams.set('accesstoken', newToken);
        const newUrl = window.location.pathname + '?' + urlParams.toString();
        window.history.replaceState(null, '', newUrl);

        // Fetch user profile immediately after refreshing
        await fetchUserProfile(newToken, authType);

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
    this.token = params.get('token') || params.get('accesstoken');
    this.lessonId = params.get('lessonId') || params.get('lessonid') || params.get('lesson_id');
    this.gameId = params.get('gameId') || params.get('gameid') || params.get('game_id') || GAME_ID;
    this.sessionId = params.get('sessionId') || params.get('session_id') || null;
    this.isDemo = params.get('demo') === 'true';
    this.sessionPromise = null;
    
    if (this.token) {
      latestToken = this.token;
      fetchUserProfile(this.token);
    }
  }

  async ensureToken() {
    if (this.token) return this.token;
    if (latestToken) return latestToken;
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      this.token = refreshed;
      return refreshed;
    }
    return null;
  }

  get hasToken() {
    return Boolean(this.token || latestToken);
  }

  get headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async fetchQuestions() {
    let url = `${BASE_URL}/student/games/${this.gameId}/questions`;
    if (this.lessonId) {
      url += `?lessonId=${this.lessonId}`;
    }

    try {
      console.log('[API] Fetching questions from:', url);
      const response = await apiFetch(url, { headers: this.headers }, this.token);
      if (!response.ok) throw new Error(`Failed to fetch questions: HTTP ${response.status}`);
      const data = await response.json();
      let questions = [];
      if (data && data.data && Array.isArray(data.data.questions)) {
        questions = data.data.questions;
      } else if (data && data.data && Array.isArray(data.data.answers)) {
        questions = data.data.answers;
      } else if (data && data.data && Array.isArray(data.data)) {
        questions = data.data;
      } else if (Array.isArray(data)) {
        questions = data;
      }
      console.log(`[API] Fetched ${questions.length} questions successfully.`);
      return questions;
    } catch (error) {
      console.error('[API] Error fetching questions:', error);
      return [];
    }
  }

  resetSession() {
    this.sessionId = null;
    this.sessionPromise = null;
  }

  async startGameSession(forceNew = false) {
    if (!this.hasToken) {
      console.log('[API] No token provided, skipping session creation');
      return null;
    }

    if (this.sessionId && !forceNew) {
      return { success: true, data: { id: this.sessionId } };
    }

    this.sessionId = null;
    this.sessionPromise = null;

    let url = `${BASE_URL}/student/games/${this.gameId}/sessions`;
    if (this.lessonId) {
      url += `?lessonId=${this.lessonId}`;
    }

    this.sessionPromise = (async () => {
      try {
        console.log('[API] Starting game session at:', url);
        const response = await apiFetch(url, {
          method: 'POST',
          headers: this.headers,
        }, this.token);
        if (!response.ok) {
          const errBody = await response.text();
          console.error('[API] Failed to start session:', response.status, errBody);
          throw new Error('Failed to start session');
        }
        const data = await response.json();
        const sId = data?.data?.id || data?.data?.sessionId || data?.id || data?.sessionId;
        if (sId) {
          this.sessionId = sId;
          console.log('[API] Game session started successfully. SessionId:', sId);
        }
        return data;
      } catch (error) {
        console.error('[API] Error starting session:', error);
        return null;
      }
    })();

    return this.sessionPromise;
  }

  async submitAnswers(answers) {
    if (!this.sessionId && this.sessionPromise) {
      await this.sessionPromise;
    }

    if (!this.sessionId) {
      console.warn('[API] No active sessionId before submitting answers. Attempting to start session now...');
      await this.startGameSession();
    }

    if (!this.sessionId) {
      console.warn('[API] Cannot submit answers: no active sessionId');
      return null;
    }

    let payload = Array.isArray(answers) ? [...answers] : [answers];
    if (payload.length === 0) {
      payload = [{
        questionId: 1,
        selectedAnswer: 'none',
        timeTaken: 1
      }];
    }
    const url = `${BASE_URL}/student/games/sessions/${this.sessionId}/submit-answers`;
    console.log('[API] Submitting answers to:', url, 'Payload:', payload);
    try {
      const response = await apiFetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          answers: payload
        })
      }, this.token);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[API] Failed to submit answers:', response.status, errText);
        throw new Error(`Failed to submit answers: ${response.status}`);
      }
      const data = await response.json();
      console.log('[API] submit-answers succeeded:', data);
      return data;
    } catch (error) {
      console.error('[API] Error submitting answers:', error);
      return null;
    }
  }

  async submitAnswer(questionId, selectedAnswer, timeTaken) {
    return this.submitAnswers([{ questionId, selectedAnswer, timeTaken }]);
  }

  async completeGame() {
    if (!this.sessionId && this.sessionPromise) {
      await this.sessionPromise;
    }

    if (!this.sessionId) {
      console.warn('[API] No active sessionId before completing game. Attempting to start session now...');
      await this.startGameSession();
    }

    if (!this.sessionId) {
      console.warn('[API] Cannot complete game: no active sessionId');
      return null;
    }

    const currentSessionId = this.sessionId;
    const url = `${BASE_URL}/student/games/sessions/${currentSessionId}/complete`;
    console.log('[API] Completing game session at:', url);
    try {
      const response = await apiFetch(url, {
        method: 'POST',
        headers: this.headers,
      }, this.token);
      if (!response.ok) {
        const errText = await response.text();
        console.error('[API] Failed to complete game session:', response.status, errText);
        throw new Error(`Failed to complete game: ${response.status}`);
      }
      const data = await response.json();
      console.log('[API] completeGame succeeded:', data);
      this.sessionId = null;
      this.sessionPromise = null;
      return data;
    } catch (error) {
      console.error('[API] Error completing game:', error);
      this.sessionId = null;
      this.sessionPromise = null;
      return null;
    }
  }
}

export const api = new ApiService();
