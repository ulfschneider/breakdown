'use babel';

export default class BreakdownCredentialsView {


    constructor(config) {
        this.config = config;

        // Create root element
        this.element = document.createElement('form');
        this.element.classList.add('native-key-bindings');
        this.element.classList.add('breakdown-credentials');

        this.element.addEventListener('keydown', event => {
            if (event.which == 27) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.config.cancel();
            }
        });

        // Create message element
        const title = document.createElement('h1');
        title.textContent = 'JIRA Login';
        title.classList.add('title');
        this.element.appendChild(title);

        const userContainer = document.createElement('dl');
        this.element.appendChild(userContainer);
        const userLabel = document.createElement('dt');
        userLabel.textContent = 'Username:';
        userContainer.appendChild(userLabel);
        const userContent = document.createElement('dd');
        this.user = document.createElement('input');
        this.user.classList.add('native-key-bindings');
        this.user.setAttribute('type', 'text');
        this.user.setAttribute('tabindex', '1');
        this.user.addEventListener('keydown', event => {
            if (event.which == 9) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.pass.focus();
            }
        });
        userContent.appendChild(this.user);
        userContainer.appendChild(userContent);

        const passContainer = document.createElement('dl');
        this.element.appendChild(passContainer);
        const passLabel = document.createElement('dt');
        passLabel.textContent = 'Password:';
        passContainer.appendChild(passLabel);
        const passContent = document.createElement('dd');
        this.pass = document.createElement('input');
        this.pass.classList.add('native-key-bindings');
        this.pass.setAttribute('type', 'password');
        this.pass.setAttribute('tabindex', '2');
        this.pass.addEventListener('keydown', event => {
            if (event.which == 9) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.submit.focus();
            }
        });
        passContent.appendChild(this.pass);
        passContainer.appendChild(passContent);

        const buttonContainer = document.createElement('div');
        this.element.appendChild(buttonContainer);
        this.submit = document.createElement('button');
        this.submit.setAttribute('type', 'submit');
        this.submit.setAttribute('tabindex', '3');
        this.submit.innerHTML = 'OK';
        this.submit.onclick = () => {
            this.config.submit(this.getUser(), this.getPass());
        };
        this.submit.addEventListener('keydown', event => {
            if (event.which == 9) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.cancel.focus();
            }
        });
        buttonContainer.appendChild(this.submit);

        this.cancel = document.createElement('button');
        this.cancel.setAttribute('type', 'cancel');
        this.cancel.setAttribute('tabindex', '4');
        this.cancel.innerHTML = 'Cancel';
        this.cancel.onclick = this.config.cancel;
        this.cancel.addEventListener('keydown', event => {
            if (event.which == 9) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this.user.focus();
            }
        });
        buttonContainer.appendChild(this.cancel);
    }

    serialize() {
        return {
            user: this.getUser(),
            pass: this.getPass(),
        }
    }

    deserialize(state) {
        this.setUser(state.user);
        this.setPass(state.pass);
    }

    destroy() {
        this.element.remove();
    }

    getUser() {
        return this.user.value;
    }

    setUser(user) {
        this.user.value = user;
    }

    getPass() {
        return this.pass.value;
    }

    setPass(pass) {
        this.pass.value = pass;
    }

    setSubmit(submit) {
        this.config.submit = submit;
    }

    setCancel(cancel) {
        this.config.cancel = cancel;
    }

    getElement() {
        return this.element;
    }


}