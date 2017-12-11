'use babel';

export default BreakdownUtils = (function() {

    return {
        trimTrailingSlash(s) {
            return s.trim()
                .replace(/\/+$/, '')
                .trim();
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