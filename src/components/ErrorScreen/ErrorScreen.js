import error404Img from '../../assets/404.png';
import { handleExitSite } from '../../utils/navigation.js';
import './ErrorScreen.css';

export class ErrorScreen {
  constructor(root, options = {}) {
    this.root = root;
    this.titleLine1 = options.titleLine1 || 'يبدو';
    this.titleLine2 = options.titleLine2 || 'أن حكيم';
    this.titleLine3 = options.titleLine3 !== undefined ? options.titleLine3 : 'تائه';
    this.description = options.description || 'لا يمكننا العثور على هذه الصفحة. دعنا نذهب إلى مكان مألوف.';
    this.buttonText = options.buttonText || 'العودة للرئيسية';
    this.onExit = options.onExit || handleExitSite;
    this.hideButton = options.hideButton || false;

    this.el = document.createElement('main');
    this.el.className = 'error-screen';
    this.el.dir = 'rtl';
    this.el.innerHTML = `
      <section class="error-screen__content">
        <h1 class="error-screen__title">
          ${this.titleLine1}
          <br />
          ${this.titleLine2}
          ${this.titleLine3 ? `<br />${this.titleLine3}` : ''}
        </h1>



        ${!this.hideButton ? `
          <button type="button" class="error-screen__btn" aria-label="${this.buttonText}">
            ${this.buttonText}
          </button>
        ` : ''}
      </section>

      <section class="error-screen__visual">
        <img
          src="${error404Img}"
          alt="404 - حكيم تائه"
          class="error-screen__illustration"
          loading="lazy"
        />
      </section>
    `;

    const btn = this.el.querySelector('.error-screen__btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (this.onExit) this.onExit();
      });
    }

    if (root) {
      root.replaceChildren(this.el);
    }
  }
}

export default ErrorScreen;
