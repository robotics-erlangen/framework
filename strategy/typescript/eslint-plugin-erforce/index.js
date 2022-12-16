module.exports = {
  rules: {
    "no-unnecessary-function-wrapper": {
      create: function (context) {
        return {
          ArrowFunctionExpression(node) {
            if (node.params.length == 1
                && node.params[0].type === "Identifier"
                && node.body.type === "CallExpression"
                && node.body.arguments.length == 1
                && node.body.arguments[0].type === "Identifier"
                && node.params[0].name === node.body.arguments[0].name
                && node.body.callee.type === "Identifier") {
              context.report({
                node,
                message: "Unnecessary wrapper around function! Instead of '(x) => f(x)' use just 'f'",
              });
            }
          }
        }
      }
    },
    "check-typecast-spacing": {
      create: function (context) {
        const sourceCode = context.getSourceCode();
        return {
        TSTypeAssertion(node) {
            // + 2 for <> chars, because they are not part of the typeAnnotation token
            const typeAnnotationLength = sourceCode.getText(node.typeAnnotation).length + 2;
            const expressionLength = sourceCode.getText(node.expression).length;
            const typeAssertionText = sourceCode.getText(node);
            const spaceBetweenAnnoationAndExpression = typeAssertionText.substring(typeAnnotationLength, typeAssertionText.length - expressionLength);
            if (!spaceBetweenAnnoationAndExpression.startsWith(' ')) {
              context.report({
                node,
                message: "Missing space after type assertion",
              });
            } else if (/^\s/.test(spaceBetweenAnnoationAndExpression.substring(1))) {
              context.report({
                node,
                message: "TypeAssertion is followed by more than one space",
              });
            }
          }
        }
      }
    }
  }
};
