'use babel';

export default class BreakdownCredentialsView {


    constructor(config) {
        this.config = config;

        // Create root element
        this.element = document.createElement('form');
        this.element.classList.add('breakdown-credentials');

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
        passContent.appendChild(this.pass);
        passContainer.appendChild(passContent);

        const submit = document.createElement('button');
        submit.setAttribute('type', 'submit');
        submit.setAttribute('tabindex', '3');
        submit.innerHTML = 'OK';
        submit.onclick = () => {
            this.config.submit(this.getUser(), this.getPass());
        };
        this.element.appendChild(submit);

        const cancel = document.createElement('button');
        cancel.setAttribute('type', 'cancel');
        cancel.setAttribute('tabindex', '4');
        cancel.innerHTML = 'Cancel';
        cancel.onclick = this.config.cancel;
        this.element.appendChild(cancel);
    }

    serialize() {
        return {
            user: this.getUser(),
            pass: this.getPass(),
        }
    }

    deserialize(state) {
        setUser(state.user);
        setPass(state.pass);
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