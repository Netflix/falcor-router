macro fnToString {
case { _(function $name() { $body... }) } => {
        var patterns = #{$body ...};
        var values = stringify(patterns);

        return withSyntax($val = [makeValue(values, #{$here})]) {
            return #{$val};
        }

        function stringify(patterns) {
            var Token = parser.Token;
            var lines = [];
            var currentString = '';
            patterns.
                forEach(function (p) {
                    var token = p.token;
                    var value = token.value;
                    var valueStr = value.toString();
                    if (token.type === Token.Delimiter) {
                        currentString += valueStr[0] + stringify(token.inner) + valueStr[1];
                    } else {
                        if (token.type === Token.Keyword) {
                            valueStr = ' ' + valueStr + ' ';
                        } else if (token.type === Token.StringLiteral) {
                            valueStr = '"' + valueStr + '"';
                        }
                        currentString += valueStr;
                    }
                });
            return currentString;
        }
    }
}

export fnToString
