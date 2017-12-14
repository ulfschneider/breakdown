'use babel';
import _ from 'underscore';

export default BreakdownUtils = (function() {

    return {
        isFalseOrUndefined(o) {
            if (_.isUndefined(o)) {
                return true;
            } else {
                return o == false;
            }
        },

        trim(s) {
            return s ? s.trim() : s;
        },

        trimTrailingSlash(s) {
            return s.trim()
                .replace(/\/+$/, '')
                .trim();
        },

        replaceAll(s, from, to) {
            return s.split(from)
                .join(to);
        },

        paddingRight(s, len, pad) {
            if (pad) {
                while (s.length <= len - pad.length) {
                    s += pad;
                }
            }
            return s;
        },

        spacePaddingRight(s, len) {
            return this.paddingRight(s, len, ' ');
        },

        progressBar(fraction, size) {
            size = size ? size : 10;
            let bar = '';

            let completion = Math.floor(size * fraction);
            bar = this.paddingRight(bar, completion, '■');
            bar = this.paddingRight(bar, size, '-');
            bar += Math.round(fraction * 100) + '%';

            return bar;
        },

        concatString(stringArray, concatenator) {
            let result = '';
            if (stringArray && stringArray.length) {
                let len = stringArray.length;
                stringArray.forEach((s, i) => {
                    result += s;
                    if (i < len - 1) {
                        result += concatenator;
                    }
                });
            }
            return result;
        },

        equalsIgnoreCase(a, b) {
            if (a && b) {
                return a.toLowerCase() == b.toLowerCase();
            }
            return false;
        },

        isSameIssueType(a, b) {
            return this.equalsIgnoreCase(a, b);
        },

        isDifferentUrl(a, b) {
            return !this.equalsIgnoreCase(a, b);
        },

        stringifyError(error) {
            if (error && error.stack) {
                return error.stack;
            } else if (error) {
                return error;
            } else {
                return '';
            }
        }
    }
})();