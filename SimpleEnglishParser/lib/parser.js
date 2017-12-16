function objectType(object) {
    return Object.prototype.toString.call(object).match(/\[object (\w+)\]/)[1];
}

module.exports = {
    parse: (text, rules) => {
        var tokens = module.exports.tokenize(text);
        var rulesLeft = Object.keys(rules);
        var results = {};

        function addResult(rule, canRepeat, value) {
            if (canRepeat) {
                if (objectType(results[rule]) === 'Undefined') results[rule] = [];
                results[rule].push(value);
            } else {
                results[rule] = value;
                rulesLeft.splice(rulesLeft.indexOf(ruleName), 1);
            }
        }

        for (var token of tokens) {
            for (var ruleName of rulesLeft) {
                var canRepeat = false;

                var rule = rules[ruleName];

                if (objectType(rule) === 'Object') {
                    if (rule.type) {
                        canRepeat = rule.canRepeat || false;
                        rule = rule.type;
                    }
                }

                if (objectType(rule) === 'RegExp' && rule.test(token)) {
                    addResult(ruleName, canRepeat, token);
                    break;
                }
                if (objectType(rule) === 'Array') {
                    var succeded = false;
                    for (var allowedValue of rule) {
                        if (token == allowedValue) {
                            succeded = true;
                            addResult(ruleName, canRepeat, token);
                            break;
                        }
                    }
                    if (succeded) break;
                }
                if (objectType(rule) === 'Function' && objectType(rule(token)) === rule.name && !Number.isNaN(rule(token))) {
                    addResult(ruleName, canRepeat, rule(token));
                    break;
                }
                if (objectType(rule) === 'Function') {
                    if (Boolean(rule(token))) {
                        addResult(ruleName, canRepeat, token);
                        break;
                    }
                }
            }
        }

        return results;
    }, tokenize: (text) => {
        var seperators = [' ', ','];

        var lastTokens = [];
        var tokens = [];

        for (var c of (text + ' ')) {
            lastTokens.push(c);

            if (seperators.includes(c)) {
                lastTokens.pop();
                var lastToken = lastTokens.join('');
                tokens.push(lastToken);
                lastTokens = [];
            }
        }

        return tokens.filter(string => string.length > 0);
    }
}
