/*
 * Login Scene
 * -----------
 * Minimal username/password (and optional email) form that allows users to
 * register or log in before entering the game. Implements a simple HTML overlay
 * so we don't have to build GUI components in Phaser for now.
 */

import Phaser from 'phaser';
import { login, register, AuthResponse } from '@/api/auth';
import { GAME_CONFIG } from '@/utils/constants';
import { getSocketManager } from '@/utils/socket';

export class LoginScene extends Phaser.Scene {
  private container: HTMLDivElement | null = null;

  private isRegisterMode = false;

  constructor() {
    super({ key: 'LOGIN_SCENE' });
  }

  create(): void {
    this.createForm();
  }

  shutdown(): void {
    this.destroyForm();
  }

  /* ------------------------------------------------------------------ */
  /* DOM helpers                                                        */
  /* ------------------------------------------------------------------ */

  private createForm(): void {
    // Ensure we don't duplicate
    this.destroyForm();

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      padding: 24px 32px;
      border-radius: 8px;
      color: #fff;
      font-family: Arial, sans-serif;
      z-index: 9999;
      width: 320px;
    `;

    wrapper.innerHTML = `
      <h2 style="margin-bottom:16px;text-align:center;">Brawl Bytes</h2>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <input id="bb-username" placeholder="Username" style="padding:8px;border:none;border-radius:4px;" />
        <input id="bb-email" placeholder="Email" style="padding:8px;border:none;border-radius:4px;display:none;" />
        <input id="bb-password" type="password" placeholder="Password" style="padding:8px;border:none;border-radius:4px;" />
        <button id="bb-submit" style="padding:10px;background:#27ae60;border:none;border-radius:4px;color:#fff;font-weight:bold;cursor:pointer;">LOGIN</button>
        <button id="bb-toggle" style="padding:6px;background:none;border:none;color:#3498db;cursor:pointer;font-size:14px;">No account? Register</button>
        <div id="bb-error" style="color:#e74c3c;font-size:14px;display:none;"></div>
      </div>
    `;

    document.body.appendChild(wrapper);
    this.container = wrapper;

    const usernameInput =
      wrapper.querySelector<HTMLInputElement>('#bb-username')!;
    const emailInput = wrapper.querySelector<HTMLInputElement>('#bb-email')!;
    const passwordInput =
      wrapper.querySelector<HTMLInputElement>('#bb-password')!;
    const submitBtn = wrapper.querySelector<HTMLButtonElement>('#bb-submit')!;
    const toggleBtn = wrapper.querySelector<HTMLButtonElement>('#bb-toggle')!;
    const errorDiv = wrapper.querySelector<HTMLDivElement>('#bb-error')!;

    function showError(msg: string) {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    }

    const setMode = (registerMode: boolean) => {
      this.isRegisterMode = registerMode;
      emailInput.style.display = registerMode ? 'block' : 'none';
      submitBtn.textContent = registerMode ? 'REGISTER' : 'LOGIN';
      toggleBtn.textContent = registerMode
        ? 'Have an account? Login'
        : 'No account? Register';
      errorDiv.style.display = 'none';
    };

    setMode(false);

    const handleSubmit = async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      const email = emailInput.value.trim();

      if (!username || !password || (this.isRegisterMode && !email)) {
        showError('Please fill out all required fields');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'PLEASE WAIT...';

      let resp: AuthResponse;
      if (this.isRegisterMode) {
        resp = await register(username, email, password);
      } else {
        resp = await login(username, password);
      }

      if (resp.success) {
        // Token already stored
        await this.authenticateSocket(resp.token);
        this.scene.start(GAME_CONFIG.SCENE_KEYS.MENU);
      } else {
        showError(resp.message);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = this.isRegisterMode ? 'REGISTER' : 'LOGIN';
    };

    submitBtn.addEventListener('click', handleSubmit);
    passwordInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSubmit();
    });

    toggleBtn.addEventListener('click', () => setMode(!this.isRegisterMode));
  }

  private destroyForm(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Socket authentication                                              */
  /* ------------------------------------------------------------------ */

  // eslint-disable-next-line class-methods-use-this
  private async authenticateSocket(token: string): Promise<void> {
    const socketManager = getSocketManager();
    if (!socketManager) return;

    // Ensure connection ready
    if (!socketManager.isConnected()) {
      await socketManager.connect();
    }

    if (!socketManager.isAuthenticated()) {
      await socketManager.authenticate(token);
    }
  }
}
